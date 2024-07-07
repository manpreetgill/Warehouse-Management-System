var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var deviceAllocationsModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/read/deviceAllocation/:warehouseId/:deviceId/')

        .get(function (req, res, next) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var deviceId = req.params.deviceId.trim();

            var deviceAllocationsArray = [];

            var flowController = new EventEmitter();

            // Start
            flowController.on('START', function () {

                deviceAllocationsModel.find({'warehouseId': warehouseId, 'deviceId': deviceId, 'activeStatus': 1}, function (err, deviceAllocationRow) {

                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceAllocationRow.length == 0) {

                        flowController.emit('ERROR', {message: "No users allocated to this device yet!", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', deviceAllocationRow);
                    }
                });
            });

            // 
            flowController.on('1', function (deviceAllocationRow) {

                async.eachSeries(deviceAllocationRow, function (element, callback) {

                    usersModel.findOne({'_id': element.userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userRow) {

                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userRow == null) {

                            callback({message: "User data missing! Records tampered/removed from system!", status: 'error', statusCode: '404'});
                        } else {

                            var temp = {};
                            temp.userId = userRow._id;
                            temp.firstName = userRow.firstName;
                            temp.lastName = userRow.lastName;
                            temp.targetCapacity = userRow.targetCapacity;
                            temp.allocatedCapacity = userRow.allocatedCapacity;
                            temp.pendingCapacity = userRow.pendingCapacity;

                            deviceAllocationsArray.push(temp);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Operation successful!", data: deviceAllocationsArray, status: 'success', statusCode: '200'});
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/allocation/create/allocate-device/')

        .post(function (req, res) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var deviceId = req.body.deviceId.trim();

            var userId = req.body.userId.trim();

            var allocatedBy = req.body.allocatedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                deviceAllocationsModel.find({'warehouseId': warehouseId, 'deviceId': deviceId, 'userId': userId, 'activeStatus': 1}, function (err, deviceAllocationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceAllocationRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This user already allocated to the device!', status: 'success', statusCode: '304'});
                    } else if (deviceAllocationRow.length == 0) {

                        flowController.emit('1', deviceAllocationRow);
                    }
                });
            });

            // Create 
            flowController.on('1', function () {

                var newDeviceAllocation = new deviceAllocationsModel();

                newDeviceAllocation.warehouseId = warehouseId;
                newDeviceAllocation.timestamp = timeInInteger;
                newDeviceAllocation.date = moment(new Date()).format('DD/MM/YYYY');
                newDeviceAllocation.deviceId = deviceId;
                newDeviceAllocation.userId = userId;
                newDeviceAllocation.allocatedBy = allocatedBy;
                newDeviceAllocation.timeCreated = timeInInteger;

                newDeviceAllocation.save(function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'User allocated to device!', status: 'success', statusCode: '201'});
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/allocation/delete/allocated-device/:warehouseId/:deviceId/:userId/:modifiedBy/')

        .delete(function (req, res) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var deviceId = req.params.deviceId.trim();

            var userId = req.params.userId.trim();

            var modifiedBy = req.params.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                deviceAllocationsModel.findOne({'warehouseId': warehouseId, 'deviceId': deviceId, 'userId': userId, 'activeStatus': 1}, function (err, deviceAllocationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceAllocationRow == null) {

                        flowController.emit('ERROR', {message: 'Allocation data missing! Records tampered/removed from system.', status: 'success', statusCode: '304'});
                    } else if (deviceAllocationRow != null) {

                        deviceAllocationRow.activeStatus = 2;
                        deviceAllocationRow.timeModified = timeInInteger;
                        deviceAllocationRow.modifiedBy = modifiedBy;

                        deviceAllocationRow.save(function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: 'User deallocated from Device!', status: 'success', statusCode: '201'});
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;