var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var areaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/user/configuration/read/deviceAreaAllocation/:warehouseId/:deviceId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var deviceId = req.params.deviceId.trim();

            var deviceAllocationArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                areaAllocationModel.find({'warehouseId': warehouseId, 'deviceId': deviceId, 'activeStatus': 1}, function (err, deviceAreaAllocationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceAreaAllocationRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No allocations present for this device in the system!', status: 'success', statusCode: '304'});
                    } else {

                        if (deviceAreaAllocationRow.length != 0) {

                            var promise_getDeviceAreaAllocations = new Promises(function (resolve, reject) {

                                async.eachSeries(deviceAreaAllocationRow, function (element, callback) {

                                    var temp = {

                                        deviceId: element.deviceId,
                                        zoneId: element.zoneAllocated,
                                        processId: element.process
                                    };

                                    deviceAllocationArray.push(temp);
                                    callback();

                                }, function (err) {

                                    if (err) {

                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        resolve({message: 'Operation Successful', status: 'success', statusCode: 200, data: deviceAllocationArray});
                                    }

                                });
                            });

                            promise_getDeviceAreaAllocations.then(function (promise1_resolvedData) {

                                //res.json(promise1_resolvedData);
                                flowController.emit('END', promise1_resolvedData);
                            }, function (promise1_rejectedData) {

                                //res.json(promise1_rejectedData);
                                flowController.emit('ERROR', promise1_rejectedData);
                            }).catch(function (exception) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            });
                        }
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
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/user/configuration/create/deviceAreaAllocation')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceData = req.body.hasOwnProperty('data') ? req.body.data : []; //JSON.parse(req.body.data);// req.body.hasOwnProperty('data') ? req.body.data : [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var promise_createAreaAllocation = new Promises(function (resolve, reject) {

                    async.eachSeries(deviceData, function (element, callback) {

                        var process = element.processId;

                        areaAllocationModel.find({'warehouseId': element.warehouseId, 'deviceId': element.deviceId, 'process': process}, function (err, areaAllocationRow) {

                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (areaAllocationRow.length == 0) {

                                var newAreaAllocation = new areaAllocationModel();
                                newAreaAllocation.warehouseId = element.warehouseId;
                                newAreaAllocation.deviceId = element.deviceId; //userId
                                newAreaAllocation.process = process;
                                newAreaAllocation.zoneAllocated = element.zoneId;
                                newAreaAllocation.timeCreated = timeInInteger;

                                newAreaAllocation.save(function (err) {

                                    if (err) {

                                        callback();
                                    } else {

                                        callback();
                                    }
                                });

                            } else {
                                if (areaAllocationRow.length != 0) {

                                    areaAllocationModel.findOne({'deviceId': element.deviceId, 'process': process}, function (err, areaAllocationRow) {

                                        if (err) {

                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (areaAllocationRow == null) {

                                            callback({message: "Area allocation can not update", status: 'error', statusCode: '404'});
                                        } else {
                                            if (areaAllocationRow != null) {
                                                if (element.activeStatus == 1) {
                                                    areaAllocationRow.zoneAllocated = element.zoneId;
                                                    areaAllocationRow.timeModified = timeInInteger;
                                                    areaAllocationRow.activeStatus = 1;
                                                } else if (element.activeStatus == 2) {
                                                    areaAllocationRow.activeStatus = 2;
                                                    areaAllocationRow.zoneAllocated = [];
                                                    areaAllocationRow.timeModified = timeInInteger;
                                                }

                                                areaAllocationRow.save(function (err) {
                                                    if (err) {
                                                        callback();
                                                    } else {
                                                        callback();
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }, function (err) {

                        if (err) {

                            reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            resolve({message: 'Area allocation for the device saved', status: 'success', statusCode: '201'});
                        }

                    });
                });

                promise_createAreaAllocation.then(function (response) { // After promise completes, if promise resolved (RESOLVED PART)

                   // res.json(response);
                   flowController.emit('END',response);
                }, function (reason) { // After promise completes, if promise rejected (REJECTED PART)

                   // res.json(reason);
                   flowController.emit('ERROR',reason);
                }).catch(function (exption) {
                    /* error :( */
                    flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
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