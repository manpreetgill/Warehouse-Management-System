var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var inwardRulesModel = require('../../../models/mongodb/itemMaster-inwardRules/collection-inwardRules.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Inward rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/inwardRules/:warehouseId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                inwardRulesModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, inwardRulesRow) {  // Find all the active rows in the inwardRules collection 

                    var inwardRulesArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardRulesRow.length == 0) {// No records found

                        flowController.emit('ERROR', {message: "No Inward-rules found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(inwardRulesRow, function (element, callback) {

                            var inwardRule = {};
                            inwardRule.id = element._id;
                            inwardRule.name = element.name;

                            inwardRulesArray.push(inwardRule);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: inwardRulesArray, status: 'success', statusCode: '200'});
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
// Inward rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/inwardRules/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var inwardRulesArray = ['VISUAL', 'QUANTITY', 'QUALITY']; // Rules to be configured in database

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.eachSeries(inwardRulesArray, function (element, callback) {

                    inwardRulesModel.findOne({'name': element}, function (err, inwardRulesRow) {

                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (inwardRulesRow != null) {
                            // Data already present in database || 304 - not modified
                            setImmediate(callback);
                        } else {

                            var inwardRules = new inwardRulesModel();

                            inwardRules.warehouseId = warehouseId;
                            inwardRules.name = element;
                            inwardRules.timeCreated = timeInInteger;

                            inwardRules.save(function (err) {

                                if (err) {
                                    callback(err);
                                } else {
                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: "Inward rules configured!", status: 'success', statusCode: '201'});
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