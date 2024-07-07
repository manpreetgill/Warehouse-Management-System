var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var flagsModel = require('../../../models/mongodb/itemMaster-flags/collection-flags.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/flags/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();

            var flagsArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                flagsModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, flagsRow) {

                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (flagsRow == null) {

                        flowController.emit('ERROR', {message: "No flags found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(flagsRow, function (element, callback) {

                            var flags = {};
                            flags.id = element._id;
                            flags.name = element.name;

                            flagsArray.push(flags);
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR!!!!! ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: flagsArray, status: 'success', statusCode: '200'});
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
// Get dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/flags/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var flag = req.body.flag.trim();// Parameter from body

            var flags = new flagsModel();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                flagsModel.findOne({'name': flag, activeStatus: 1}, function (err, flagsRow) {// Make it uppercase

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (flagsRow != null) {

                        flowController.emit('ERROR', {message: "Already Present! Same flag not allowed.", status: 'error', statusCode: '304'});
                    } else {

                        flags.warehouseId = warehouseId;
                        flags.name = flag;
                        flags.timeCreated = timeInInteger;

                        flags.save(function (err) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "New flag added.", status: 'success', statusCode: '201'});
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
// Get dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/update/flags/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var flagId = req.body.flagId.trim();

            var flagName = req.body.flagName.trim();// Parameter from body

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                flagsModel.findOne({'name': flagName, activeStatus: 1}, function (err, flagsRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (flagsRow != null) {

                        flowController.emit('ERROR', {message: "Can't update! Flag already present with new name.", status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': flagId, 'warehouseId': warehouseId};
                        var update = {'$set': {'name': flagName}};

                        flagsModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Flag name Updated.", status: 'success', statusCode: '200'});
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
// Get dispatch rules
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/delete/flags/')

        .patch(function (req, res) {

            console.log(req.body);

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var flagId = req.body.flagId.trim();

            var modifiedBy = req.body.modifiedBy.trim();// Parameter from body

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                flagsModel.findOne({'_id': flagId, activeStatus: 1}, function (err, flagsRow) {

                    if (err) {

                        flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (flagsRow == null) {

                        flowController.emit('ERROR',{message: "No flags found!", status: 'error', statusCode: '404'});
                    } else {

                        itemStoreModel.find({'flagId': flagId, activeStatus: 1}, function (err, itemStoreRow) {
                            if (err) {

                                flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow.length == 0) {

                                var query = {'_id': flagId, 'warehouseId': warehouseId};
                                var update = {'$set': {'activeStatus': 2, modifiedBy: modifiedBy, timeModified: timeInInteger}};

                                flagsModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END',{message: "Flag Delete In System !", status: 'success', statusCode: '200'});
                                    }
                                });
                            } else {

                                flowController.emit('ERROR',{message: "Flag Can not Delete  In System !", status: 'error', statusCode: '304'});
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
module.exports = router;