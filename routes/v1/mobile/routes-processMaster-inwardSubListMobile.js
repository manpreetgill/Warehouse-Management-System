var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var requestify = require('requestify');
//var asyncRequest = require('sync-request');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var inwardListModel = require('../../../models/mongodb/processMaster-inwardList/collection-inwardList.js');
var inwardSubListModel = require('../../../models/mongodb/processMaster-inwardSubList/collection-inwardSubList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var transactionalLogService = require('../../../service-factory/transactionalLogService');
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');
var alertService = require('../../../service-factory/alertService');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update Put Sublist status to in progress
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardSubList/action/update-status/in-progress/')

        .post(function (req, res) {

            var consoleVar = 0;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var inwardSubListId = req.body.inwardSubListId.trim();

            var deviceId = req.body.deviceId.trim();

            var startedBy = req.body.startedBy.trim();

            //var itemCode = req.body.itemCode.trim();

            flowController = new EventEmitter();

            // Get mongoID of all the line items under this picklist for withdrawn check
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system!', status: 'error', statusCode: '304'});
                    } else {

                        inwardListId = inwardSubListRow.inwardListId;

                        inwardSubListModel.find({'inwardListId': inwardListId, 'resourceAssigned.deviceId': deviceId, 'activeStatus': 1}).select({'name': 1}).exec(function (err, inwardSubListMongoIds) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (inwardSubListMongoIds == null) {

                                flowController.emit('ERROR', {message: 'No line items not available.', status: 'error', statusCode: '304'});
                            } else {

                                var MongoIds = inwardSubListMongoIds;

                                flowController.emit('1', MongoIds, inwardListId);
                            }
                        });
                    }
                });
            });

            // Update pickSublist status to in progress
            flowController.on('1', function (MongoIds, inwardListId) {

                (consoleVar) ? console.log('1') : '';

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system', status: 'error', statusCode: '304'});
                    } else if (inwardSubListRow.status < 11) {

                        flowController.emit('ERROR', {message: 'This line item has been withdrawn by Server administrator!', data: MongoIds, status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('2', MongoIds, inwardListId);
                            }
                        });
                    }
                });
            });

            // Check if picklist time started present or not and update
            flowController.on('2', function (MongoIds, inwardListId) {

                (consoleVar) ? console.log('2') : '';

                inwardListModel.findOne({'_id': inwardListId}, function (err, inwardListRecord) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRecord == null) {

                        flowController.emit('ERROR', {message: 'No picklist details available in system.!', status: 'error', statusCode: '304'});
                    } else if ('timeStarted' in inwardListRecord) {

                        inwardSubListModel.find({inwardListId: inwardListId}).sort({'status': 1}).limit(1).exec(function (err, pickSublistRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                inwardListRecord.status = pickSublistRow[0].status;
                                inwardListRecord.save(function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('PICK-ALERT', MongoIds);
                                    }
                                });
                            }
                        });
                    } else {

                        console.log('Not Present');
                        inwardListRecord.status = 25;
                        inwardListRecord.timeStarted = timeInInteger;
                        inwardListRecord.startedBy = startedBy;

                        inwardListRecord.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'ERROR OCCURRED WHILE GETTING PICKLIST DATA!!!', status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('PICK-ALERT', MongoIds);
                            }
                        });
                    }
                });
            });

            // Send pick alert for that item if having
            flowController.on('PICK-ALERT', function (MongoIds) {

                (consoleVar) ? console.log('PICK-ALERT') : '';

                var pickAlert = '';

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system.!', status: 'error', statusCode: '304'});
                    } else {

                        itemMasterModel.findOne({'itemCode': inwardSubListRow.itemCode}, function (err, itemMasterRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else if (itemMasterRow == null) {

                                flowController.emit('DONE', {message: "Status updated into the system!", data: MongoIds, pickAlert: pickAlert, status: 'success', statusCode: '200'});
                            } else {

                                pickAlert = (itemMasterRow.pickAlert) ? (itemMasterRow.pickAlert) : '';

                                flowController.emit('DONE', {message: "Status updated into the system!", data: MongoIds, pickAlert: pickAlert, status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
                flowController.emit('LOGS');
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    var transactionId = inwardSubListRow.transactionalLogId;

                    var lotAddressArray = [];

                    async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                        itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                            object.activity = 'PICK Activity in progress!';

                            transactionalLogService.addTransactionToLogs(2003, object, function (err, logsRecord) {
                                if (err) {

                                    console.log('Error while adding transactions to logs');
                                } else {

                                    console.log('Transactional logs updated in to system.');
                                }
                            });
                        }
                    });
                });
            });

            // END
            flowController.on('DONE', function (result) {

                (consoleVar) ? console.log('DONE') : '';
                currentActivityStatusFunction('PICK', inwardSubListId, 'PICK - In progress');
                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (consoleVar) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------------
// Update status of pick-sublist to in pending for drop ::: Considering picked quantity is matched required
//--------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardSubList/action/update-status/pending-for-drop/')

        .post(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var inwardSubListId = req.body.inwardSubListId.trim();

            var serialNumberArray = JSON.parse(req.body.serialNumberArray);// Adjustment for android to parse array sent as string

            inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (inwardSubListRow == null) {

                    res.json({message: 'Line item details not available in system.', status: 'error', statusCode: '304'});
                } else {

                    var itemType = inwardSubListRow.itemType;

                    var flowController = new EventEmitter();

                    flowController.on('START', function () {

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'status': 27, 'pickedQuantity': inwardSubListRow.requiredQuantity}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                if (itemType == 'ITEMCODE')
                                    flowController.emit('0');
                                else
                                    flowController.emit('1', inwardSubListRow.itemStoreId);
                            }
                        });
                    });

                    // IF Item Type is ITEMCODE
                    flowController.on('0', function () {

                        itemStoreArray = [];

                        async.eachSeries(serialNumberArray, function (element, callback) {

                            itemStoreModel.findOne({'itemSerialNumber': element}, function (err, itemStoreRow) {
                                if (err) {

                                    callback({message: err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow == null) {

                                    callback({message: 'Item with Box No. ' + element + ' not found in system.', status: 'error', statusCode: '404'});
                                } else {
                                    itemStoreArray.push(String(itemStoreRow._id));
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('1', itemStoreArray);
                        });
                    });

                    // Remove items from location
                    flowController.on('1', function (itemStoreArray) {

                        var pickLocationId = inwardSubListRow.pickLocationId;

                        async.eachSeries(itemStoreArray, function (element, callback) {

                            var query = {'_id': pickLocationId, 'activeStatus': 1};
                            var update = {'$pull': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {
                                flowController.emit('ERROR', err);
                            } else {
                                flowController.emit('2', itemStoreArray);
                            }
                        });
                    });

                    // Update available quantity at location store if it is user defined
                    flowController.on('2', function (itemStoreArray) {

                        var pickLocationId = inwardSubListRow.pickLocationId;

                        locationStoreModel.findOne({'_id': pickLocationId, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                pickLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': pickLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {
                                        // Ignore capacity as capacity does not matter here
                                        if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {

                                            flowController.emit('3', itemStoreArray);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {

                                                currentLength = locationStoreRow.availableCapacity + inwardSubListRow.requiredQuantity;

                                                locationStoreRow.availableCapacity = currentLength;

                                                locationStoreRow.save(function (err) {

                                                    if (err) {

                                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        flowController.emit('3', itemStoreArray);
                                                    }
                                                });
                                            } else {

                                                flowController.emit('3', itemStoreArray);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });

                    // update item store for in transit
                    flowController.on('3', function (itemStoreArray) {

                        async.eachSeries(itemStoreArray, function (element, callback) {

                            var query = {'_id': element, 'activeStatus': 1};
                            var update = {'$set': {'currentActivityStatus': 'IN-TRANSIT'}, '$unset': {'locationStoreId': 1}};

                            itemStoreModel.update(query, update, function (err) {

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

                                if (itemType == 'ITEMCODE') {

                                    flowController.emit('4', itemStoreArray);
                                } else {

                                    flowController.emit('LOGS');
                                    flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    });

                    // update Pick Sublist with new itemStore (For ITEMCODE)
                    flowController.on('4', function (itemStoreArray) {

                        var query = {'_id': inwardSubListId, 'activeStatus': 1};
                        var update = {'$set': {'itemStoreId': itemStoreArray, 'serialNumberArray': serialNumberArray}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                //flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                            }
                        });
                    });

                    // Update transactional logs
                    flowController.on('LOGS', function () {

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                            var transactionId = inwardSubListRow.transactionalLogId;

                            var lotAddressArray = [];

                            async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                                itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                                    object.activity = 'PICK Activity in progress!';

                                    transactionalLogService.addTransactionToLogs(2004, object, function (err, logsRecord) {
                                        if (err) {

                                            console.log('Error while adding transactions to logs');
                                        } else {

                                            console.log('Transactional logs updated in to system.');
                                        }
                                    });
                                }
                            });
                        });
                    });

                    // END
                    flowController.on('END', function (result) {
                        currentActivityStatusFunction('PICK', inwardSubListId, 'PICK - Pending for drop');
                        res.json(result);
                    });

                    // ERROR
                    flowController.on('ERROR', function (error) {
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // Initialize
                    flowController.emit('START');
                }
            });
        });
//
// done API
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Update status of pick-sublist to done
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardSubList/action/update-status/done/')

        .post(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var inwardSubListId = req.body.inwardSubListId.trim();

            var pickActiveTime = req.body.pickActiveTime;

            var lot = parseInt(req.body.lot);

            var endedBy = req.body.endedBy.trim();  //mongoId of the user

            var deviceId = req.body.deviceId.trim();

            var baseUrl = req.body.baseUrl.trim();

            var reasonToForceDone = (req.body.reasonToForceDone) ? req.body.reasonToForceDone.trim() : "";

            inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (inwardSubListRow == null) {

                    res.json({message: 'No line item details available in system', status: 'error', statusCode: '304'});
                } else {

                    var flowController = new EventEmitter();

                    // Update pick sublist status to done
                    flowController.on('UPDATE_PICKSUBLIST', function () {

                        (consoleVar) ? console.log('UPDATE_PICKSUBLIST') : '';

                        var query = {'_id': inwardSubListId};
                        if (reasonToForceDone == "") {
                            var update = {'$set': {'status': 31, 'timeEnded': timeInInteger, 'endedBy': endedBy}};
                        } else {
                            var update = {'$set': {'status': 31, reasonToForceDone: reasonToForceDone, 'timeEnded': timeInInteger, 'endedBy': endedBy}};
                        }

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                if (reasonToForceDone)
                                    flowController.emit('UPDATE_LOCATION_STORE');
                                else
                                    flowController.emit('UPDATE_TIMECOUNT');
                            }
                        });
                    });

                    // Update timecount of sublist
                    flowController.on('UPDATE_TIMECOUNT', function () {

                        (consoleVar) ? console.log('UPDATE_TIMECOUNT') : '';

                        var inwardListId = inwardSubListRow.inwardListId;

                        var query = {'_id': inwardListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                        var update = {'$set': {'resourceAssigned.$.pickActiveTime': pickActiveTime, 'resourceAssigned.$.timeEnded': timeInInteger, 'resourceAssigned.$.endedBy': endedBy}};

                        inwardListModel.update(query, update, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('UPDATE_LOCATION_STORE');
                        });
                    });

                    // Update drop location assignedItemStoreId 
                    flowController.on('UPDATE_LOCATION_STORE', function () {

                        (consoleVar) ? console.log('UPDATE_LOCATION_STORE') : '';

                        var itemStoreId = inwardSubListRow.itemStoreId;

                        var dropLocationId = inwardSubListRow.dropLocationId;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'_id': dropLocationId, 'activeStatus': 1};
                            var update = {'$push': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {
                                if (err)
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                else
                                    setImmediate(callback);
                            });

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('UPDATE_LOCATION_CAPACITY');
                        });
                    });

                    // Update available quantity at location store if it is user defined
                    flowController.on('UPDATE_LOCATION_CAPACITY', function () {

                        (consoleVar) ? console.log('UPDATE_LOCATION_CAPACITY') : '';

                        var dropLocationId = inwardSubListRow.dropLocationId;

                        locationStoreModel.findOne({'_id': dropLocationId, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                dropLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {

                                        if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {
                                            // Ignore capacity as capacity does not matter if Drop location function is REPROCESS | DISPATCH
                                            flowController.emit('UPDATE_ITEMSTORE', functionAreaRow);
                                        } else if (inwardSubListRow.itemType == 'PALLET' && inwardSubListRow.palletType == 'O') {
                                            // If pick is PALLET & from REPROCESS & Drop is at STORAGE then capacity must be bypassed capacity will be updated in outer-case done
                                            flowController.emit('UPDATE_ITEMSTORE', functionAreaRow);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {

                                                var capacityToBeReduced = inwardSubListRow.requiredQuantity;

                                                var locationCapacity = locationStoreRow.availableCapacity;

                                                var availableCapacity = locationCapacity - capacityToBeReduced;

                                                locationStoreRow.availableCapacity = availableCapacity;

                                                locationStoreRow.save(function (err) {
                                                    if (err)
                                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    else
                                                        flowController.emit('UPDATE_ITEMSTORE', functionAreaRow);
                                                });

                                            } else {

                                                flowController.emit('UPDATE_ITEMSTORE', functionAreaRow);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });
                    // update item store from in transit to pick completed
                    // Check if drop location function belongs to REPROCESS area and remove customPalletNumber key
                    flowController.on('UPDATE_ITEMSTORE', function (functionAreaRow) {

                        (consoleVar) ? console.log('UPDATE_ITEMSTORE') : '';

                        var itemStoreIdForAlert;

                        var itemStoreId = inwardSubListRow.itemStoreId;

                        var dropLocationFunctionArea = functionAreaRow.name;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            console.log('ITEM IN PROCESS ' + element);

                            var query = {'_id': element, 'activeStatus': 1};
                            var update = '';

                            if (dropLocationFunctionArea === 'REPROCESS') {

                                update = {
                                    '$set': {'locationStoreId': inwardSubListRow.dropLocationId},
                                    '$unset': {'customPalletNumber': 1}
                                };
                            } else if (dropLocationFunctionArea === 'DISPATCH') {
                                itemStoreIdForAlert = element;
                                update = {'$set': {'locationStoreId': inwardSubListRow.dropLocationId, 'activeStatus': 4}};
                            } else {

                                update = {'$set': {'locationStoreId': inwardSubListRow.dropLocationId}};
                            }

                            itemStoreModel.update(query, update, function (err) {

                                if (err) {
                                    callback(err);
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                if (itemStoreIdForAlert) {
                                    flowController.emit('MININVENTORYALERT', itemStoreIdForAlert);
                                } else {
                                    flowController.emit('LOGS');
                                    flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    });

                    // Check for Minimum inventory
                    flowController.on('MININVENTORYALERT', function (itemStoreIdForAlert) {

                        (consoleVar) ? console.log('MININVENTORYALERT') : '';
                        var itemMasterId;

                        itemStoreModel.findOne({'_id': itemStoreIdForAlert}, function (err, itemStoreRow) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                if (err)
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                var itemMasterSystemSpecification = itemMasterRow.itemSystemSpecification;
                                var minInventoryAlert;
                                if (itemMasterSystemSpecification.length > 0)
                                    minInventoryAlert = itemMasterSystemSpecification[0].minInventoryAlert;

                                var warehouseId = itemMasterRow.warehouseId;
                                var itemCode = itemMasterRow.itemCode;

                                if (minInventoryAlert != "") {
                                    itemStoreModel.find({'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRows) {
                                        if (err)
                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

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

                                flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                            });
                        });
                    });

                    // Update transactional logs
                    flowController.on('LOGS', function () {

                        (consoleVar) ? console.log('LOGS') : '';

                        flowController.emit('UPDATE-USER-CAPACITY');

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                            var transactionId = inwardSubListRow.transactionalLogId;

                            var lotAddressArray = [];

                            async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                                itemStoreModel.findOne({'_id': element}, function (err, itemStoreRow) {

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
                                    object.activity = 'PICK Activity in progress!';

                                    transactionalLogService.addTransactionToLogs(2005, object, function (err, logsRecord) {
                                        if (err) {

                                            console.log('Error while adding transactions to logs');
                                        } else {

                                            console.log('Transactional logs updated in to system.');
                                        }
                                    });
                                }
                            });
                        });
                    });

                    // userCapacity update
                    flowController.on('UPDATE-USER-CAPACITY', function () {

                        userModel.findOne({'_id': endedBy, 'activeStatus': 1}, function (err, userRow) {

                            if (err) {
                                // error while adding records
                                console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                console.log({message: 'Data missing! User details modified/deleted from the system!', status: 'error', statusCode: '304'});

                            } else {

                                var query = {'_id': endedBy};

                                var count = (userRow.doneCount) + 1;

                                console.log("count= " + count);

                                var update = {'$set': {'doneCount': count}};

                                userModel.update(query, update, function (err) {
                                    if (err) {

                                        console.log({message: "Unable to make update! Try again after some time." + err, status: 'error', statusCode: '500'});
                                    } else {
                                        console.log(userRow.doneCount + " " + userRow.targetCapacity);
                                        if (userRow.doneCount >= userRow.targetCapacity) {

                                            alertsModel.find({"users": {$elemMatch: {'status': {$in: [0, 1]}}}, "id": userRow._id, "module": "USERS", 'activeStatus': 1}, function (err, alertModelRow) {

                                                if (err) {
                                                    // error while adding records
                                                    console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                                } else if (alertModelRow.length != 0) {

                                                    console.log({message: 'Operation successful!', status: 'success', statusCode: '200'});
                                                } else {

                                                    var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                                    var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                                    var userName = firstName + ' ' + lastName;

                                                    var dataObject = {
                                                        warehouseId: userRow.warehouseId,
                                                        textName: "User Capacity Overflow",
                                                        module: "USERS",
                                                        name: userName,
                                                        id: endedBy
                                                    };
                                                    alertService.createAlert(dataObject);
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });

                    // END
                    flowController.on('END', function (result) {

                        (consoleVar) ? console.log('END') : '';
                        currentActivityStatusFunction('PICK', inwardSubListId, 'PICK - Done');
                        setTimeout(function () {
                            exportPickSubListDataToCybernatic(baseUrl, inwardSubListId);
                        }, 1000);
                        res.json(result);
                    });

                    // ERROR
                    flowController.on('ERROR', function (error) {

                        (consoleVar) ? console.log('ERROR') : '';
                        (consoleVar) ? console.log(error) : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // Initialize
                    flowController.emit('UPDATE_PICKSUBLIST');
                }
            });
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------------
// Update status of pick-sublist to in skipped
//--------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardSubList/action/update-status/skipped/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var inwardSubListId = req.body.inwardSubListId.trim();

            var skipReason = req.body.skipReason;

            var endedBy = req.body.endedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'status': 33, 'skipReason': skipReason, 'timeEnded': timeInInteger, 'endedBy': endedBy}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                inwardListModel.findOne({'_id': inwardSubListRow.inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (inwardListRow == null) {

                                        flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                                    } else {

                                        var dataObject = {

                                            warehouseId: inwardListRow.warehouseId,
                                            textName: "Picklist moved to skipped with itemCode " + inwardSubListRow.itemCode,
                                            module: "PICKSUBLIST",
                                            name: "",
                                            id: inwardSubListRow._id
                                        };
                                        alertService.createAlert(dataObject);
                                        flowController.emit('LOGS');
                                        flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        });
                    }
                });
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                flowController.emit('UPDATE-USER-CAPACITY');

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    var transactionId = inwardSubListRow.transactionalLogId;

                    var lotAddressArray = [];

                    async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                        itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                            object.activity = 'PICK Activity in progress!';

                            transactionalLogService.addTransactionToLogs(2006, object, function (err, logsRecord) {
                                if (err) {

                                    console.log('Error while adding transactions to logs');
                                } else {

                                    console.log('Transactional logs updated in to system.');
                                }
                            });
                        }
                    });
                });
            });

            // userCapacity update
            flowController.on('UPDATE-USER-CAPACITY', function () {

                userModel.findOne({'_id': endedBy, 'activeStatus': 1}, function (err, userRow) {

                    if (err) {
                        // error while adding records
                        console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        console.log({message: 'Data missing! User details modified/deleted from the system!', status: 'error', statusCode: '304'});

                    } else {

                        var query = {'_id': endedBy};

                        var count = (userRow.doneCount) + 1;

                        console.log("count= " + count);

                        var update = {'$set': {'doneCount': count}};

                        userModel.update(query, update, function (err) {
                            if (err) {

                                console.log({message: "Unable to make update! Try again after some time." + err, status: 'error', statusCode: '500'});
                            } else {
                                console.log(userRow.doneCount + " " + userRow.targetCapacity);
                                if (userRow.doneCount >= userRow.targetCapacity) {

                                    alertsModel.find({"users": {$elemMatch: {'status': {$in: [0, 1]}}}, "id": userRow._id, "module": "USERS", 'activeStatus': 1}, function (err, alertModelRow) {

                                        if (err) {
                                            // error while adding records
                                            console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                        } else if (alertModelRow.length != 0) {

                                            console.log({message: 'Operation successful!', status: 'success', statusCode: '200'});
                                        } else {

                                            var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                            var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                            var userName = firstName + ' ' + lastName;

                                            var dataObject = {
                                                warehouseId: userRow.warehouseId,
                                                textName: "User Capacity Overflow",
                                                module: "USERS",
                                                name: userName,
                                                id: endedBy
                                            };
                                            alertService.createAlert(dataObject);
                                        }
                                    });
                                }

                            }
                        });
                    }
                });
            });

            // END
            flowController.on('END', function (result) {
                currentActivityStatusFunction('PICK', inwardSubListId, 'PICK - Skipped');
                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------------
// Update sync status of pick-sublist to put-item
//--------------------------------------------------------------------------------------------------------------------------------
// Step 1 - Pick Location Scan
router.route('/v1/processMaster/mobile/inwardSubList/action/update-partial/pick-location/location-scan/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var inwardSubListId = req.body.inwardSubListId.trim();

            var startedBy = req.body.startedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('2', inwardSubListRow);
                        });
                    }
                });
            });

            flowController.on('2', function (inwardSubListRow) {

                var inwardListId = inwardSubListRow.inwardListId;

                inwardListModel.findOne({'_id': inwardListId, 'activeStatus': 1}, function (err, inwardListRecord) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRecord == null) {

                        flowController.emit('ERROR', {message: 'No details of picklist available in system!', status: 'error', statusCode: '304'});
                    } else {

                        inwardSubListModel.find({'inwardListId': inwardListId, 'status': {'$lt': 25}, 'activeStatus': 1}, function (err, inwardSubListRecords) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                var query = {'_id': inwardListId, 'activeStatus': 1};
                                var update = '';

                                if (inwardSubListRecords.length == 0) {// No line items pending for be in progress

                                    if ('timeStarted' in inwardListRecord && inwardListRecord.timeStarted != undefined) {// Time started not present 

                                        update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};
                                    } else {

                                        update = {'$set': {'status': 25}};
                                    }
                                } else {// Line items still to be in progress

                                    if ('timeStarted' in inwardListRecord && inwardListRecord.timeStarted != undefined) {// Time started not present 

                                        update = {'$set': {'timeStarted': timeInInteger, 'startedBy': startedBy}};
                                    }
                                }

                                if (update == '') {

                                    //flowController.emit('LOGS');
                                    flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                                } else {

                                    inwardListModel.update(query, update, function (err) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            //flowController.emit('LOGS');
                                            flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });

            // Update transactional logs
            flowController.on('LOGS', function () {

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                    var transactionId = inwardSubListRow.transactionalLogId;

                    var lotAddressArray = [];

                    async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                        itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                            object.activity = 'PICK Activity in progress!';

                            transactionalLogService.addTransactionToLogs(2007, object, function (err, logsRecord) {
                                if (err) {

                                    console.log('Error while adding transactions to logs');
                                } else {

                                    console.log('Transactional logs updated in to system.');
                                }
                            });
                        }
                    });
                });
            });

            // END
            flowController.on('END', function (result) {

                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
// Step 2 - Pick Location Item and quantity scan
router.route('/v1/processMaster/mobile/inwardSubList/action/update-partial/pick-location/item-scan/')

        .patch(function (req, res) {
            
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
    
            var inwardSubListId = req.body.inwardSubListId.trim();

            var serialNumberArray = req.body.serialNumberArray;

            inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (inwardSubListRow == null) {

                    res.json({message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                } else {

                    var flowController = new EventEmitter();

                    var itemType = inwardSubListRow.itemType;

                    flowController.on('START', function () {

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'status': 27, 'pickedQuantity': inwardSubListRow.requiredQuantity}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                if (itemType == 'ITEMCODE')
                                    flowController.emit('0');
                                else
                                    flowController.emit('1', inwardSubListRow.itemStoreId);
                            }
                        });
                    });

                    // IF Item Type is ITEMCODE
                    flowController.on('0', function () {

                        itemStoreArray = [];

                        async.eachSeries(serialNumberArray, function (element, callback) {

                            itemStoreModel.findOne({'itemSerialNumber': element}, function (err, itemStoreRow) {
                                if (err) {

                                    callback({message: err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow == null) {

                                    callback({message: 'Item with Box No. ' + element + ' not found in system.', status: 'error', statusCode: '500'});
                                } else {

                                    itemStoreArray.push(String(itemStoreRow._id));
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', itemStoreArray);
                            }
                        });
                    });

                    // Remove items from location
                    flowController.on('1', function (itemStoreArray) {

                        var pickLocationId = inwardSubListRow.pickLocationId;

                        async.eachSeries(itemStoreArray, function (element, callback) {

                            var query = {'_id': pickLocationId, 'activeStatus': 1};
                            var update = {'$pull': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {
                                flowController.emit('ERROR', err);
                            } else {
                                flowController.emit('2', pickLocationId, itemStoreArray);
                            }
                        });
                    });

                    // Update available quantity at location store if it is user defined
                    flowController.on('2', function (pickLocationId, itemStoreArray) {

                        locationStoreModel.findOne({'_id': pickLocationId, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                pickLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': pickLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {
                                        // Ignore capacity as capacity does not matter here
                                        if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {

                                            flowController.emit('3', itemStoreArray, functionAreaRow);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {

                                                var currentLength = locationStoreRow.availableCapacity + inwardSubListRow.requiredQuantity;

                                                locationStoreRow.availableCapacity = currentLength;

                                                locationStoreRow.save(function (err) {
                                                    if (err) {

                                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        flowController.emit('3', itemStoreArray, functionAreaRow);
                                                    }
                                                });
                                            } else {

                                                flowController.emit('3', itemStoreArray, functionAreaRow);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });

                    // update item store for in transit
                    flowController.on('3', function (itemStoreArray, functionAreaRow) {

                        async.eachSeries(itemStoreArray, function (element, callback) {

                            var query = {'_id': element, 'activeStatus': 1};
                            var update = {'$set': {'currentActivityStatus': 'IN-TRANSIT'}, '$unset': {'locationStoreId': 1}};

                            itemStoreModel.update(query, update, function (err) {
                                if (err)
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                else
                                    setImmediate(callback);
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                if (itemType == 'ITEMCODE') {

                                    flowController.emit('4', itemStoreArray);
                                } else {

                                    flowController.emit('LOGS');
                                    flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    });

                    // update Pick Sublist with new itemStore (For ITEMCODE)
                    flowController.on('4', function (itemStoreArray) {

                        var query = {'_id': inwardSubListId, 'activeStatus': 1};
                        var update = {'$set': {'itemStoreId': itemStoreArray, 'serialNumberArray': serialNumberArray}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                            }
                        });
                    });

                    // Update transactional logs
                    flowController.on('LOGS', function () {

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                            var transactionId = inwardSubListRow.transactionalLogId;

                            var lotAddressArray = [];

                            async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {

                                itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                                    object.activity = 'PICK Activity in progress!';

                                    transactionalLogService.addTransactionToLogs(2008, object, function (err, logsRecord) {
                                        if (err) {

                                            console.log('Error while adding transactions to logs');
                                        } else {

                                            console.log('Transactional logs updated in to system.');
                                        }
                                    });
                                }
                            });
                        });
                    });

                    // END
                    flowController.on('END', function (result) {

                        res.json(result);
                    });

                    // ERROR
                    flowController.on('ERROR', function (error) {
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // Initialize
                    flowController.emit('START');
                }
            });
        });
//
// Step 3 - Drop Location scan
router.route('/v1/processMaster/mobile/inwardSubList/action/update-partial/drop-location/location-scan/')

        .patch(function (req, res) {

            var showConsole = 0;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var status = req.body.status;
            var endedBy = req.body.endedBy;
            var pickActiveTime = req.body.pickActiveTime;
            var lot = parseInt(req.body.lot);
            var deviceId = req.body.deviceId.trim();
            var dropLocation = req.body.dropLocation;
            var inwardSubListId = req.body.inwardSubListId;
            var baseUrl = req.body.baseUrl.trim();

            flowController = new EventEmitter();

            locationStoreModel.findOne({'customerAddress': dropLocation, 'availability': 'A', 'activeStatus': 1}).exec(function (err, locationStoreRow) {
                if (err) {

                    res.json({message: 'INTERNAL SERVER ERROR' + err, status: 'error', statusCode: '500'});
                } else if (locationStoreRow == null) {

                    res.json({message: "Drop location " + dropLocation + " is blocked/not available! Choose different one.", status: 'error', statusCode: '500'});
                } else {

                    // Check if drop location change request is made or not
                    flowController.on('VALIDATE_DROP_LOCATION', function () {

                        (showConsole) ? console.log('VALIDATE_DROP_LOCATION') : '';

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (inwardSubListRow == null) {

                                flowController.emit('ERROR', {message: 'No line items available for this picklist in system.', status: 'error', statusCode: '304'});
                            } else {

                                if (inwardSubListRow.dropLocationAddress == dropLocation) {

                                    flowController.emit('FINAL_UPDATE');
                                } else {

                                    flowController.emit('VALIDATE_0_HOLDINGTYPE', inwardSubListRow);
                                }
                            }
                        });
                    });

                    // Validate drop location as per rule engine
                    flowController.on('RULE_ENGINE', function (inwardSubListRow) {

                        (showConsole) ? console.log('RULE_ENGINE') : '';

                        if (inwardSubListRow.itemType != 'PALLET') {

                            flowController.emit('VALIDATE_0_HOLDINGTYPE', inwardSubListRow);
                        } else {
                            var dropLocation = req.body.dropLocation;

                            var palletType = inwardSubListRow.palletType;
                            var palletSize = inwardSubListRow.palletSize;

                            ruleEngineModel.findOne({'location': dropLocation, 'activeStatus': 1}, function (err, ruleEngineRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (ruleEngineRow == null) {

                                    flowController.emit('ERROR', {message: "Drop location " + dropLocation + " not available in Rule Engine!", status: 'error', statusCode: '404'});
                                } else {
                                    if (ruleEngineRow.palletType.indexOf(palletType) == -1 || ruleEngineRow.palletSize.indexOf(palletSize) == -1) {

                                        flowController.emit('ERROR', {message: "Location not eligible for PUT! Allowed Pallet Types are: " + ruleEngineRow.palletType + " & Pallet Sizes are: " + ruleEngineRow.palletSize, status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('VALIDATE_0_HOLDINGTYPE', inwardSubListRow);
                                    }
                                }
                            });
                        }
                    });

                    // Check
                    flowController.on('VALIDATE_0_HOLDINGTYPE', function (pickSublistRow) {

                        (showConsole) ? console.log('VALIDATE_0_HOLDINGTYPE') : '';

                        var dropLocationHoldingType = locationStoreRow.holdingType;

                        holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                            } else if (holdingTypeRow == null) {

                                flowController.emit('ERROR', {message: "Drop location's Holding type details for drop location " + dropLocation + " not available!", status: 'error', statusCode: '404'});
                            } else {

                                holdingType = holdingTypeRow.name;
                                itemType = pickSublistRow.itemType;

                                if (itemType == 'PALLET') {

                                    if (holdingType != 'PALLET') {

                                        if (holdingType != 'ANY') {

                                            flowController.emit('ERROR', {message: "Pallet not allowed to be put at location " + dropLocation + " as the location is a Non-Pallet location! However, you can allow pallets to be dropped here by changing the properties of " + dropLocation + " in Location Master.", status: 'error', statusCode: '404'});
                                        } else {

                                            flowController.emit('VALIDATE_1_LOCATIONCAPACITY', pickSublistRow);
                                        }
                                    } else {

                                        flowController.emit('VALIDATE_1_LOCATIONCAPACITY', pickSublistRow);
                                    }
                                }

                                if (itemType == 'ITEMCODE' || itemType == 'SERIALNUMBER') {

                                    if (holdingType == 'PALLET') {

                                        flowController.emit('ERROR', {message: "Location: " + dropLocation + " holds Pallets only! Loose boxes are not allowed here. However, you can allow loose box here by changing the properties of " + dropLocation + " in Location Master.", status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('VALIDATE_1_LOCATIONCAPACITY', pickSublistRow);
                                    }
                                }
                            }
                        });
                    });

                    // Location properties available at drop location or not
                    flowController.on('VALIDATE_1_LOCATIONCAPACITY', function (pickSublistRow) {

                        (showConsole) ? console.log('VALIDATE_1_LOCATIONCAPACITY') : '';

                        var length = locationStoreRow.locationProperties.length;

                        if (length == 0) {

                            flowController.emit('ERROR', {message: "Capacity of the location not defined yet.", status: 'error', statusCode: '404'});
                        } else {

                            var userDefinedCapacity = locationStoreRow.locationProperties[0].userDefinedCapacity;

                            if (userDefinedCapacity != "") {

                                if (userDefinedCapacity == '-1') {

                                    flowController.emit('GET_ITEMMASTER', pickSublistRow);
                                } else {

                                    var availableCapacity = locationStoreRow.availableCapacity;

                                    (showConsole) ? console.log('available quantity: ' + availableCapacity) : '';

                                    var pickedQuantity = pickSublistRow.pickedQuantity;

                                    if (availableCapacity < pickedQuantity) {

                                        flowController.emit('ERROR', {message: "Available capacity at drop location is not sufficient! Current available capacity: " + availableCapacity, status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('VALIDATE_2_SCHEDULED_DROP_PUT', pickSublistRow, availableCapacity);
                                    }
                                }
                            } else {
                                // capacity calculation part
                                flowController.emit('ERROR', {message: "Location expect system defined calculation for capacity. Coming Soon.", status: 'error', statusCode: '404'});
                            }
                        }
                    });

                    // Check if any PUTLIST's drop scheduled at this location
                    flowController.on('VALIDATE_2_SCHEDULED_DROP_PUT', function (pickSublistRow, availableCapacity) {

                        (showConsole) ? console.log('VALIDATE_2_SCHEDULED_DROP_PUT') : '';

                        var dropLocationId = String(locationStoreRow._id);

                        putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, putSubListRow) {

                            if (putSubListRow.length == 0) {

                                flowController.emit('VALIDATE_2_SCHEDULED_DROP_PICK', pickSublistRow, availableCapacity, 0);
                            } else {

                                availableCapacity = locationStoreRow.availableCapacity;

                                var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                                var remaining = availableCapacity - suggestedCount;

                                //(showConsole) ? console.log('available quantity after PUT: ' + remaining) : '';

                                if (remaining >= pickSublistRow.pickedQuantity) {

                                    flowController.emit('VALIDATE_2_SCHEDULED_DROP_PICK', pickSublistRow, availableCapacity, suggestedCount);
                                } else {

                                    flowController.emit('ERROR', {message: "Location capacity is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining, status: 'error', statusCode: '500'});
                                }
                            }
                        });
                    });

                    // Check if any PICKLIST's drop scheduled at this location
                    flowController.on('VALIDATE_2_SCHEDULED_DROP_PICK', function (pickSublistRow, availableCapacity, putReservedCapacity) {

                        (showConsole) ? console.log('VALIDATE_2_SCHEDULED_DROP_PICK') : '';

                        var dropLocationId = String(locationStoreRow._id);

                        inwardSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, inwardSubListRow2) {

                            if (inwardSubListRow2.length == 0) {

                                flowController.emit('GET_ITEMMASTER', pickSublistRow);
                            } else {

                                var totalPickReservedCapacity = 0;

                                async.eachSeries(inwardSubListRow2, function (element, callback) {

                                    totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                    setImmediate(callback);

                                }, function (err) {

                                    availableCapacity = locationStoreRow.availableCapacity;

                                    var suggestedCount = totalPickReservedCapacity;

                                    var remaining = ((availableCapacity - suggestedCount) - putReservedCapacity);

                                    //(showConsole) ? console.log('available quantity after PICK: ' + remaining) : '';

                                    if (remaining >= pickSublistRow.pickedQuantity) {

                                        flowController.emit('GET_ITEMMASTER', pickSublistRow);
                                    } else {

                                        flowController.emit('ERROR', {message: "Drop location capacity is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity: " + remaining, status: 'error', statusCode: '500'});
                                    }
                                });
                            }
                        });
                    });

                    // Get item master details
                    flowController.on('GET_ITEMMASTER', function (inwardSubListRow) {

                        (showConsole) ? console.log('GET_ITEMMASTER') : '';

                        var itemCode = inwardSubListRow.itemCode;

                        itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow == null) {

                                flowController.emit('ERROR', {message: "No item master for item " + itemCode + " available in system.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('GET_VALID_PICK_FUNCTIONS', itemMasterRow, inwardSubListRow);
                            }
                        });
                    });
                    //
                    // Get valid pick process functions
                    flowController.on('GET_VALID_PICK_FUNCTIONS', function (itemMasterRow, inwardSubListRow) {

                        (showConsole) ? console.log('GET_VALID_PICK_FUNCTIONS') : '';

                        functionAreaArray = [];

                        var query = {};
                        query.name = (inwardSubListRow.itemType === 'ITEMCODE') ? {'$in': ['STORAGE']} : {'$in': ['REPROCESS', 'STORAGE']};
                        query.activeStatus = 1;

                        functionAreaModel.find(query).lean().exec(function (err, functionAreaRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: 'Function area details not available in system.', status: 'error', statusCode: '200'});
                            } else {

                                async.eachSeries(functionAreaRow, function (element, callback) {

                                    functionAreaArray.push(String(element._id));
                                    setImmediate(callback);
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', err);
                                    } else {

                                        flowController.emit('GET_VALID_DROP_FUNCTIONS', itemMasterRow, inwardSubListRow, functionAreaArray);
                                    }
                                });
                            }
                        });
                    });
                    // if the activity is in same area then this flow has to be considered
                    // VALIDATE_ITEM_RESERVATION
                    flowController.on('GET_VALID_DROP_FUNCTIONS', function (itemMasterRow, inwardSubListRow, pickFunctionArea) {

                        (showConsole) ? console.log('GET_VALID_DROP_FUNCTIONS') : '';

                        dropFunctionArea = [];

                        functionAreaModel.distinct('_id', {'name': {'$in': ['STORAGE', 'DISPATCH', 'REPROCESS', 'SCRAP']}}).exec(function (err, functionAreaMongoIdRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaMongoIdRow.length == 0) {

                                flowController.emit('ERROR', {message: "Pick process function areas not available in system.", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(functionAreaMongoIdRow, function (element, callback) {

                                    dropFunctionArea.push(String(element));
                                    setImmediate(callback);
                                }, function (err) {
                                    if (err) {
                                        flowController.emit('ERROR', err);
                                    } else {
                                        flowController.emit('VALIDATE_FUNCTIONS', itemMasterRow, inwardSubListRow, pickFunctionArea, dropFunctionArea);
                                    }
                                });
                            }
                        });
                    });
                    //
                    // Validate Pick & Drop in same area or not
                    flowController.on('VALIDATE_FUNCTIONS', function (itemMasterRow, inwardSubListRow, pickFunctionArea, dropFunctionArea) {

                        dropLocationFunction = locationStoreRow.function;

                        if (dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                            // Drop location function does not belongs to valid pick process drop functions
                            flowController.emit('ERROR', {message: "Drop location not allowed under valid Pick process drop zones.", status: 'error', statusCode: '404'});
                        } else {

                            if (pickFunctionArea.indexOf(dropLocationFunction) > -1) {
                                // Pick between same area
                                flowController.emit('VALIDATE_ITEM_RESERVATION', itemMasterRow, inwardSubListRow);
                            } else {

                                flowController.emit('UPDATE_DROP_LOCATION_TO_PICKSUBLIST', inwardSubListRow);
                            }
                        }
                    });
                    //
                    //
                    flowController.on('VALIDATE_ITEM_RESERVATION', function (itemMasterRow, inwardSubListRow) {

                        (showConsole) ? console.log('VALIDATE_ITEM_RESERVATION') : '';

                        var itemMasterId = String(itemMasterRow._id);

                        if (locationStoreRow.isReservedForItem == 'YES') {

                            if (locationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                                if (locationStoreRow.reservedItemId.length > 1) {

                                    flowController.emit('VALIDATE_ELIGIBILITY', itemMasterRow, inwardSubListRow);

                                } else {
                                    //
                                    flowController.emit('UPDATE_DROP_LOCATION_TO_PICKSUBLIST', itemMasterRow, inwardSubListRow);
                                }
                            } else {
                                //
                                flowController.emit('ERROR', {message: 'This location is reserved for different item! Choose different location.', status: 'error', statusCode: '403'});
                            }
                        } else {
                            //
                            flowController.emit('VALIDATE_ELIGIBILITY', itemMasterRow, inwardSubListRow);
                        }
                    });
                    //
                    // VALIDATE_ELIGIBILITY Check eligibility if item is not reserved but present or not OR empty location
                    flowController.on('VALIDATE_ELIGIBILITY', function (itemMasterRow, inwardSubListRow) {

                        (showConsole) ? console.log('VALIDATE_ELIGIBILITY') : '';

                        if (locationStoreRow.assignedItemStoreId.length > 0) {

                            conflictArray = [];

                            async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

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
                                if (err)
                                    flowController.emit('ERROR', err);
                                else if (conflictArray.length != 0)
                                    flowController.emit('ERROR', {message: 'Drop location ' + dropLocation + ' contain exclusive items! Choose different location.', status: 'error', statusCode: '403'});
                                else if (itemMasterRow.exclusiveStorage === 'YES')
                                    flowController.emit('ERROR', {message: 'This item is exclusive and not allowed to be placed at shared location! Choose different location.', status: 'error', statusCode: '403'});
                                else
                                    flowController.emit('UPDATE_DROP_LOCATION_TO_PICKSUBLIST', itemMasterRow, inwardSubListRow);
                            });
                        } else {

                            flowController.emit('UPDATE_DROP_LOCATION_TO_PICKSUBLIST', itemMasterRow, inwardSubListRow);
                        }
                    });
                    //
                    // LOC_CHANGE - Update drop location to line items  
                    flowController.on('UPDATE_DROP_LOCATION_TO_PICKSUBLIST', function (inwardSubListRow) {

                        (showConsole) ? console.log('UPDATE_DROP_LOCATION_TO_PICKSUBLIST') : '';

                        var dropLocationId = String(locationStoreRow._id);
                        var dropLocationAddress = locationStoreRow.customerAddress;

                        var query = {'_id': inwardSubListId};
                        var update = {'$set': {'dropLocationId': dropLocationId, 'dropLocationAddress': dropLocationAddress}};

                        inwardSubListModel.update(query, update, function (err) {
                            if (err) {
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                if (status === 31) {

                                    flowController.emit('FINAL_UPDATE');
                                } else {

                                    flowController.emit('END', {message: "Operation successful! No further updates.", status: 'success', statusCode: '200'});
                                }
                            }
                        });
                    });
                    //
                    // Final update to line item
                    flowController.on('FINAL_UPDATE', function () {

                        (showConsole) ? console.log('FINAL_UPDATE') : '';

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (inwardSubListRow == null) {

                                res.json({message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                            } else {

                                var query = {'_id': inwardSubListId};
                                var update = {'$set': {'status': 31, 'timeEnded': timeInInteger, 'endedBy': endedBy}};

                                inwardSubListModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});

                                    } else {

                                        flowController.emit('UPDATE_TIMECOUNT', inwardSubListRow);
                                    }
                                });
                            }
                        });
                    });
                    //
                    // Update timecount of sublist
                    flowController.on('UPDATE_TIMECOUNT', function (inwardSubListRow) {

                        (showConsole) ? console.log('UPDATE_TIMECOUNT') : '';

                        var inwardListId = inwardSubListRow.inwardListId;

                        var query = {'_id': inwardListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                        var update = {'$set': {'resourceAssigned.$.pickActiveTime': pickActiveTime}};

                        inwardListModel.update(query, update, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('UPDATE_LOCATION', inwardSubListRow);
                        });
                    });
                    //
                    // Add items to new location
                    flowController.on('UPDATE_LOCATION', function (inwardSubListRow) {

                        (showConsole) ? console.log('UPDATE_LOCATION') : '';

                        var itemStoreId = inwardSubListRow.itemStoreId;

                        var dropLocationId = inwardSubListRow.dropLocationId;

                        var dummyObject = [];

                        itemStoreId.forEach(function (element) {

                            var query = {'_id': dropLocationId, 'activeStatus': 1};
                            var update = {'$push': {'assignedItemStoreId': element}};

                            locationStoreModel.update(query, update, function (err) {

                                if (err) {

                                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    dummyObject.push({process: 'done'});

                                    if (dummyObject.length === itemStoreId.length) {

                                        flowController.emit('UPDATE_DROP_LOCATION_CAPACITY', inwardSubListRow);
                                    }
                                }
                            });
                        });
                    });
                    //
                    // Update available quantity at location store if it is user defined
                    flowController.on('UPDATE_DROP_LOCATION_CAPACITY', function (inwardSubListRow) {

                        (showConsole) ? console.log('UPDATE_DROP_LOCATION_CAPACITY') : '';

                        var dropLocationId = inwardSubListRow.dropLocationId;

                        locationStoreModel.findOne({'_id': dropLocationId, 'activeStatus': 1}, function (err, locationStoreRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                dropLocationFunction = locationStoreRow.function;

                                functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                                    if (err) {

                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (functionAreaRow == null) {

                                        flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                                    } else {
                                        // Ignore capacity as capacity does not matter here
                                        if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {

                                            flowController.emit('UPDATE_ITEMSTORE', inwardSubListRow, functionAreaRow);
                                            //} else if (inwardSubListRow.itemType == 'PALLET' && inwardSubListRow.palletType == 'O') {
                                            // If pickActiveTime is PALLET & from REPROCESS & Drop is at STORAGE then capacity must be bypassed
                                            //    flowController.emit('UPDATE_ITEMSTORE', functionAreaRow);
                                        } else {

                                            var in_Array = 'availableCapacity' in locationStoreRow;

                                            if (in_Array) {

                                                var capacityToBeReduced = inwardSubListRow.requiredQuantity;

                                                var locationCapacity = locationStoreRow.availableCapacity;

                                                var availableCapacity = locationCapacity - capacityToBeReduced;

                                                locationStoreRow.availableCapacity = availableCapacity;

                                                locationStoreRow.save(function (err) {
                                                    if (err) {

                                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        flowController.emit('UPDATE_ITEMSTORE', inwardSubListRow, functionAreaRow);
                                                    }
                                                });
                                            } else {

                                                flowController.emit('UPDATE_ITEMSTORE', inwardSubListRow, functionAreaRow);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });
                    //
                    // update item store for in transit
                    flowController.on('UPDATE_ITEMSTORE', function (inwardSubListRow, functionAreaRow) {

                        (showConsole) ? console.log('UPDATE_ITEMSTORE') : '';

                        var itemStoreId = inwardSubListRow.itemStoreId;

                        var dropLocationFunctionArea = functionAreaRow.name;

                        async.eachSeries(itemStoreId, function (element, callback) {

                            var query = {'_id': element, 'activeStatus': 1};

                            if (dropLocationFunctionArea === 'REPROCESS') {

                                var update = {
                                    '$set': {'locationStoreId': inwardSubListRow.dropLocationId, 'currentActivityStatus': 'PICK-COMPLETED'},
                                    '$unset': {'customPalletNumber': 1}
                                };
                            } else if (dropLocationFunctionArea === 'DISPATCH') {

                                var update = {'$set': {'locationStoreId': inwardSubListRow.dropLocationId, 'currentActivityStatus': 'PICK-COMPLETED', 'activeStatus': 4}};
                            } else {

                                var update = {'$set': {'locationStoreId': inwardSubListRow.dropLocationId, 'currentActivityStatus': 'PICK-COMPLETED'}};
                            }

                            itemStoreModel.update(query, update, function (err) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                console.log('Error occurred: ' + err);
                            } else {

                                flowController.emit('MINIMUM_INVENTORY_ALERT', itemStoreId[0]);
                            }
                        });
                    });
                    //
                    // Check for Minimum inventory
                    flowController.on('MINIMUM_INVENTORY_ALERT', function (itemStoreIdForAlert) {

                        (showConsole) ? console.log('MINIMUM_INVENTORY_ALERT') : '';
                        var itemMasterId;

                        itemStoreModel.findOne({'_id': itemStoreIdForAlert}, function (err, itemStoreRow) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                if (err)
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                var itemMasterSystemSpecification = itemMasterRow.itemSystemSpecification;
                                var minInventoryAlert;
                                if (itemMasterSystemSpecification.length > 0)
                                    minInventoryAlert = itemMasterSystemSpecification[0].minInventoryAlert;

                                var warehouseId = itemMasterRow.warehouseId;
                                var itemCode = itemMasterRow.itemCode;

                                if (minInventoryAlert != "") {
                                    itemStoreModel.find({'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRows) {
                                        if (err)
                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

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
                                exportPickSubListDataToCybernatic(baseUrl, inwardSubListId);
                                flowController.emit('LOGS');
                                flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                            });
                        });
                    });
                    //
                    // Update transactional logs
                    flowController.on('LOGS', function () {

                        flowController.emit('UPDATE-USER-CAPACITY');

                        inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                            var transactionId = inwardSubListRow.transactionalLogId;

                            var lotAddressArray = [];

                            async.eachSeries(inwardSubListRow.itemStoreId, function (element, callback) {
                                // dont add activeStatus:1 in query as lot address if sent to dispatch will not get in query
                                itemStoreModel.findOne({'_id': element}, function (err, itemStoreRow) {

                                    if (err) {

                                        setImmediate(callback);
                                    } else if (itemStoreRow == null) {

                                        console.log('LOT ADDRESS NOT FOUND: ' + element);
                                        setImmediate(callback);
                                    } else {

                                        lotAddressArray.push(itemStoreRow.lotAddress);
                                        setImmediate(callback);
                                    }
                                });
                            }, function (err) {
                                if (err) {

                                    console.log('Error while getting lot addresses: ' + err);
                                } else {

                                    var object = {};
                                    object.transactionalId = transactionId;
                                    object.lotAddress = lotAddressArray;
                                    object.activity = 'PICK Activity in progress!';

                                    transactionalLogService.addTransactionToLogs(2009, object, function (err, logsRecord) {
                                        if (err) {

                                            console.log('Error while adding transactions to logs');
                                        } else {

                                            console.log('Transactional logs updated in to system.');
                                        }
                                    });
                                }
                            });
                        });
                    });
                    //
                    // userCapacity update
                    flowController.on('UPDATE-USER-CAPACITY', function () {

                        userModel.findOne({'_id': endedBy, 'activeStatus': 1}, function (err, userRow) {

                            if (err) {
                                // error while adding records
                                console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                console.log({message: 'Data missing! User details modified/deleted from the system!', status: 'error', statusCode: '304'});
                            } else {

                                var query = {'_id': endedBy};

                                var count = (userRow.doneCount) + 1;

                                console.log("count= " + count);

                                var update = {'$set': {'doneCount': count}};

                                userModel.update(query, update, function (err) {
                                    if (err) {

                                        console.log({message: "Unable to make update! Try again after some time." + err, status: 'error', statusCode: '500'});
                                    } else {
                                        console.log(userRow.doneCount + " " + userRow.targetCapacity);
                                        if (userRow.doneCount >= userRow.targetCapacity) {

                                            alertsModel.find({"users": {$elemMatch: {'status': {$in: [0, 1]}}}, "id": userRow._id, "module": "USERS", 'activeStatus': 1}, function (err, alertModelRow) {

                                                if (err) {
                                                    // error while adding records
                                                    console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                                } else if (alertModelRow.length != 0) {

                                                    console.log({message: 'Operation successful!', status: 'success', statusCode: '200'});
                                                } else {

                                                    var firstName = (userRow.firstName).charAt(0).toUpperCase() + (userRow.firstName).slice(1);
                                                    var lastName = (userRow.lastName).charAt(0).toUpperCase() + (userRow.lastName).slice(1);
                                                    var userName = firstName + ' ' + lastName;

                                                    var dataObject = {
                                                        warehouseId: userRow.warehouseId,
                                                        textName: "User Capacity Overflow",
                                                        module: "USERS",
                                                        name: userName,
                                                        id: endedBy
                                                    };
                                                    alertService.createAlert(dataObject);
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });
                    //
                    // END
                    flowController.on('END', function (result) {

                        (showConsole) ? console.log('END') : '';
                        currentActivityStatusFunction('PICK', inwardSubListId, 'PICK - Done(Manual)');
                        res.json(result);
                    });
                    //
                    // ERROR
                    flowController.on('ERROR', function (error) {

                        (showConsole) ? console.log('ERROR') : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });
                    //
                    // Initialize
                    flowController.emit('VALIDATE_DROP_LOCATION');
                }
            });
        });
//
// Update manual override reason
router.route('/v1/processMaster/mobile/inwardSubList/action/update-inwardSubList/manual-override-reason/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var step = req.body.step;
            var dropLocation = req.body.dropLocation;
            var reason = req.body.reason;
            var inwardSubListId = req.body.inwardSubListId;

            var query = {'_id': inwardSubListId};
            var update = {'$addToSet': {'manualOverrideReason': {'dropLocation': dropLocation, 'reason': reason, 'step': step, time: timeInInteger}}};

            inwardSubListModel.update(query, update, function (err) {
                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else {

                    res.json({message: 'Operation successful', status: 'success', statusCode: '200'});
                }
            });
        });
// Step End
//
//
router.route('/v1/processMaster/mobile/inwardSubList/action/update-outer/drop-location/location-scan/')

        .patch(function (req, res) {

        });

function exportPickSubListDataToCybernatic(baseUrl, inwardSubListId) {

    var requestifyUrl = baseUrl + '/v1/processMaster/web/inwardList/action/create/manual-export/';

    data = {inwardSubListId: inwardSubListId};

    requestify.post(requestifyUrl, data).then(function (response) {

        var result = response.getBody();

        if (result.status === 'success')
            console.log(inwardSubListId + 'Pick export complete: ' + result.message);

        if (result.status === 'error')
            console.log('Error while exporting pick data: ' + result.message);
    });
}
//
var currentActivityStatusFunction = function (model, inwardSubListId, status) {

    currentActiveStatusService.setCurrentActivityStatus(model, inwardSubListId, status, function (err, records) {
        if (err) {
            console.log(err);
        } else {
            console.log('Current activity status update. Status: ' + records);
        }
    });
};
//
module.exports = router;