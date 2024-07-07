var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var requestify = require('requestify');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var inwardListModel = require('../../../models/mongodb/processMaster-inwardList/collection-inwardList.js');
var inwardSubListModel = require('../../../models/mongodb/processMaster-inwardSubList/collection-inwardSubList.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var inwardListMobileService = require('../../../service-factory/inwardListMobileService');
var alertService = require('../../../service-factory/alertService');
var dashboardService = require('../../../service-factory/dashboardService.js');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update picklist status to in progress
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardList/action/update-status/in-progress/')

        .patch(function (req, res, next) {

            var dataObject = req.body;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            inwardListMobileService.updateStatusToInProgress(dataObject, function (err, response) {
                if (err) {
                    logger.error(err.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                    res.json(err);
                } else {

                    res.json(response);
                }
            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update picklist status to done (Internal call by Android device)
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardList/action/update-status/done/')

        .post(function (req, res) {

            consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceId = req.body.deviceId.trim();
            var lot = req.body.lot;
            var inwardListId = req.body.inwardListId.trim();
            var endedBy = req.body.endedBy.trim();

            var flowController = new EventEmitter();

            // If all are done then it will update the status & timeEnded of that device lot  
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                var query = {'_id': inwardListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                var update = {'$set': {'resourceAssigned.$.status': 31, 'resourceAssigned.$.timeEnded': timeInInteger, 'resourceAssigned.$.endedBy': endedBy}};

                inwardListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2');
                    }
                });
            });

            // Get if any line item is not done
            flowController.on('2', function () {

                (consoleVar) ? console.log('2') : '';

                inwardSubListModel.find({'inwardListId': inwardListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No line items available under this Picklist!', status: 'error', statusCode: '304'});
                    } else {

                        conflictObject = [];

                        async.eachSeries(inwardSubListRow, function (element, callback) {

                            if (element.status < 31)
                                conflictObject.push({process: 'done'});

                            setImmediate(callback);

                        }, function (err) {

                            if (err) {

                                flowController.emit('end', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                if (conflictObject.length > 0) {

                                    flowController.emit('ERROR', {message: "Some items are yet to be processed! Picklist not completed yet!", status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('3');
                                }
                            }
                        });
                    }
                });
            });

            // Update the time ended to picklist
            flowController.on('3', function () {

                (consoleVar) ? console.log('3') : '';

                var query = {'_id': inwardListId};
                var update = {'$set': {'status': 31, 'timeCompleted': timeInInteger, 'completedBy': endedBy}};

                inwardListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {
                        inwardListModel.findOne({'_id': inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else if (inwardListRow == null) {

                                flowController.emit('ERROR', {message: 'Picklist details not available in system.', status: 'error', statusCode: '304'});
                            } else {

                                if (inwardListRow.orderNumber.length != 0) {
                                    var dataObject = {
                                        warehouseId: inwardListRow.warehouseId,
                                        textName: "Order number " + inwardListRow.orderNumber + " done",
                                        module: "PICKLIST",
                                        name: inwardListRow.name,
                                        id: inwardListId
                                    };
                                    alertService.createAlert(dataObject);
                                }

                                flowController.emit('4');
                            }
                        });
                    }
                });
            });

            // Call Picklist Export API to export changed data
            flowController.on('4', function () {

                (consoleVar) ? console.log('4') : '';

                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
            });

            // End
            flowController.on('END', function (result) {

                (consoleVar) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Start
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update picklist status to done-skipped 
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardList/action/update-status/done-skipped/')

        .patch(function (req, res) {

            consoleVar = 1;

            (consoleVar) ? console.log('list-done-skipped') : '';
            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var inwardListId = req.body.inwardListId.trim();
            var lot = req.body.lot;
            var endedBy = req.body.endedBy.trim();
            var deviceId = req.body.deviceId.trim();

            var flowController = new EventEmitter();

            // Check if any line item is skipped
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                inwardSubListModel.find({'inwardListId': inwardListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No line items available under this picklist in system.', status: 'error', statusCode: '304'});
                    } else {

                        conflictObject = [];

                        async.eachSeries(inwardSubListRow, function (element, callback) {

                            if (element.status != 31)
                                conflictObject.push({process: 'done'});

                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('end', {message: err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('1', conflictObject);
                        });
                    }
                });
            });

            // Update time ended by user to the device lot
            flowController.on('1', function (conflictObject) {

                (consoleVar) ? console.log('1') : '';

                var query = {'_id': inwardListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                var update = {'$set': {'resourceAssigned.$.status': 35, 'resourceAssigned.$.timeEnded': timeInInteger, 'resourceAssigned.$.endedBy': endedBy}};

                inwardListModel.update(query, update, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('2', conflictObject);
                });
            });

            // Update status of picklist to done/done-skipped
            flowController.on('2', function (conflictObject) {

                (consoleVar) ? console.log('2') : '';

                var status = (conflictObject.length == 0) ? 31 : 35;

                var query = {'_id': inwardListId};
                var update = {'$set': {'status': status, 'timeCompleted': timeInInteger, 'completedBy': endedBy}}

                inwardListModel.update(query, update, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                });
            });

            flowController.on('END', function (result) {

                (consoleVar) ? console.log('END') : '';

                res.json(result);
            });

            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');

        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Special case OUTER PALLET 
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardList/action/outer-case/update-status/done/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var dropLocationAddress = req.body.dropLocationAddress.trim();
            var customPalletNumber = req.body.customPalletNumber.trim();
            var outerList = JSON.parse(req.body.outerList);// Array
            var outerSubList = JSON.parse(req.body.outerSubList);// Array
            var deviceId = req.body.deviceId.trim();
            var pickActiveTime = req.body.pickActiveTime;
            var lot = parseInt(req.body.lot);
            var completedBy = req.body.completedBy.trim();
            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            // Get all pallet numbers of CPN 
            flowController.on('START', function () {

                inwardSubListModel.find({'customPalletNumber': customPalletNumber, 'status': {'$lt': 31}, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No line items available with CPN : ' + customPalletNumber + ' in system.', status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(inwardSubListRow, function (element, callback) {

                            var inwardSubListId = String(element._id);

                            if (outerSubList.indexOf(inwardSubListId) == -1) {

                                callback({message: 'Pallet number ' + element.itemValue + ' is missing or not scanned! Scan it to complete the Dropping!', status: 'error', statusCode: '200'});
                            } else {
                                setImmediate(callback);
                            }
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('UPDATE-SUBLIST');
                            }
                        });
                    }
                });
            });

            // Make all inwardSubList DONE
            flowController.on('UPDATE-SUBLIST', function () {

                (consoleLog) ? console.log('UPDATE-SUBLIST') : '';

                async.eachSeries(outerSubList, function (element, callback) {

                    var requestifyUrl = baseUrl + '/v1/processMaster/mobile/inwardSubList/action/update-status/done/';

                    data = {inwardSubListId: element, endedBy: completedBy, pickActiveTime: pickActiveTime, deviceId: deviceId, lot: lot, baseUrl: baseUrl};

                    requestify.post(requestifyUrl, data).then(function (response) {

                        var result = response.getBody();

                        if (result.status === 'success') {
                            setTimeout(function () {
                                setImmediate(callback);
                            });
                        }

                        if (result.status === 'error') {
                            console.log('Error: ' + result.message);
                            setTimeout(function () {
                                setImmediate(callback);
                            });
                        }
                    });
                }, function () {

                    flowController.emit('UPDATE-DROPLOCATION-CAPACITY');
                });
            });

            // Make all inwardSubList DONE
            flowController.on('UPDATE-DROPLOCATION-CAPACITY', function () {

                (consoleLog) ? console.log('UPDATE-DROPLOCATION-CAPACITY') : '';

                locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: "Drop location " + dropLocationAddress + " not available in system!", status: 'error', statusCode: '500'});
                    } else {

                        dropLocationFunction = locationStoreRow.function;

                        functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area not available in system.", status: 'error', statusCode: '500'});
                            } else {
                                // Ignore capacity as capacity does not matter here
                                if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {

                                    flowController.emit('UPDATE-USER-CAPACITY');
                                } else {

                                    var query = {'customerAddress': dropLocationAddress, 'activeStatus': 1};
                                    var update = {'$inc': {'availableCapacity': -1}};

                                    locationStoreModel.update(query, update, function (err) {

                                        if (err) {

                                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('UPDATE-USER-CAPACITY');
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });

            // userCapacity update
            flowController.on('UPDATE-USER-CAPACITY', function () {

                userModel.findOne({'_id': completedBy, 'activeStatus': 1}, function (err, userRow) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'Details of user not available in system!', status: 'error', statusCode: '304'});

                    } else {

                        var query = {'_id': completedBy};

                        var count = (userRow.doneCount) + 1;

                        var update = {'$set': {'doneCount': count}};

                        userModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                console.log(userRow.doneCount + " " + userRow.targetCapacity);
                                if (userRow.doneCount >= userRow.targetCapacity) {

                                    alertsModel.find({"users": {$elemMatch: {'status': {$in: [0, 1]}}}, "id": userRow._id, "module": "USERS", 'activeStatus': 1}, function (err, alertModelRow) {

                                        if (err) {
                                            // error while adding records
                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (alertModelRow.length != 0) {

                                            flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                        } else {
                                            var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                            var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                            var userName = firstName + ' ' + lastName;

                                            var dataObject = {
                                                warehouseId: userRow.warehouseId,
                                                textName: "User Capacity Overflow",
                                                module: "USERS",
                                                name: userName,
                                                id: completedBy
                                            };
                                            alertService.createAlert(dataObject);
                                            flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                        }
                                    });
                                } else {
                                    flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';

                res.json(response);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
module.exports = router;