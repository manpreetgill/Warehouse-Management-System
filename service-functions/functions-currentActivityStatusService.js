var express = require('express');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//-----------------------------------------------------------------------------------------------------------------------
var inwardSubListModel = require('../models/mongodb/processMaster-inwardSubList/collection-inwardSubList');
var pickSubListModel = require('../models/mongodb/processMaster-pickSubList/collection-pickSubList');
var putSubListModel = require('../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemStoreModel = require('../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
//-----------------------------------------------------------------------------------------------------------------------
var function_currentActiveStatusService = {};
// Get picklist details
function_currentActiveStatusService.setCurrentActivityStatus = function (key, mongoId, status, callback) {

    var consoleLog = 1;

    (consoleLog) ? console.log(key + ' | ' + mongoId + ' | ' + status) : '';

    var flowController = new EventEmitter();

    if (key === 'INWARD')
        var Model = inwardSubListModel;
    else if (key === 'PICK')
        var Model = pickSubListModel;
    else
        var Model = putSubListModel;

    // SERVICE-START
    flowController.on('START', function () {

        (consoleLog) ? console.log('SERVICE-START') : '';

        Model.findOne({'_id': mongoId, 'activeStatus': 1}, function (err, modelRow) {

            if (err) {

                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
            } else if (modelRow == null) {

                flowController.emit('ERROR', {message: 'Details of MongoId ' + mongoId + ' not found as per of ' + key + ' process.', status: 'error', statusCode: '304'});
            } else {

                flowController.emit('1', modelRow);
            }
        });
    });

    // SERVICE-1
    flowController.on('1', function (modelRow) {

        (consoleLog) ? console.log('SERVICE-1') : '';

        async.eachSeries(modelRow.itemStoreId, function (element, callback) {

            itemStoreModel.findOne({'_id': element}, function (err, itemStoreRow) {

                if (err) {

                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (itemStoreRow == null) {

                    flowController.emit('ERROR', {message: 'Inventory details not available in system.', status: 'error', statusCode: '304'});
                } else {

                    var query = {'_id': element};
                    var update = {'currentActivityStatus': status};

                    itemStoreModel.update(query, update, function (err) {
                        if (err)
                            callback(err);
                        else
                            setImmediate(callback);
                    });
                }
            });
        }, function (err) {
            if (err)
                flowController.emit('ERROR', err);
            else
                flowController.emit('END', {message: 'Activity status updated successfully', status: 'success', statusCode: '200'});
        });
    });

    // END
    flowController.on('END', function (response) {

        (consoleLog) ? console.log('SERVICE-END') : '';
        (consoleLog) ? console.log(response) : '';
        callback(null, 'DONE');
    });

    // ERROR
    flowController.on('ERROR', function (error) {

        (consoleLog) ? console.log('SERVICE-ERROR') : '';
        (consoleLog) ? console.log(error) : '';
        callback(error);
    });

    // START
    flowController.emit('START');
};

module.exports = function_currentActiveStatusService;

