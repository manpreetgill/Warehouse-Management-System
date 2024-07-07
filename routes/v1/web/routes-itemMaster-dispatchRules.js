var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var dispatchRulesModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/dispatchRules/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                dispatchRulesModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, dispatchRulesRow) {  // Find all the active rows in the inwardRules collection 

                    var dispatchRulesArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (dispatchRulesRow.length == 0) {// No records found

                        flowController.emit('ERROR', {message: "No Dispatch-rules found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(dispatchRulesRow, function (element, callback) {

                            var inwardRule = {id: element._id, name: element.name};

                            dispatchRulesArray.push(inwardRule);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: dispatchRulesArray, status: 'success', statusCode: '200'});
                            }
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
// Add dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/dispatchRules/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var dispatchRulesArray = ['FIFO', 'FMFO', 'FEFO', 'LIFO', 'NONE'];// Rules to be configured in database

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.eachSeries(dispatchRulesArray, function (element, callback) {

                    dispatchRulesModel.findOne({'name': element}, function (err, dispatchRulesRow) {
                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (dispatchRulesRow != null) {

                            // Data already present in database || 304 - not modified
                            callback({message: "Already Configured! Database is up to date.", status: 'error', statusCode: '304'});
                        } else {

                            var dispatchRules = new dispatchRulesModel();

                            dispatchRules.warehouseId = warehouseId;
                            dispatchRules.name = element;
                            dispatchRules.timeCreated = timeInInteger;

                            dispatchRules.save(function (err) {

                                if (err) {
                                    // error while adding records
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END',{message: "Dispatch rules configured!", status: 'success', statusCode: '201'});
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