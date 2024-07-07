var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var measurementUnitsModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/measurementUnits/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                measurementUnitsModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, measurementUnitsRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (measurementUnitsRow.length == 0) {// Nothing available in database

                        flowController.emit('ERROR', {message: "No Measurement units available!", status: 'error', statusCode: '404'});
                    } else {// Found results

                        var measurementUnitsArray = [];
                        async.eachSeries(measurementUnitsRow, function (element, callback) {

                            var measurementUnits = {};
                            measurementUnits.id = element._id;
                            measurementUnits.name = element.name;

                            measurementUnitsArray.push(measurementUnits);
                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: "Operation Successful.", data: measurementUnitsArray, status: 'success', statusCode: '200'});
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
router.route('/v1/itemMaster/web/item/configuration/create/measurementUnits/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var mesaurementUnitsArray = ['Kg', 'Litre', 'Unit'];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var mesaurementUnitsSuccessArray = [];

                async.eachSeries(mesaurementUnitsArray, function (element, callback) {

                    measurementUnitsModel.findOne({'name': element}, function (err, measurementUnitsRow) {
                        if (err) {// Serverside error

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (measurementUnitsRow != null) {// Data already present in database || 304 - not modified

                            flowController.emit('ERROR', {message: "This unit is already present! Same units not allowed.", status: 'error', statusCode: '304'});
                        } else {

                            var measurementUnits = new measurementUnitsModel();// Storing instance of measurementUnits collection

                            measurementUnits.warehouseId = warehouseId;// Setting data to model
                            measurementUnits.name = element;// Setting data to model
                            measurementUnits.timeCreated = timeInInteger;

                            measurementUnits.save(function (err) {// Creating new record
                                if (err) {// error while adding records   

                                    callback({message: "Unable to configure! Try again after some time.", status: 'error', statusCode: '500'});
                                } else {// Operation successful

                                    mesaurementUnitsSuccessArray.push(element);
                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "New Measurement units Added!", status: 'success', statusCode: '201'});
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
module.exports = router;