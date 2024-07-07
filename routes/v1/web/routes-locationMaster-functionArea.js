var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/function-area/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                functionAreaModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, functionAreasRow) {  // Find all the active rows in the inwardRules collection 

                    var functionAreasArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (functionAreasRow.length == 0) {// No records found

                        flowController.emit('ERROR', {message: "No Function-Areas found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(functionAreasRow, function (element, callback) {

                            var functionArea = {id: element._id, name: element.name};
                            functionAreasArray.push(functionArea);
                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {data: functionAreasArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
                        });
                    }
                });
            });
            
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/function-area/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var functionAreasArray = ['INWARD', 'DISPATCH', 'PACK', 'STORAGE', 'UNIT-CONSOLIDATION', 'LOAD-DOCK', 'RMA', 'SCRAP', 'REPROCESS']; // GBL Specific
            //var functionAreasArray = ['INWARD', 'DISPATCH', 'PACK', 'STORAGE', 'UNIT-CONSOLIDATION', 'LOAD-DOCK', 'UNLOAD-DOCK','RMA', 'SCRAP','REPROCESS']; // Product level
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.eachSeries(functionAreasArray, function (element, callback) {

                    functionAreaModel.findOne({'name': element}, function (err, functionAreasRow) {

                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (functionAreasRow != null) {
                            // Data already present in database || 304 - not modified
                            setImmediate(callback);
                        } else {

                            var functionArea = new functionAreaModel();
                            functionArea.warehouseId = warehouseId;
                            functionArea.name = element;
                            functionArea.timeCreated = timeInInteger;

                            functionArea.save(function (err) {
                                if (err)
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                else
                                    setImmediate(callback);

                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Function Areas configured!", status: 'success', statusCode: '201'});
                });
            });

            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
module.exports = router;