var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//----------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoresModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
//----------------------------------------------------------------------------------------------------------------------------
var transactionalLogService = require('../../../service-factory/transactionalLogService');
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');
var alertService = require('../../../service-factory/alertService');
var dashboardService = require('../../../service-factory/dashboardService.js');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status of sublist to in progress
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSublist/action/update-status/in-progress/')

        .patch(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putSubListId = req.body.putSubListId.trim();

            var startedBy = req.body.startedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No details of line item available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': putSubListId};
                        var update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};

                        putSubListModel.update(query, update, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('LOGS');
                                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                var activity = 'PUT, In Progress';

                logsFunction(1002, putSubListId, activity);
            });

            // END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                currentActivityStatusFunction('PUT', putSubListId, 'PUT - In progress');
                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // START
            flowController.emit('START');
        });
//
//        
//--------------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status of put-sublist to in pending for drop
//--------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSublist/action/update-status/pending-for-drop/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var putSubListId = req.body.putSubListId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1', putSubListRow);
                    }
                });
            });

            flowController.on('1', function (putSubListRow) {

                (showConsole) ? console.log('1') : '';

                var query = {'_id': putSubListId};
                var update = {'$set': {'status': 27}};

                putSubListModel.update(query, update, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('2', putSubListRow);
                });
            });

            flowController.on('2', function (putSubListRow) {

                (showConsole) ? console.log('2') : '';

                itemStoreId = putSubListRow.itemStoreId;

                async.eachSeries(itemStoreId, function (element, callback) {

                    var query = {'_id': element};
                    var update = {'$set': {currentActivityStatus: 'IN-TRANSIT VIA PUT'}};

                    itemStoresModel.update(query, update, function (err) {
                        if (err)
                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        else
                            setImmediate(callback);
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});

                });
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                (showConsole) ? console.log('LOGS') : '';

                var activity = 'PUT, Item pending for drop!';

                logsFunction(1003, putSubListId, activity);
            });

            // END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                currentActivityStatusFunction('PUT', putSubListId, 'PUT - Pending for drop');
                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // START
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status of sublist to in done
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSubList/action/update-status/done/')

        .post(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var customPalletNumber = req.body.customPalletNumber.trim();

            var putSubListId = req.body.putSubListId.trim();

            var pickActiveTime = req.body.pickActiveTime.trim();

            var deviceId = req.body.deviceId.trim();

            var dropLocationAddress = req.body.dropLocationAddress.toUpperCase();

            var endedBy = req.body.endedBy; //mongoId of the user

            putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                if (err) {

                    res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else if (putSubListRow == null) {

                    res.json({message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                } else {

                    var palletType = putSubListRow.palletType;

                    var flowController = new EventEmitter();

                    // Get location details
                    flowController.on('START', function () {

                        (showConsole) ? console.log('START') : '';

                        locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (locationStoreRow == null) {

                                flowController.emit('ERROR', {message: "Drop location " + dropLocationAddress + " not available in system.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', locationStoreRow);
                            }
                        });
                    });

                    // Update time to line item
                    flowController.on('1', function (locationStoreRow) {

                        (showConsole) ? console.log('1') : '';

                        putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (putSubListRow == null) {

                                flowController.emit('ERROR', {message: "No line item details available in system..", status: 'error', statusCode: '404'});
                            } else {

                                putSubListRow.dropLocationId = String(locationStoreRow._id);
                                putSubListRow.dropLocationAddress = locationStoreRow.customerAddress;
                                putSubListRow.pickedQuantity = locationStoreRow.requiredQuantity;
                                putSubListRow.status = 31;
                                putSubListRow.timeEnded = timeInInteger;
                                putSubListRow.endedBy = endedBy;

                                putSubListRow.save(function (err) {

                                    if (err) {
                                        // error while adding records
                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('2');
                                    }
                                });
                            }
                        });
                    });

                    // Update time difference to putlist
                    flowController.on('2', function () {

                        (showConsole) ? console.log('2') : '';

                        putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (putSubListRow == null) {

                                flowController.emit('ERROR', {message: "No line item details available in system.", status: 'error', statusCode: '404'});
                            } else {

                                var putListId = putSubListRow.putListId;

                                var query = {'_id': putListId, 'resourceAssigned.deviceId': deviceId};
                                var update = {'$set': {'resourceAssigned.$.pickActiveTime': pickActiveTime}};

                                putListModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {
                                        flowController.emit('3');
                                    }
                                });
                            }
                        });
                    });

                    // Update drop location capacity
                    flowController.on('3', function () {

                        (showConsole) ? console.log('3') : '';

                        locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                dropLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {

                                        if (functionAreaRow.name === 'REPROCESS' || functionAreaRow.name === 'DISPATCH') {
                                            // Ignore capacity as capacity does not matter here
                                            flowController.emit('4', locationStoreRow, functionAreaRow);
                                        } else if (putSubListRow.palletType == 'O') {
                                            // Outer capacity will be updated by special case API
                                            flowController.emit('4', locationStoreRow, functionAreaRow);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {
                                                // Capacity for allocation required by putsiblist
                                                var requiredCapacity = putSubListRow.requiredQuantity;
                                                // Currently available capacity at location
                                                var currentAvailableCapacity = locationStoreRow.availableCapacity;
                                                // Total capacity of location after calculation
                                                var availableCapacity = currentAvailableCapacity - requiredCapacity;

                                                locationStoreRow.availableCapacity = availableCapacity;

                                                locationStoreRow.save(function (err) {

                                                    flowController.emit('4', locationStoreRow, functionAreaRow);
                                                });

                                            } else {

                                                flowController.emit('ERROR', {message: 'System defined capacity to be added soon', status: 'success', statusCode: '200'});
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });

                    // Update item store with new locations
                    flowController.on('4', function (locationStoreRow, functionAreaRow) {

                        (showConsole) ? console.log('4') : '';

                        var itemStoreIdForAlert;

                        itemStoreId = putSubListRow.itemStoreId;

                        dropLocationFunctionArea = functionAreaRow.name;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'_id': element};

                            var update = '';

                            if (palletType === 'O') { // Pallet is og outer
                                if (dropLocationFunctionArea === 'REPROCESS') {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED'}};
                                } else if (dropLocationFunctionArea === 'DISPATCH') {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'customPalletNumber': customPalletNumber, 'activeStatus': 4}};
                                } else {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'customPalletNumber': customPalletNumber}};
                                }
                            } else {
                                if (dropLocationFunctionArea === 'DISPATCH') {
                                    itemStoreIdForAlert = element;
                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'activeStatus': 4}};
                                } else {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED'}};
                                }
                            }

                            itemStoresModel.update(query, update, function (err) {
                                if (err) {
                                    // error while adding records
                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});

                            } else {
                                if (itemStoreIdForAlert)
                                    flowController.emit('MININVENTORYALERT', itemStoreIdForAlert);
                                flowController.emit('5', locationStoreRow);
                            }
                        });
                    });

                    // 
                    flowController.on('MININVENTORYALERT', function (itemStoreIdForAlert) {

                        (showConsole) ? console.log('MININVENTORYALERT') : '';
                        var itemMasterId;

                        itemStoresModel.findOne({'_id': itemStoreIdForAlert}, function (itemStoreRowErr, itemStoreRow) {
                            if (itemStoreRowErr)
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                if (err)
                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                var itemMasterSystemSpecification = itemMasterRow.itemSystemSpecification;
                                var minInventoryAlert;
                                if (itemMasterSystemSpecification.length > 0)
                                    minInventoryAlert = itemMasterSystemSpecification[0].minInventoryAlert;

                                var warehouseId = itemMasterRow.warehouseId;
                                var itemCode = itemMasterRow.itemCode;

                                if (minInventoryAlert != "") {
                                    itemStoresModel.find({'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRows) {
                                        if (err)
                                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        minInventoryAlert = parseInt(minInventoryAlert);
                                        if (!itemStoreRows || itemStoreRows.length <= minInventoryAlert) {
                                            var alertObjectToSend = {};
                                            alertObjectToSend.warehouseId = warehouseId;
                                            alertObjectToSend.textName = 'Current Inventory of ItemCode ' + itemCode + ' Has Reached To Minimum Inventory (Min. Count : ' + minInventoryAlert + '  && Current Inventory  ' + itemStoreRows.length + '  ).';
                                            alertObjectToSend.module = "Inventory";
                                            alertObjectToSend.name = itemCode;
                                            alertObjectToSend.id = itemMasterId;
                                            alertService.createAlert(alertObjectToSend);
                                        }
                                    });
                                }
                            });
                        });
                    });

                    // Update new location with item store Id
                    flowController.on('5', function () {

                        (showConsole) ? console.log('5') : '';

                        itemStoreId = putSubListRow.itemStoreId;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'customerAddress': dropLocationAddress};
                            var update = {'$addToSet': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {
                                    // error while adding records
                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    setImmediate(callback);
                                }
                            });

                        }, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful', status: 'success', statusCode: '200'});
                            }
                        });
                    });

                    // LOGS
                    flowController.on('LOGS', function () {

                        (showConsole) ? console.log('LOGS') : '';

                        var activity = 'PUT, Item pending for drop!';

                        logsFunction(1004, putSubListId, activity);
                    });

                    // END
                    flowController.on('END', function (result) {

                        (showConsole) ? console.log('END') : '';
                        currentActivityStatusFunction('PUT', putSubListId, 'PUT - Done');
                        res.json(result);
                    });

                    // ERROR
                    flowController.on('ERROR', function (error) {

                        (showConsole) ? console.log('ERROR') : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // START
                    flowController.emit('START');
                }
            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status of sublist to in done with skip
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSublist/action/update-status/skipped/')

        .patch(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putSubListId = req.body.putSubListId.trim();

            var skipReason = req.body.skipReason;

            var endedBy = req.body.endedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': putSubListId};
                        var update = {'$set': {'status': 33, 'skipReason': skipReason, 'timeEnded': timeInInteger, 'endedBy': endedBy}};

                        putSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('LOGS');
                                flowController.emit('DONE', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                (showConsole) ? console.log('LOGS') : '';

                var activity = 'PUT, Item skipped!';

                logsFunction(1005, putSubListId, activity);
            });

            // END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                currentActivityStatusFunction('PUT', putSubListId, 'PUT - Skipped');
                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // START
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status with edit to location manually
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putSubList/action/update/choose-location/put-item/')

        .patch(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var typeName = req.body.typeName;

            var pickActiveTime = req.body.pickActiveTime;

            var deviceId = req.body.deviceId.trim();

            var status = req.body.status;

            var deviceId = req.body.deviceId.trim();

            var status = req.body.status;

            var selectedMHE = req.body.selectedMHE.trim();

            var putSubListId = req.body.putSubListId;

            putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                if (err) {

                    res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else if (putSubListRow == null) {

                    res.json({message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                } else {

                    var flowController = new EventEmitter();

                    // START
                    flowController.on('START', function () {

                        (showConsole) ? console.log('START') : '';

                        if (typeName === 'DRP_LOC_NOT_SCAN') {

                            flowController.emit('ADD_MANUAL_DROP_REASON');
                        }

                        if (typeName === 'LOC_CHANGE') {

                            flowController.emit('VALIDATE_DROP_LOCATION');
                        }
                    });

                    // DRP_LOC_NOT_SCAN
                    flowController.on('ADD_MANUAL_DROP_REASON', function () {

                        (showConsole) ? console.log('ADD_MANUAL_DROP_REASON') : '';

                        var dropLocation = req.body.dropLocation;
                        var reason = req.body.reason;

                        var query = {'_id': putSubListId};
                        var update = {'$addToSet': {'manualOverrideReason': {'dropLocation': dropLocation, 'reason': reason, 'reasonType': typeName}}};

                        putSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('FINAL_UPDATE_ITEM_STORE', dropLocation);
                            }
                        });
                    });

                    // FINAL UPDATE TO ITEM STORE
                    flowController.on('FINAL_UPDATE_ITEM_STORE', function (dropLocation) {

                        (showConsole) ? console.log('FINAL_UPDATE_ITEM_STORE') : '';

                        var dropLocationAddress = dropLocation;
                        var endedBy = req.body.endedBy;

                        (showConsole) ? console.log('START') : '';

                        locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (locationStoreRow == null) {

                                flowController.emit('ERROR', {message: "Drop location " + dropLocationAddress + " details not available in system.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', locationStoreRow, endedBy);
                            }
                        });
                    });

                    // Update time to line item
                    flowController.on('1', function (locationStoreRow, endedBy) {

                        (showConsole) ? console.log('1') : '';

                        putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (putSubListRow == null) {

                                flowController.emit('ERROR', {message: "No line item details available in system.", status: 'error', statusCode: '404'});
                            } else {

                                putSubListRow.dropLocationId = String(locationStoreRow._id);
                                putSubListRow.dropLocationAddress = locationStoreRow.customerAddress;
                                putSubListRow.pickedQuantity = locationStoreRow.requiredQuantity;
                                putSubListRow.status = 31;
                                putSubListRow.timeEnded = timeInInteger;
                                putSubListRow.endedBy = endedBy;

                                putSubListRow.save(function (err) {

                                    if (err) {
                                        // error while adding records
                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('2', locationStoreRow);
                                    }
                                });
                            }
                        });
                    });

                    // Update time difference to putlist
                    flowController.on('2', function (locationStoreRow) {

                        (showConsole) ? console.log('2') : '';

                        putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (putSubListRow == null) {

                                flowController.emit('ERROR', {message: "No line item details available in system.", status: 'error', statusCode: '404'});
                            } else {

                                var putListId = putSubListRow.putListId;
                                var query = {'_id': putListId, 'resourceAssigned.deviceId': deviceId};
                                var update = {'$set': {'resourceAssigned.$.pickActiveTime': pickActiveTime}};

                                putListModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {
                                        flowController.emit('3', locationStoreRow);
                                    }
                                });
                            }
                        });
                    });

                    // Update drop location capacity
                    flowController.on('3', function (locationStoreRow) {

                        (showConsole) ? console.log('3') : '';

                        locationStoreModel.findOne({'customerAddress': locationStoreRow.customerAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                dropLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {
                                        // Ignore capacity as capacity does not matter here
                                        if (functionAreaRow.name === 'REPROCESS' || functionAreaRow.name === 'DISPATCH') {

                                            flowController.emit('4', locationStoreRow, functionAreaRow);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {

                                                // Capacity for allocation required by putsiblist
                                                var requiredCapacity = putSubListRow.requiredQuantity;
                                                // Currently available capacity at location
                                                var currentAvailableCapacity = locationStoreRow.availableCapacity;
                                                // Total capacity of location after calculation
                                                var availableCapacity = currentAvailableCapacity - requiredCapacity;

                                                locationStoreRow.availableCapacity = availableCapacity;

                                                locationStoreRow.save(function (err) {

                                                    flowController.emit('4', locationStoreRow, functionAreaRow);
                                                });
                                            } else {

                                                flowController.emit('ERROR', {message: 'System defined capacity to be added soon', status: 'success', statusCode: '200'});
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });

                    // Update item store with new locations
                    flowController.on('4', function (locationStoreRow, functionAreaRow) {

                        (showConsole) ? console.log('4') : '';

                        var itemStoreIdForAlert;

                        itemStoreId = putSubListRow.itemStoreId;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'_id': element};

                            var update = '';

                            if (putSubListRow.palletType === 'O') { // Pallet is og outer
                                if (dropLocationFunctionArea === 'REPROCESS') {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED'}};
                                } else if (dropLocationFunctionArea === 'DISPATCH') {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'customPalletNumber': customPalletNumber, 'activeStatus': 4}};
                                } else {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'customPalletNumber': customPalletNumber}};
                                }
                            } else {
                                if (functionAreaRow.name === 'DISPATCH') {
                                    itemStoreIdForAlert = element;
                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED', 'activeStatus': 4}};
                                } else {

                                    update = {'$set': {'locationStoreId': String(locationStoreRow._id), currentActivityStatus: 'PUT-COMPLETED'}};
                                }
                            }

                            itemStoresModel.update(query, update, function (err) {
                                if (err)
                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                else
                                    setImmediate(callback);
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {
                                if (itemStoreIdForAlert)
                                    flowController.emit('MININVENTORYALERT', itemStoreIdForAlert);

                                flowController.emit('5', locationStoreRow);
                            }
                        });
                    });

                    // Minimum inventory alert
                    flowController.on('MININVENTORYALERT', function (itemStoreIdForAlert) {

                        (showConsole) ? console.log('MININVENTORYALERT') : '';
                        var itemMasterId;

                        itemStoresModel.findOne({'_id': itemStoreIdForAlert}, function (err, itemStoreRow) {
                            if (err)
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                if (err)
                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                var itemMasterSystemSpecification = itemMasterRow.itemSystemSpecification;
                                var minInventoryAlert;
                                if (itemMasterSystemSpecification.length > 0)
                                    minInventoryAlert = itemMasterSystemSpecification[0].minInventoryAlert;

                                var warehouseId = itemMasterRow.warehouseId;
                                var itemCode = itemMasterRow.itemCode;

                                if (minInventoryAlert != "") {
                                    itemStoresModel.find({'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRows) {
                                        if (err)
                                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                        minInventoryAlert = parseInt(minInventoryAlert);
                                        if (!itemStoreRows || itemStoreRows.length <= minInventoryAlert) {
                                            var alertObjectToSend = {};
                                            alertObjectToSend.warehouseId = warehouseId;
                                            alertObjectToSend.textName = 'Current Inventory of ItemCode ' + itemCode + ' Has Reached To Minimum Inventory (Min. Count : ' + minInventoryAlert + '  && Current Inventory  ' + itemStoreRows.length + '  ).';
                                            alertObjectToSend.module = "Inventory";
                                            alertObjectToSend.name = itemCode;
                                            alertObjectToSend.id = itemMasterId;
                                            alertService.createAlert(alertObjectToSend);
                                        }
                                    });
                                }
                            });
                        });
                    });

                    // Update new location with item store Id
                    flowController.on('5', function (locationStoreRow) {

                        (showConsole) ? console.log('5') : '';

                        itemStoreId = putSubListRow.itemStoreId;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'customerAddress': locationStoreRow.customerAddress};
                            var update = {'$addToSet': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {
                                    // error while adding records
                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "Technical error occurred! Try again later. (St.Id 1)", status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful', status: 'success', statusCode: '200'});
                            }
                        });
                    });

                    // Validate drop location as per rule engine
                    flowController.on('VALIDATE_DROP_LOCATION', function () {

                        (showConsole) ? console.log('VALIDATE_DROP_LOCATION') : '';

                        var dropLocation = req.body.dropLocation;

                        var palletType = putSubListRow.palletType;
                        var palletSize = putSubListRow.palletSize;

                        ruleEngineModel.findOne({'location': dropLocation, 'activeStatus': 1}, function (err, ruleEngineRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (ruleEngineRow == null) {

                                flowController.emit('ERROR', {message: "Drop location " + dropLocation + " not configured in Rule Engine!", status: 'error', statusCode: '404'});
                            } else {
                                if (ruleEngineRow.palletType.indexOf(palletType) == -1 || ruleEngineRow.palletSize.indexOf(palletSize) == -1) {

                                    flowController.emit('ERROR', {message: "Location not eligible for PUT! Allowed Pallet Types are: " + ruleEngineRow.palletType + " & Pallet Sizes are: " + ruleEngineRow.palletSize, status: 'error', statusCode: '404'});
                                } else {

                                    flowController.emit('VALIDATE_DROP_LOCATION_MHE', dropLocation);
                                }
                            }
                        });
                    });

                    // VALIDATE DROP LOCATION
                    flowController.on('VALIDATE_DROP_LOCATION_MHE', function (dropLocation) {

                        (showConsole) ? console.log('VALIDATE_DROP_LOCATION_MHE') : '';

                        var requiredQuantity = putSubListRow.requiredQuantity;

                        locationStoreModel.findOne({'customerAddress': dropLocation, 'availability': 'A', 'availableCapacity': {'$gte': requiredQuantity}, 'activeStatus': 1}).exec(function (err, locationStoreRow) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else if (locationStoreRow == null) {

                                flowController.emit('ERROR', {message: "This drop location is blocked or the available capacity is not sufficient! Choose different one.", status: 'error', statusCode: '500'});
                            } else {

                                var locationMaterialHandlingUnit = locationStoreRow.materialHandlingUnitId;

                                if (locationMaterialHandlingUnit.length != 0) {

                                    var index = locationMaterialHandlingUnit.indexOf(selectedMHE);

                                    if (index == -1)
                                        flowController.emit('ERROR', {message: 'Your material handling equipment is not capable to handle operation at this location.', status: 'error', statusCode: '304'});
                                    else
                                        flowController.emit('VALIDATE_0_HOLDINGTYPE', locationStoreRow);
                                } else {

                                    flowController.emit('VALIDATE_0_HOLDINGTYPE', locationStoreRow);
                                }
                            }
                        });
                    });

                    // Check holding type
                    flowController.on('VALIDATE_0_HOLDINGTYPE', function (locationStoreRow) {

                        (showConsole) ? console.log('VALIDATE_0_HOLDINGTYPE') : '';

                        var dropLocationHoldingType = locationStoreRow.holdingType;

                        holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                            } else if (holdingTypeRow == null) {

                                flowController.emit('ERROR', {message: "Drop location's Holding type details not available in system.", status: 'error', statusCode: '404'});
                            } else {

                                holdingType = holdingTypeRow.name;

                                itemType = 'PALLET';

                                if (itemType == 'PALLET') {
                                    if (holdingType != 'PALLET') {
                                        if (holdingType != 'ANY') {

                                            flowController.emit('ERROR', {message: "Pallet not allowed to be put at location " + locationStoreRow.customerAddress + " as the location is a Non-Pallet location! However, you can allow pallets to be dropped here by changing the properties of " + locationStoreRow.customerAddress + " in Location Master.", status: 'error', statusCode: '404'});
                                        } else {

                                            flowController.emit('VALIDATE_ITEM_RESERVATION', locationStoreRow);
                                        }
                                    } else {

                                        flowController.emit('VALIDATE_ITEM_RESERVATION', locationStoreRow);
                                    }
                                }
                                if (itemType == 'ITEMCODE' || itemType == 'SERIALNUMBER') {

                                    if (holdingType == 'PALLET') {

                                        flowController.emit('ERROR', {message: "Location: " + locationStoreRow.customerAddress + " holds Pallets only! Loose boxes are not allowed here. However, you can allow loose box here by changing the properties of " + locationStoreRow.customerAddress + " in Location Master.", status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('VALIDATE_ITEM_RESERVATION', locationStoreRow);
                                    }
                                }
                            }
                        });
                    });

                    // item reservation
                    flowController.on('VALIDATE_ITEM_RESERVATION', function (locationStoreRow) {

                        (showConsole) ? console.log('VALIDATE_ITEM_RESERVATION') : '';

                        var itemCode = putSubListRow.itemCode;

                        itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                            var itemMasterId = String(itemMasterRow._id);

                            if (locationStoreRow.isReservedForItem == 'YES') {

                                if (locationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                                    if (locationStoreRow.reservedItemId.length > 1) {

                                        flowController.emit('VALIDATE_ELIGIBILITY', itemMasterRow, locationStoreRow);

                                    } else {
                                        //
                                        flowController.emit('VALIDATE_AVAILABILITY', locationStoreRow);
                                    }
                                } else {
                                    //
                                    flowController.emit('ERROR', {message: 'This location is reserved for different item! Choose different location.', status: 'error', statusCode: '403'});
                                }
                            } else {
                                //
                                flowController.emit('VALIDATE_ELIGIBILITY', itemMasterRow, locationStoreRow);
                            }
                        });
                    });

                    // Check eligibility if item is not reserved but present or not OR empty location
                    flowController.on('VALIDATE_ELIGIBILITY', function (itemMasterRow, locationStoreRow) {

                        (showConsole) ? console.log('VALIDATE_ELIGIBILITY') : '';

                        if (locationStoreRow.assignedItemStoreId.length > 0) {

                            conflictArray = [];

                            async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                itemStoresModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                    if (itemStoreRow.itemMasterId == itemMasterRow._id) {

                                        callback2();
                                    } else if (itemStoreRow.exclusiveStorage == 'YES') {

                                        conflictArray.push(element2);
                                        callback2();
                                    } else {

                                        callback2();
                                    }
                                });

                            }, function (err) {

                                if (conflictArray.length != 0) {

                                    flowController.emit('ERROR', {message: 'Drop location ' + locationStoreRow.customerAddress + ' contain exclusive items! Choose different location.', status: 'error', statusCode: '403'});
                                } else if (itemMasterRow.exclusiveStorage == 'YES') {

                                    flowController.emit('ERROR', {message: 'This item is exclusive and not allowed to be placed at shared location! Choose different location.', status: 'error', statusCode: '403'});
                                } else {

                                    flowController.emit('VALIDATE_AVAILABILITY', locationStoreRow);
                                }
                            });
                        } else {

                            flowController.emit('VALIDATE_AVAILABILITY', locationStoreRow);
                        }
                    });

                    // Check final available capacity after removing suggested count is matching with required 
                    flowController.on('VALIDATE_AVAILABILITY', function (locationStoreRow) {

                        (showConsole) ? console.log('VALIDATE_AVAILABILITY') : '';

                        putSubListModel.find({'_id': {"$ne": putSubListId}, 'status': {"$lt": 31}, 'dropLocationId': String(locationStoreRow._id), 'activeStatus': 1}, function (err, putSublistRow) {

                            if (putSublistRow.length == 0) {

                                flowController.emit('ADD_REASON', locationStoreRow._id);
                            } else {

                                availableCapacity = locationStoreRow.availableCapacity;

                                var suggestedCount = putSublistRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                                if ((availableCapacity - suggestedCount) >= putSubListRow.requiredCapacity) {

                                    flowController.emit('ADD_REASON', locationStoreRow._id);
                                } else {

                                    flowController.emit('ERROR', {message: "Invalid Location! This location is reserved by another putlist.", status: 'error', statusCode: '500'});
                                }
                            }
                        });
                    });

                    // LOC_CHANGE
                    flowController.on('ADD_REASON', function (locationStoreId) {

                        (showConsole) ? console.log('ADD_REASON') : '';

                        var dropLocation = req.body.dropLocation;
                        var reason = req.body.reason;

                        var query = {'_id': putSubListId};
                        var update = {'$addToSet': {'manualOverrideReason': {'dropLocation': dropLocation, 'reason': reason, 'reasonType': typeName}}};

                        putSubListModel.update(query, update, function (err) {
                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('UPDATE_DROP_LOCATION_TO_PUTSUBLIST', locationStoreId, dropLocation);
                            }
                        });
                    });

                    // UPDATE DROP_LOCATION_TO_PUTSUBLIST
                    flowController.on('UPDATE_DROP_LOCATION_TO_PUTSUBLIST', function (dropLocationId, dropLocationAddress) {

                        (showConsole) ? console.log('UPDATE_DROP_LOCATION_TO_PUTSUBLIST') : '';

                        var query = {'_id': putSubListId};
                        var update = {'$set': {'dropLocationId': dropLocationId, 'dropLocationAddress': dropLocationAddress}};

                        putSubListModel.update(query, update, function (err) {
                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                if (status == 31) {

                                    flowController.emit('FINAL_UPDATE_ITEM_STORE', dropLocationAddress);
                                } else {

                                    flowController.emit('END', {message: "Operation successful!", status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    });

                    // Update transactional logs
                    flowController.on('LOGS', function () {

                        (showConsole) ? console.log('LOGS') : '';

                        var activity = 'PUT, Manual location update and/or item dropped!';

                        logsFunction(1006, putSubListId, activity);
                    });

                    // END
                    flowController.on('END', function (result) {

                        (showConsole) ? console.log('END') : '';
                        currentActivityStatusFunction('PUT', putSubListId, 'PUT - Done(Manual)');
                        res.json(result);
                    });

                    // ERROR
                    flowController.on('ERROR', function (error) {

                        (showConsole) ? console.log('ERROR') : '';
                        (showConsole) ? console.log(error) : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // START
                    flowController.emit('START');
                }
            });
        });
//
//
var logsFunction = function (logCode, putSubListId, activity) {

    putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, pickSubListRow) {

        var transactionId = pickSubListRow.transactionalLogId;

        var lotAddressArray = [];

        async.eachSeries(pickSubListRow.itemStoreId, function (element, callback) {

            itemStoresModel.findOne({'_id': element}, function (err, itemStoreRow) {

                lotAddressArray.push(itemStoreRow.lotAddress);
                setImmediate(callback);
            });
        }, function (err) {
            if (err) {

                console.log('Error while getting lot addresses');
            } else {

                var object = {};
                object.transactionalId = transactionId;
                object.lotAddress = lotAddressArray;
                object.activity = activity;

                transactionalLogService.addTransactionToLogs(logCode, object, function (err, logsRecord) {
                    if (err) {

                        console.log('Error while adding transactions to logs');
                    } else {

                        console.log('Transactional logs updated in to system.');
                    }
                });
            }
        });
    });
};
//
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
//
module.exports = router;