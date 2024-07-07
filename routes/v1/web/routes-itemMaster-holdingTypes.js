var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var holdingTypesModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Device Tracking
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/holdingTypes/:warehouseId/')

        .get(function (req, res) {
            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var holdingTypesArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                holdingTypesModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, holdingTypesRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (holdingTypesRow.length == 0) {// Nothing available in database

                        flowController.emit('ERROR', {message: "No holding types available!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(holdingTypesRow, function (element, callback) {

                            var holdingTypes = {};
                            holdingTypes.id = element._id;
                            holdingTypes.name = element.name;

                            holdingTypesArray.push(holdingTypes);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: holdingTypesArray, status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-HoldingTypes',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {

                        console.log('Entered error ');
                    } else {

                        console.log('Entered success ');
                    }
                });
                res.json(error);
            });
            //instlize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Device Tracking
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/holdingTypes/')

        .post(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim(); // Parameter from body

            var holdingTypesArray = ['PALLET', 'BAG', 'BOX', 'BARREL', 'BIN', 'NONE', 'ANY']; // Holding Types to be configured in database

            var holdingTypesSuccessArray = [];
            var flowController = new EventEmitter();
            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                async.eachSeries(holdingTypesArray, function (element, callback) {

                    holdingTypesModel.findOne({'name': element}, function (err, holdingTypesRow) {

                        if (err) {// Serverside error

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypesRow != null) {// Data already present in database || 304 - not modified

                            callback({message: "Already Configured! Database is up to date.", status: 'error', statusCode: '304'});
                        } else {

                            var holdingTypes = new holdingTypesModel();
                            holdingTypes.warehouseId = warehouseId;
                            holdingTypes.name = element;
                            holdingTypes.timeCreated = timeInInteger;
                            holdingTypes.save(function (err) {

                                if (err) {// error while adding records

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    holdingTypesSuccessArray.push(element);
                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "Holding types configured!", status: 'success', statusCode: '201'});
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-HoldingTypes',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {

                        console.log('Entered error ');
                    } else {

                        console.log('Entered success ');
                    }
                });
                res.json(error);
            });
            //instlize
            flowController.emit('START');
        });
//
//
module.exports = router;