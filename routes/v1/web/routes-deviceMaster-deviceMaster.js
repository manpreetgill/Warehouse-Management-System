var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var mongoose = require('mongoose');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var warehouseMastersModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var technicalDetailsModel = require('../../../models/mongodb/deviceMaster-technicalDetails/collection-technicalDetails.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
var alertService = require('../../../service-factory/alertService.js');
var errorLogService = require('../../../service-factory/errorLogService');
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');

//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/read/device/:warehouseId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                deviceMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                    var devicesArray = [];

                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No device configured yet!", status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(deviceMasterRow, function (element, callback) {

                            var device = {
                                id: element._id,
                                name: element.name,
                                model: element.model,
                                manufacturer: element.manufacturer,
                                uuid: element.uuid,
                                platform: element.platform,
                                osversion: element.osversion,
                                pingInterval: element.pingInterval,
                                syncInterval: element.syncInterval,
                                targetCapacity: element.targetCapacity,
                                materialHandlingUnitId: element.materialHandlingUnitId,
                                minPickListItem: element.minPickListItem || '',
                                maxPickListItem: element.maxPickListItem || ''
                            };
                            devicesArray.push(device);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: devicesArray, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-DEVICE',
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
// Add device to system
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/create/device/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseName = req.body.warehouseName.trim().toUpperCase();
            var imeiNumber = req.body.imeiNumber.trim();
            var model = req.body.model.trim();
            var manufacturer = req.body.manufacturer.trim();
            var uuid = req.body.uuid.trim();
            var platform = req.body.platform.trim();
            var osversion = req.body.osversion.trim();

            var flowController = new EventEmitter();

            // Get warehouse details
            flowController.on('START', function () {

                warehouseMastersModel.findOne({'name': warehouseName, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', warehouseRow);
                    }
                });
            });

            // Check if IMEI is authenticated
            flowController.on('1', function (warehouseRow) {

                technicalDetailsModel.find({'imeiNumber': imeiNumber, 'activeStatus': 1}, function (err, technicalDetailsRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (technicalDetailsRow.length == 0) {

                        flowController.emit('ERROR', {message: 'This device\'s IMEI number is not registered/authenticated with us! For more details contact Avancer Support.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', warehouseRow);
                    }
                });
            });

            // Check if device already registered
            flowController.on('2', function (warehouseRow) {

                deviceMastersModel.findOne({'imeiNumber': imeiNumber, 'warehouseId': String(warehouseRow._id), 'activeStatus': 1}, function (err, deviceMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceMasterRow != null) {

                        flowController.emit('ERROR', {message: 'Device already configured in the system!', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('3', warehouseRow);
                    }
                });
            });

            // Insert device to database
            flowController.on('3', function (warehouseRow) {

                var newDeviceMaster = new deviceMastersModel();

                newDeviceMaster.warehouseId = warehouseRow._id;
                newDeviceMaster.model = model;
                newDeviceMaster.manufacturer = manufacturer;
                newDeviceMaster.imeiNumber = imeiNumber;
                newDeviceMaster.uuid = uuid;
                newDeviceMaster.platform = platform;
                newDeviceMaster.osversion = osversion;
                newDeviceMaster.name = '';
                newDeviceMaster.timeCreated = timeInInteger;

                newDeviceMaster.save(function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        var deviceObject = {};

                        deviceObject.deviceId = result._id;
                        deviceObject.warehouseId = result.warehouseId;

                        flowController.emit('END', {data: deviceObject, status: 'success', statusCode: '201'});
                    }
                });
            });

            // End
            flowController.on('END', function (reuslt) {

                (showConsole) ? console.log('end') : '';

                res.json(reuslt);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'DEVICE-MASTER-ADD',
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

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/update/device/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var deviceId = req.body.deviceId.trim();

            var name = req.body.name.trim();

            var targetCapacity = req.body.targetCapacity.trim();

            var syncInterval = req.body.syncInterval.trim();

            var minPickListItem = req.body.minPickListItem.trim();

            var maxPickListItem = req.body.maxPickListItem.trim();

            var materialHandlingUnitId = req.body.hasOwnProperty('materialHandlingUnitId') ? req.body.materialHandlingUnitId : []; //Array

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                deviceMastersModel.findOne({'_id': deviceId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceRow == null) {

                        flowController.emit('ERROR', {message: 'Device data missing! Records tampered/removed from system.', status: 'error', statusCode: '304'});

                    } else if (deviceRow != null) {

                        if (deviceRow.name == name) {

                            deviceRow.name = name;
                            deviceRow.targetCapacity = targetCapacity;
                            deviceRow.availableCapacity = targetCapacity;
                            deviceRow.syncInterval = syncInterval;
                            deviceRow.materialHandlingUnitId = materialHandlingUnitId;
                            deviceRow.minPickListItem = minPickListItem;
                            deviceRow.maxPickListItem = maxPickListItem;
                            deviceRow.timeModified = timeInInteger;
                            deviceRow.modifiedBy = modifiedBy;
                            deviceRow.save(function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('END', {message: 'Device information updated!', status: 'success', statusCode: '201'});
                                }
                            });
                        } else {

                            deviceRow.name = name;
                            deviceRow.targetCapacity = targetCapacity;
                            deviceRow.availableCapacity = targetCapacity;
                            deviceRow.syncInterval = syncInterval;
                            deviceRow.minPickListItem = minPickListItem;
                            deviceRow.maxPickListItem = maxPickListItem;
                            deviceRow.materialHandlingUnitId = materialHandlingUnitId;
                            deviceRow.timeModified = timeInInteger;
                            deviceRow.modifiedBy = modifiedBy;
                            deviceMastersModel.find({'name': name, 'activeStatus': 1}, function (err, deviceRow1) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (deviceRow1.length != 0) {

                                    flowController.emit('ERROR', {message: 'Device Name Already Exist in System!!', status: 'error', statusCode: '304'});
                                } else {

                                    if (deviceRow1.length == 0) {

                                        deviceRow.save(function (err) {
                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('END', {message: 'Device information updated!', status: 'success', statusCode: '201'});
                                            }
                                        });
                                    }
                                }
                            });
                        }
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
                    MODULE: 'UPDATE-DEVICE',
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
// Remove Device from System
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/delete/device/:warehouseId/:deviceId/')

        .delete(function (req, res) {


            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var deviceId = req.params.deviceId.trim();

            date = moment(new Date()).format('DD/MM/YY');

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                deviceMastersModel.findOne({'_id': deviceId, 'warehouseId': warehouseId, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceMaster) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceMaster == null) {

                        flowController.emit('ERROR', {message: 'Device data missing! Records tampered/removed from system.', status: 'success', statusCode: '304'});
                    } else {

                        deviceTrackingModel.find({'deviceId': deviceId, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (deviceTrackingRow.length == 0) {

                                deviceMastersModel.update({'_id': deviceId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}}, function (err, devicesRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: 'Device removed from system!', status: 'success', statusCode: '201'});
                                    }
                                });
                            } else {

                                if (deviceTrackingRow[0].status == "LOGOUT") {

                                    deviceMastersModel.update({'_id': deviceId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}}, function (err, devicesRow) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('END', {message: 'Device removed from system!', status: 'success', statusCode: '201'});
                                        }
                                    });
                                } else {

                                    flowController.emit('ERROR', {message: 'Device already in use...Try again later', status: 'error', statusCode: '304'})
                                }
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
                    MODULE: 'DELETE-DEVICE',
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
// Update target capacity of device for Picklist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/update/target-capacity/picklist/')

        .post(function (req, res) {

            var consoleVar = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceId = req.body.deviceId.trim();

            var assignedTo = req.body.userId.trim();

            var pickListArray = req.body.pickListArray;

            var pickSubListCount = req.body.pickSubListCount;

            var flowController = new EventEmitter();

            // Check whether picklist is empty or not
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                deviceMastersModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceMasterRow) {
                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceMasterRow == null) {

                        flowController.emit('ERROR', {message: "Device data missing! Device information tampered/removed/blocked from system.", status: 'error', statusCode: '404'});
                    } else {

                        // both same for first time
                        if (deviceMasterRow.availableCapacity == deviceMasterRow.targetCapacity) {

                            flowController.emit('1', pickSubListCount);
                        } else {

                            if (deviceMasterRow.targetCapacity > deviceMasterRow.availableCapacity) {

                                if (deviceMasterRow.availableCapacity >= pickSubListCount) {

                                    flowController.emit('1', pickSubListCount);
                                } else {

                                    flowController.emit('ALERT', deviceMasterRow);
                                    flowController.emit('1', pickSubListCount);
                                    //flowController.emit('ERROR', {message: "Device's current capacity exceeded! Kindly expand the daily capacity.", status: 'warning', statusCode: '200'});
                                }
                            } else {
                                if (deviceMasterRow.targetCapacity < pickSubListCount) {

                                    flowController.emit('ERROR', {message: "Allocated capacity is greater then device's available capacity", status: 'error', statusCode: '304'});
                                }
                            }
                        }
                    }
                });
            });

            //ALERT
            flowController.on('ALERT', function (deviceMasterRow) {
                console.log('ALERT');
                dataObject = {

                    warehouseId: deviceMasterRow.warehouseId,
                    textName: 'Target Capacity of device ' + deviceMasterRow.name + ' Has been Reached! Device will now work with extra load. However you can redefine the capacity via Device Master.',
                    module: 'DEVICE CAPACITY',
                    name: 'DEVICE NAME : ' + (deviceMasterRow.name) ? deviceMasterRow.name : deviceMasterRow.model,
                    id: deviceMasterRow._id
                };

                alertService.createAlert(dataObject, function (err, response) {
                    if (err) {

                        console.log('err');
                    } else {

                        console.log('success');
                    }
                });

            });
            // Update available capacity to device
            flowController.on('1', function () {

                (consoleVar) ? console.log('1') : '';

                deviceMastersModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                    var newAvailableCapacity = deviceMasterRow.availableCapacity - pickSubListCount;

                    var finalAvailableCapacity = (newAvailableCapacity < 0) ? 0 : newAvailableCapacity;

                    deviceMastersModel.update({'_id': deviceId}, {$set: {'availableCapacity': finalAvailableCapacity}},
                            function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('2');
                                }
                            });
                });
            });

            // Assign resource to sublist also
            flowController.on('2', function () {

                (consoleVar) ? console.log('2') : '';

                async.eachSeries(pickListArray, function (element, callbackDone) {

                    pickSubListArray = element.pickSubListId;

                    var pickListId = mongoose.Types.ObjectId(element.pickListId);

                    var P1 = {"$match": {"_id": pickListId}};
                    var P2 = {"$unwind": "$resourceAssigned"};
                    var P3 = {"$match": {"resourceAssigned.deviceId": deviceId}};
                    var P4 = {"$group": {"_id": '$_id', "numberOfEntries": {"$sum": 1}}};

                    pickListModel.aggregate([P1, P2, P3, P4], function (err, pickAggregateRecord) {

                        if (err) {

                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var lot = (pickAggregateRecord.length == 0) ? 1 : pickAggregateRecord[0].numberOfEntries + 1;

                            async.eachSeries(pickSubListArray, function (element2, callback2Done) {

                                pickSubListModel.findOne({'_id': element2, 'resourceAssigned.0': {'$exists': false}, 'activeStatus': 1}, function (err, pickSublistRow) {
                                    if (err) {
                                        console.log('Error occured while getting line item data: ' + deviceId);
                                        callback2Done();
                                    } else if (pickSublistRow == null) {

                                        console.log('Line item gos assigned to another concurrent device before: ' + deviceId);
                                        callback2Done();
                                    } else {

                                        var query = {'_id': element2};
                                        var update = {$addToSet: {'resourceAssigned': {'deviceId': deviceId, 'lot': lot}},
                                            $set: {'status': 21, 'timeAssigned': timeInInteger, 'assignedTo': assignedTo}};

                                        pickSubListModel.findOneAndUpdate(query, update, function (err) {
                                            if (err) {

                                                callback2Done({message: 'Error while assigning device to resource!!!!!', status: 'error', statusCode: '500'});
                                            } else {
                                                currentActivityStatusFunction('PICK', element2, 'PICK - Assigned');
                                                callback2Done();
                                            }
                                        });
                                    }
                                });
                            }, function (err) {
                                if (err) {

                                    callbackDone(err);
                                } else {

                                    callbackDone();
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('3');
                    }
                });
            });

            // Add resource to picklist and change status to assigned
            flowController.on('3', function () {

                (consoleVar) ? console.log('3') : '';

                async.eachSeries(pickListArray, function (element, callbackDone) {

                    pickSubListModel.count({'pickListId': element.pickListId, 'status': {'$lte': 11}, 'activeStatus': 1}, function (err, totalUnAssignedCount) {

                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var pickListId = mongoose.Types.ObjectId(element.pickListId);

                            var P1 = {"$match": {"_id": pickListId}};
                            var P2 = {"$unwind": "$resourceAssigned"};
                            var P3 = {"$match": {"resourceAssigned.deviceId": deviceId}};
                            var P4 = {"$group": {"_id": '$_id', "numberOfEntries": {"$sum": 1}}};

                            pickListModel.aggregate([P1, P2, P3, P4], function (err, pickAggregateRecord) {

                                if (err) {

                                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    var lot = (pickAggregateRecord.length == 0) ? 1 : pickAggregateRecord[0].numberOfEntries + 1;

                                    var query = {'_id': element.pickListId};
                                    if (totalUnAssignedCount == 0) {

                                        var update = {$addToSet: {'resourceAssigned': {'deviceId': deviceId, 'capacityAssigned': element.pickSubListId.length, 'lot': lot, 'timeCreated': timeInInteger, 'status': 21}}, $set: {'status': 21, 'timeAssigned': timeInInteger}};
                                    } else {
                                        var update = {$addToSet: {'resourceAssigned': {'deviceId': deviceId, 'capacityAssigned': element.pickSubListId.length, 'lot': lot, 'timeCreated': timeInInteger, 'status': 21}}};
                                    }

                                    pickListModel.update(query, update, function (err) {
                                        if (err) {

                                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            callbackDone();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "Resources assigned to Pick-List", status: 'success', statusCode: '200'});
                    }
                });
            });


            flowController.on('END', function (result) {

                (consoleVar) ? console.log('END') : '';

                res.json(result);
            });


            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                (consoleVar) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'DEVICE-MASTER-UPDATE',
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


            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update target capacity of device for Putlist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/configuration/update/target-capacity/putlist/')

        .patch(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var putListId = req.body.pickListId.trim();

            var deviceIdData = (req.body.hasOwnProperty('data')) ? req.body.data : [];

            var assignedBy = req.body.assignedBy.trim();

            var flowController = new EventEmitter();

            // Check whether picklist is empty or not
            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'pickList data missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {
                        if (putListRow != null) {

                            putSubListModel.count({'putListId': putListId, 'activeStatus': 1}, function (err, putSubListCount) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    if (putSubListCount === 0) {

                                        flowController.emit('ERROR', {message: 'Can\'t assign! No line Items present under this Picklist.', status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('1');
                                    }
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('1', function () {

                filteredDeviceArray = [];

                if (deviceIdData.length == 0) {

                    flowController.emit('ERROR', {message: 'No assignment has been done.', status: 'error', statusCode: '304'});
                } else {

                    async.eachSeries(deviceIdData, function (element, callback) {

                        if (element.allocatedCapacity != '') {

                            filteredDeviceArray.push(element);
                        }
                        setImmediate(callback);
                    }, function (err) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('2', filteredDeviceArray);
                        }
                    });
                }
            });

            flowController.on('2', function (filteredDeviceArray) {

                async.eachSeries(filteredDeviceArray, function (element, callback) {

                    deviceMastersModel.findOne({'_id': element.deviceId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceMasterRow) {
                        if (err) {
                            // Serverside error
                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (deviceMasterRow == null) {

                            callback({message: "Device data missing! Device information tampered/removed/blocked from system.", status: 'error', statusCode: '404'});
                        } else {

                            if (deviceMasterRow.availableCapacity == deviceMasterRow.targetCapacity) {

                                setImmediate(callback);
                            } else {

                                if (deviceMasterRow.targetCapacity > deviceMasterRow.availableCapacity) {

                                    if (deviceMasterRow.availableCapacity >= element.allocatedCapacity) {

                                        setImmediate(callback);
                                    } else {

                                        flowController.emit('ALERT', deviceMasterRow);
                                        setImmediate(callback);
                                        //callback({message: "Allocated capacity is greater then device's available capacity", status: 'error', statusCode: '304'});
                                    }
                                } else {
                                    if (deviceMasterRow.targetCapacity < element.allocatedCapacity) {

                                        callback({message: "Allocated capacity is greater then device's available capacity", status: 'error', statusCode: '304'});
                                    }
                                }
                            }
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', filteredDeviceArray);
                    }
                });
            });

            //ALERT
            flowController.on('ALERT', function (deviceMasterRow) {
                console.log('ALERT');
                dataObject = {

                    warehouseId: deviceMasterRow.warehouseId,
                    textName: 'Target Capacity of device ' + deviceMasterRow.name + ' Has been Reached! Device will now work with extra load. However you can redefine the capacity via Device Master.',
                    module: 'DEVICE CAPACITY',
                    name: 'DEVICE NAME : ' + (deviceMasterRow.name) ? deviceMasterRow.name : deviceMasterRow.model,
                    id: deviceMasterRow._id
                };

                alertService.createAlert(dataObject, function (err, response) {
                    if (err) {

                        console.log('err');
                    } else {

                        console.log('success');
                    }
                });
            });
            //
            flowController.on('3', function (filteredDeviceArray) {

                async.eachSeries(filteredDeviceArray, function (element, callback) {

                    deviceMastersModel.findOne({'_id': element.deviceId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                        var newAvailableCapacity = deviceMasterRow.availableCapacity - element.allocatedCapacity;

                        deviceMastersModel.update({'_id': element.deviceId}, {$set: {'availableCapacity': newAvailableCapacity}},
                                function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('4', filteredDeviceArray);
                    }
                });
            });

            // Add resource to picklist and change status to assigned
            flowController.on('4', function (filteredDeviceArray) {

                async.eachSeries(filteredDeviceArray, function (element, callback) {

                    putListModel.update({'_id': putListId}, {
                        $addToSet: {'resourceAssigned': {'deviceId': element.deviceId, 'capacityAssigned': element.allocatedCapacity, 'timeCreated': timeInInteger}},
                        $set: {'status': 1, 'assignedBy': assignedBy, 'timeAssigned': timeInInteger}
                    },
                            function (err) {
                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "Resources assigned to Pick-List", status: 'success', statusCode: '304'});
                    }
                });
            });

            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'DEVICE-MASTER-UPDATE',
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

            flowController.emit('START');
        });
//
var currentActivityStatusFunction = function (model, putSubListId, status) {

    currentActiveStatusService.setCurrentActivityStatus(model, putSubListId, status, function (err, records) {
        if (err) {
            console.log(err);
        } else {
            console.log('Current activity status update. Status: ' + records);
        }
    });
};
//
module.exports = router;