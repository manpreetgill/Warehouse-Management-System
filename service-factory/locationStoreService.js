var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var requestify = require('requestify');
var intersection = require('array-intersection');

var transactionalLogService = require('../service-factory/transactionalLogService');

var locationStoreService = {};
//
//
locationStoreService.addFunctionNameHere = function (dataObject, servicecallback) {

    var consoleVar = 1;

    var pickListId = dataObject.pickListId.trim();

    var warehouseId = dataObject.warehouseId.trim();

    var flowController = new EventEmitter();
    // Get the picklist data
    flowController.on('START', function () {

        (consoleVar) ? console.log('START') : '';

    });
    // Get the picklist data by activated sequence
    flowController.on('1', function () {

        (consoleVar) ? console.log('1') : '';

    });
    // Get picksublist data by picklist ID
    flowController.on('2', function (lastSequence) {

        (consoleVar) ? console.log('2') : '';

    });
    // End
    flowController.on('END', function (result) {

        (consoleVar) ? console.log('END') : '';

        servicecallback(null, result);
    });
    // Error
    flowController.on('ERROR', function (error) {

        (consoleVar) ? console.log('ERROR') : '';

        servicecallback(error);
    });
    // Initialize
    flowController.emit('START');
};
//
//
module.exports = locationStoreService;