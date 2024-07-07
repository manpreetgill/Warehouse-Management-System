var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var intersection = require('array-intersection');
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var requestify = require('requestify');
var fs = require('fs');
var intersection = require('array-intersection');
var appJs = require('../../../app.js');
//---------------------------------------------------------------------------------------------------------------------------
var pathPickSubList = './logs/dailyLog/pickSubListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var function_locationStoreService = require('../../../service-functions/functions-locationStoreService');
var function_pickSubListService = require('../../../service-functions/functions-pickSubListService');
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get Pick-Sublist     
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/read/pickSubList/:pickListId/')

        .get(function (req, res, next) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var pickListId = req.params.pickListId.trim();

            var pickSubListArray = [];

            var flowController = new EventEmitter();
            //pickSubList
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).sort({sequence: 1}).exec(function (err, pickSubListRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: "No line items available!", data: [], status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(pickSubListRow, function (element, callback) {

                            var pickSublist = {
                                pickSubListId: element._id,
                                resourceAssigned: element.resourceAssigned,
                                sequence: element.sequence,
                                itemType: element.itemType,
                                itemValue: element.itemValue,
                                palletNumber: (element.palletNumber) ? element.palletNumber : '',
                                customPalletNumber: (element.customPalletNumber) ? element.customPalletNumber : '',
                                palletType: (element.palletType) ? element.palletType : '',
                                palletSize: (element.palletSize) ? element.palletSize : '',
                                itemCode: element.itemCode,
                                itemDescription: element.itemDescription,
                                requiredQuantity: element.requiredQuantity,
                                pickedQuantity: element.pickedQuantity,
                                pickedLocation: element.pickLocationAddress,
                                dropLocation: element.dropLocationAddress,
                                status: element.status
                            };
                            pickSubListArray.push(pickSublist);
                            setImmediate(callback);

                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', pickSubListArray);
                                //res.json({message: "Operation Successful.", data: pickSubListArray, status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            //
            flowController.on('1', function (pickSubList) {

                (consoleLog) ? console.log('1') : '';

                var pickSubArray = [];
                async.eachSeries(pickSubList, function (element, callback) {

                    if (element.resourceAssigned.length == 0) {

                        element.deviceName = '';
                        pickSubArray.push(element);
                        setImmediate(callback);
                    } else {
                        deviceMasterModel.findOne({'_id': element.resourceAssigned[0].deviceId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (deviceMasterRow == null) {
                                element.deviceName = '';
                                pickSubArray.push(element);
                                setImmediate(callback);
                            } else {

                                element.deviceId = deviceMasterRow._id;
                                element.deviceName = deviceMasterRow.name;
                                pickSubArray.push(element);
                                setImmediate(callback);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('2', pickSubArray);
                    }
                });
            });

            //
            flowController.on('2', function (pickSubArray) {
                (consoleLog) ? console.log('2') : '';

                var date = moment(new Date()).format('DD/MM/YY');
                var pickSubUserArray = [];

                async.eachSeries(pickSubArray, function (element, callback) {

                    devicesTrackingModel.findOne({'deviceId': element.deviceId, 'date': date, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var userId = (deviceTrackingRow != null) ? (deviceTrackingRow.status != 'LOGOUT') ? deviceTrackingRow.userId : "" : "";

                            element.userId = userId;
                            pickSubUserArray.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', pickSubUserArray);
                    }
                });
            });

            //username
            flowController.on('3', function (pickSubUserArray) {
                (consoleLog) ? console.log('3') : '';

                var deviceObjectArray = [];

                async.eachSeries(pickSubUserArray, function (element, callbackDone2) {

                    if (element.userId == "") {

                        deviceObjectArray.push(element);
                        callbackDone2();
                    } else {

                        usersModel.findOne({'_id': element.userId, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {
                                element.userName = '';
                                deviceObjectArray.push(element);
                                callbackDone2();
                            } else {

                                element.userName = userRow.firstName + ' ' + userRow.lastName;

                                deviceObjectArray.push(element);

                                callbackDone2();
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', deviceObjectArray);
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                res.json({message: "Operation Successful.", data: result, 'status': 'success', 'statusCode': 200});
            });

            // ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//                
//----------------------------------------------------------------------------------------------------------------------------        
// GBL Specific - Display all zone
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/read/all-zone/')

        .post(function (req, res, next) {

            var consoleProcess = 0;

            (consoleProcess) ? console.log(req.body) : '';

            var palletNumber = req.body.palletNumber.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var requiredQuantity = req.body.requiredQuantity.trim();

            var selectedMHE = req.body.selectedMHE;

            var functionAreaArray = [];// In use

            var holdingTypeArray = [];

            var flowController = new EventEmitter();

            itemStoreModel.findOne({'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStoreRow) {

                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (itemStoreRow == null) {

                    res.json({message: 'Pallet No. ' + palletNumber + ' not available in warehouse.', status: 'error', statusCode: '304'});
                } else {

                    palletType = itemStoreRow.randomFields[0].palletType;

                    palletSize = itemStoreRow.randomFields[0].palletSize;

                    // Get the Function Area array
                    flowController.on('START', function () {

                        (consoleProcess) ? console.log('START') : '';

                        functionAreaModel.find({'name': {'$in': ['STORAGE', 'DISPATCH', 'REPROCESS', 'SCRAP']}, 'activeStatus': 1}).lean().exec(function (err, functionAreaRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area data missing! Contact warehouse administrator", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(functionAreaRow, function (element, callback) {

                                    functionAreaArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('0');
                                });
                            }
                        });
                    });

                    // Get Holding type PALLET Details
                    flowController.on('0', function () {

                        (consoleProcess) ? console.log('0') : '';

                        holdingTypeModel.find({'name': {'$in': ['PALLET', 'ANY']}, 'activeStatus': 1}).lean().exec(function (err, holdingTypePalletRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypePalletRow == null) {

                                flowController.emit('ERROR', {message: "Function area data missing! Contact warehouse administrator", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(holdingTypePalletRow, function (element, callback) {

                                    holdingTypeArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('1');
                                });
                            }
                        });
                    });
                    //
                    // Get locations from rule engine matching criteria
                    flowController.on('1', function () {

                        (consoleProcess) ? console.log('1') : '';

                        var customerAddressArray = [];

                        var zoneArray = [];

                        var P1 = {'$match': {palletType: palletType, palletSize: palletSize, activeStatus: 1}};
                        var P2 = {'$lookup': {from: "transactionalData-locationStores", localField: "location", foreignField: "customerAddress", as: "locationStore"}};
                        var P3 = {'$unwind': {path: "$locationStore"}};
                        if (selectedMHE != '')
                            var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.materialHandlingUnitId': selectedMHE, 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
                        else
                            var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
                        var P5 = {'$sort': {location: 1}};
                        var P6 = {'$project': {zone: 1, location: 1, availability: '$locationStore.availability', capacity: '$locationStore.availableCapacity', holdingType: '$locationStore.holdingType', function: '$locationStore.function'}};

                        ruleEngineModel.aggregate([P1, P2, P3, P4, P5, P6],
                                function (err, result) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        async.eachSeries(result, function (element, callback) {

                                            customerAddressArray.push(element.location);

                                            if (zoneArray.indexOf(element.zone) == -1) {

                                                zoneArray.push(element.zone);
                                            }

                                            setImmediate(callback);

                                        }, function (err) {

                                            flowController.emit('2', customerAddressArray, zoneArray);
                                        });
                                    }
                                });
                    });

                    // Get the master data of this item
                    flowController.on('2', function (customerAddressArray, zoneArray) {

                        (consoleProcess) ? console.log('2') : '';

                        itemMasterModel.findOne({'_id': itemStoreRow.itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                            if (err) {
                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow == null) {

                                flowController.emit('error', {message: 'No records for item master found!', status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('3', customerAddressArray, zoneArray, itemMasterRow);
                            }
                        });

                    });

                    // Filter & out locations reserved for items other than required item
                    flowController.on('3', function (customerAddressArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('3') : '';

                        filteredLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(customerAddressArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {
                                    // Location not available in warehouse
                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {
                                    // Location doesn't belongs to allowed put function areas 
                                    filteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    // Location capacity not sufficient for put
                                    setImmediate(callback);
                                } else if (holdingTypeArray.indexOf(locationStoreRow.holdingType) == -1) {
                                    // Location holding type is other than pallet...Ignore
                                    setImmediate(callback);
                                } else {

                                    if (locationStoreRow.isReservedForItem === 'YES') {

                                        if (locationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                                            filteredLocationArray.push(element);
                                            setImmediate(callback);
                                        } else {

                                            setImmediate(callback);
                                        }

                                    } else {

                                        filteredLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', err);
                            } else {

                                if (filteredLocationArray.length == 0) {

                                    flowController.emit('error', {message: 'No locations available with sufficient capacity! Can not proceed further.', status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('4', filteredLocationArray, zoneArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Filter & out locations exclusive for other items
                    // Filter & in locations reserved for required item
                    // Filter & in blank locations
                    // Filter & in shared locations
                    flowController.on('4', function (customerAddressArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('4') : '';

//                        console.log(customerAddressArray);
//                        console.log(zoneArray);

                        var newFilteredLocationArray = [];

                        var otherItemArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(customerAddressArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'isReservedForItem': 'NO', 'assignedItemStoreId.0': {'$exists': true}, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {
                                    // Blank locations
                                    newFilteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    newFilteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {

                                    setImmediate(callback);
                                } else {

                                    var sameItemObject = [];
                                    var otherItemObject = [];

                                    assignItemStoreArray = locationStoreRow.assignedItemStoreId;

                                    async.eachSeries(assignItemStoreArray, function (element2, callback2) {

                                        itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                            if (err) {

                                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {
                                                // Check if item present here is same as item in putsublist
                                                if (itemStoreRow.itemMasterId == itemMasterId) {

                                                    sameItemObject.push(element2);
                                                    setImmediate(callback2);
                                                } else {

                                                    otherItemObject.push(element2);
                                                    setImmediate(callback2);
                                                }
                                            }
                                        });
                                    }, function (err) {

                                        if (err) {

                                            callback(err);
                                        } else {

                                            if (sameItemObject.length === assignItemStoreArray.length) {
                                                // All same items
                                                newFilteredLocationArray.push(element);
                                                setImmediate(callback);
                                            } else if (otherItemObject.length === assignItemStoreArray.length) {
                                                // All other item
                                                otherItemArray.push(element);
                                                setImmediate(callback);
                                            } else {
                                                // Shared
                                                newFilteredLocationArray.push(element);
                                                setImmediate(callback);
                                            }
                                        }
                                    });
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', err);
                            } else {

//                                console.log(newFilteredLocationArray.length);
//                                console.log(otherItemArray.length);

                                if (newFilteredLocationArray.length === 0 && otherItemArray.length === 0) {
                                    // If required locations after filtering with conditions are not available & other locations also exclusive or not having capacity
                                    flowController.emit('error', {message: 'No suitable locations available in warehouse for Drop! Contact warehouse administrator.', status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('5', filteredLocationArray, zoneArray, otherItemArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Check out other item array and check exclusivity of those item if array is not empty
                    flowController.on('5', function (filteredLocationArray, zoneArray, otherItemArray, itemMasterRow) {

                        (consoleProcess) ? console.log('5') : '';
//
//                        console.log(filteredLocationArray);
//                        console.log(zoneArray);

                        if (otherItemArray.length == 0) {

                            flowController.emit('6', filteredLocationArray, zoneArray, itemMasterRow);
                        } else {

                            async.eachSeries(otherItemArray, function (element, callback) {

                                locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (locationStoreRow == null) {

                                        setImmediate(callback);
                                    } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                        if (filteredLocationArray.indexOf(element) == -1) {
                                            filteredLocationArray.push(element);
                                        }
                                        setImmediate(callback);
                                    } else if (locationStoreRow.availableCapacity < requiredQuantity) {

                                        setImmediate(callback);
                                    } else {

                                        var itemStoreId = locationStoreRow.assignedItemStoreId[0];

                                        itemStoreModel.count({'_id': itemStoreId, 'exclusiveStorage': 'YES', 'activeStatus': 1}, function (err, itemStoreRowCount) {

                                            if (itemStoreRowCount > 0) {

                                                setImmediate(callback);
                                            } else {

                                                var in_Array = filteredLocationArray.indexOf(element);

                                                if (in_Array == -1) {

                                                    filteredLocationArray.push(element);
                                                    setImmediate(callback);
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', err);
                                } else {

                                    flowController.emit('6', filteredLocationArray, zoneArray, itemMasterRow);
                                }
                            });
                        }
                    });

                    // Final execution logic
                    // Get reserved locations array
                    flowController.on('6', function (filteredLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('6') : '';

//                        console.log(filteredLocationArray);
//                        console.log(zoneArray);

                        var reservedLocationArray = [];

                        var otherLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(filteredLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    if (otherLocationArray.indexOf(element) == -1) {
                                        otherLocationArray.push(element);
                                    }
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {

                                    setImmediate(callback);
                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else {

                                    if (locationStoreRow.isReservedForItem === 'YES') {

                                        if (locationStoreRow.reservedItemId.length > 1) {

                                            if (locationStoreRow.assignedItemStoreId.length > 0) {

                                                conflictArray = [];

                                                async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                                    itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                                        if (itemStoreRow.itemMasterId == itemMasterId) {

                                                            setImmediate(callback2);
                                                        } else if (itemStoreRow.exclusiveStorage == 'YES') {

                                                            conflictArray.push(element);
                                                            setImmediate(callback2);
                                                        } else {

                                                            setImmediate(callback2);
                                                        }
                                                    });

                                                }, function (err) {

                                                    if (conflictArray.length != 0) {

                                                        setImmediate(callback);
                                                    } else if (itemMasterRow.exclusiveStorage == 'YES') {

                                                        setImmediate(callback);
                                                    } else {

                                                        reservedLocationArray.push(element);
                                                        setImmediate(callback);
                                                    }
                                                });
                                            } else {

                                                reservedLocationArray.push(element);
                                                setImmediate(callback);
                                            }
                                        } else {

                                            reservedLocationArray.push(element);
                                            setImmediate(callback);
                                        }
                                    } else {

                                        otherLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err)
                                flowController.emit('error', err);
                            else
                                flowController.emit('7', reservedLocationArray, otherLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // Get locations where item is present (item already present and adding the same item)
                    flowController.on('7', function (reservedLocationArray, otherLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('7') : '';

//                        console.log(reservedLocationArray);
//                        console.log(otherLocationArray);
//                        console.log(zoneArray);

                        var itemPresentLocationArray = [];

                        var remainingLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(otherLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    if (remainingLocationArray.indexOf(element) == -1) {
                                        remainingLocationArray.push(element);
                                    }
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    console.log('capacity: ' + element + ' not available');
                                    setImmediate(callback);
                                } else {

                                    var successObject = [];

                                    if (locationStoreRow.assignedItemStoreId.length != 0) {

                                        async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                            itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                                if (err) {
                                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                } else if (itemStoreRow.itemMasterId == itemMasterId) {

                                                    successObject.push({process: 'done'});

                                                    setImmediate(callback2);
                                                } else {

                                                    setImmediate(callback2);
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                console.log('Error at mid-interval execution!!!');
                                            } else {
                                                if (successObject.length > 0) {

                                                    itemPresentLocationArray.push(element);
                                                    setImmediate(callback);
                                                } else {
                                                    remainingLocationArray.push(element);
                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    } else {

                                        remainingLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err)
                                flowController.emit('error', err);
                            else
                                flowController.emit('8', reservedLocationArray, itemPresentLocationArray, remainingLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // process locations which are blank and location where required item is not present
                    flowController.on('8', function (reservedLocationArray, itemPresentLocationArray, remainingLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('8') : '';

//                        console.log(reservedLocationArray);
//                        console.log(itemPresentLocationArray);
//                        console.log(remainingLocationArray);
//                        console.log(zoneArray);

                        var exclusiveStorage = itemMasterRow.exclusiveStorage;

                        var overflowAutoAssign = itemMasterRow.overflowAutoAssign;

                        emptyAndSharedLocationArray = [];

                        async.eachSeries(remainingLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    if (emptyAndSharedLocationArray.indexOf(element) == -1) {
                                        emptyAndSharedLocationArray.push(element);
                                    }
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    console.log('capacity: ' + element + ' not available');
                                    setImmediate(callback);
                                } else {

                                    if (overflowAutoAssign == 'YES') {

                                        if (locationStoreRow.assignedItemStoreId.length != 0) {
                                            // required item is not present at this location
                                            if (exclusiveStorage == 'NO') {

                                                emptyAndSharedLocationArray.push(element);
                                                setImmediate(callback);
                                            } else {

                                                setImmediate(callback);
                                            }
                                        } else {
                                            // Empty locations
                                            emptyAndSharedLocationArray.push(element);
                                            setImmediate(callback);
                                        }
                                    } else {

                                        setImmediate(callback);
                                    }
                                }
                            });

                        }, function (err) {

                            if (err)
                                flowController.emit('error', err);
                            else
                                flowController.emit('9', reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // allowed location details
                    flowController.on('9', function (reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, zoneArray, itemMasterRow) {

//                        if (consoleProcess) {
//                            console.log('Reservation');
//                            console.log(reservedLocationArray);
//                            console.log('Present at locations');
//                            console.log(itemPresentLocationArray);
//                            console.log('Empty or shared location');
//                            console.log(emptyAndSharedLocationArray);
//                        }

                        var temp = reservedLocationArray.concat(itemPresentLocationArray);

                        combinedArray = temp.concat(emptyAndSharedLocationArray);

                        flowController.emit('10', combinedArray);

                    });

                    // Check if location is suggested to any other pick/put list
                    flowController.on('10', function (combinedArray) {

                        (consoleProcess) ? console.log('10') : '';

                        (consoleProcess) ? console.log('CombinedArray: ' + combinedArray) : '';

                        if (combinedArray.length == 0) {

                            flowController.emit('error', {location: combinedArray, message: 'No locations available', status: 'success', statusCode: '200'});
                        } else {

                            var finalResultArray = [];

                            async.eachSeries(combinedArray, function (element, callback) {

                                locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (locationStoreRow == null) {

                                        setImmediate(callback);
                                    } else if (locationStoreRow.availableCapacity == -1) {

                                        finalResultArray.push(element);
                                        setImmediate(callback);
                                    } else {

                                        putSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, putSublist2Row) {
                                            if (err) {

                                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else if (putSublist2Row.length == 0) {

                                                pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, pickSublistRow) {
                                                    if (err) {

                                                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                    } else if (pickSublistRow.length == 0) {

                                                        finalResultArray.push(element);
                                                        setImmediate(callback);
                                                    } else {

                                                        var totalPickReservedCapacity = 0;

                                                        customPalletNumber = [];

                                                        async.eachSeries(pickSublistRow, function (element2, callback2) {

                                                            if (element2.itemType === 'PALLET' && element2.palletType === 'O') {

                                                                if (customPalletNumber.indexOf(element2.customPalletNumber) == -1) {
                                                                    customPalletNumber.push(element2.customPalletNumber);
                                                                    totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                                                }
                                                                setImmediate(callback2);
                                                            } else {

                                                                totalPickReservedCapacity = totalPickReservedCapacity + element2.requiredQuantity;
                                                                setImmediate(callback2);
                                                            }
                                                        }, function (err) {

                                                            availableCapacity = locationStoreRow.availableCapacity;

                                                            var remaining = ((availableCapacity - totalPickReservedCapacity) - 0);

                                                            if (remaining >= requiredQuantity) {

                                                                finalResultArray.push(element);
                                                            }
                                                            setImmediate(callback);
                                                        });
                                                    }
                                                });
                                            } else {

                                                var suggestedCount = putSublist2Row.length; // GBL Specific

                                                var availableCapacity = locationStoreRow.availableCapacity;

                                                var finalAvailableCapacity = (availableCapacity - suggestedCount);

                                                (consoleProcess) ? console.log('suggestedCount: ' + suggestedCount) : '';
                                                (consoleProcess) ? console.log('availableAt: ' + availableCapacity) : '';
                                                (consoleProcess) ? console.log('FinalAvailable: ' + finalAvailableCapacity) : '';

                                                if (finalAvailableCapacity >= requiredQuantity) {

                                                    pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, pickSublistRow) {
                                                        if (err) {

                                                            flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                        } else if (pickSublistRow.length == 0) {

                                                            finalResultArray.push(element);
                                                            setImmediate(callback);
                                                        } else {

                                                            var totalPickReservedCapacity = 0;

                                                            customPalletNumber = [];

                                                            async.eachSeries(pickSublistRow, function (element2, callback2) {

                                                                if (element2.itemType === 'PALLET' && element2.palletType === 'O') {

                                                                    if (customPalletNumber.indexOf(element2.customPalletNumber) == -1) {
                                                                        customPalletNumber.push(element2.customPalletNumber);
                                                                        totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                                                    }
                                                                    setImmediate(callback2);
                                                                } else {

                                                                    totalPickReservedCapacity = totalPickReservedCapacity + element2.requiredQuantity;
                                                                    setImmediate(callback2);
                                                                }
                                                            }, function (err) {

                                                                availableCapacity = locationStoreRow.availableCapacity;

                                                                var remaining = ((availableCapacity - totalPickReservedCapacity) - suggestedCount);

                                                                if (remaining >= requiredQuantity) {

                                                                    finalResultArray.push(element);
                                                                }
                                                                setImmediate(callback);
                                                            });
                                                        }
                                                    });
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    }
                                });

                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', err);
                                } else {

                                    if (finalResultArray.length == 0) {

                                        var error = {message: 'No locations with sufficient capacity found! Locations might be reserved for other activities like PICK/PUT.', status: 'error', statusCode: '404'};
                                        flowController.emit('error', error);
                                    } else {

                                        flowController.emit('11', finalResultArray);
                                    }
                                }
                            });
                        }
                    });

                    // Allocated locations array
                    flowController.on('11', function (allowedLocationArray) {

                        (consoleProcess) ? console.log('11') : '';

                        if (combinedArray.length == 0) {

                            flowController.emit('error', {message: 'No zones matching to this pallet found! Or you may have capacity not available at any of the zones', status: 'error', statusCode: '404'});
                        } else {

                            var finalZoneIdArray = [];
                            var finalZoneArray = [];

                            async.eachSeries(allowedLocationArray, function (element, callback) {

                                locationStoreModel.findOne({'customerAddress': element, 'activeStatus': 1}, function (err, locationStoreRow) {

                                    if (err) {
                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                    } else if (locationStoreRow == null) {

                                        setImmediate(callback);
                                    } else {

                                        zoneMasterModel.findOne({'_id': locationStoreRow.zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                            if (err) {
                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                            } else if (zoneMasterRow == null) {

                                                setImmediate(callback);
                                            } else {

                                                var zoneId = String(zoneMasterRow._id);

                                                var in_Array = finalZoneIdArray.indexOf(zoneId);

                                                if (in_Array == -1) {

                                                    finalZoneIdArray.push(zoneId);
                                                    finalZoneArray.push({'zoneId': zoneId, 'zoneName': zoneMasterRow.zone});

                                                    setImmediate(callback);
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', err);
                                } else {

                                    flowController.emit('end', finalZoneArray);
                                }
                            });
                        }
                    });

                    // End
                    flowController.on('end', function (finalZoneArray) {

                        (consoleProcess) ? console.log('end') : '';
                        console.log(finalZoneArray);

                        res.json({zoneName: finalZoneArray, message: 'Operation Successful', status: 'success', statusCode: '200'});
                    });

                    // Error
                    flowController.on('error', function (error) {

                        (consoleProcess) ? console.log('error') : '';
                        (consoleProcess) ? console.log(errorData) : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // To be kept at the end always
                    flowController.emit('START');
                }
            });
        });
//        
//   
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Display all locations
//----------------------------------------------------------------------------------------------------------------------------      
router.route('/v1/processMaster/web/pickSubList/action/read/all-locations/')

        .post(function (req, res) {

            var consoleProcess = 0;

            (consoleProcess) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var zoneId = req.body.zoneId.trim();

            var palletNumber = req.body.palletNumber.trim();

            var requiredQuantity = parseInt(req.body.requiredQuantity);

            var selectedMHE = req.body.selectedMHE;

            var functionAreaArray = [];
            var holdingTypeArray = [];

            var flowController = new EventEmitter();

            itemStoreModel.findOne({'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStoreRow) {

                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (itemStoreRow == null) {

                    res.json({message: 'Pallet No. ' + palletNumber + ' not available in warehouse.', status: 'error', statusCode: '304'});
                } else {

                    palletType = itemStoreRow.randomFields[0].palletType;

                    palletSize = itemStoreRow.randomFields[0].palletSize;

                    // Get the Function Area array
                    flowController.on('1.1', function () {

                        (consoleProcess) ? console.log('1.1') : '';

                        functionAreaModel.find({'name': {'$in': ['STORAGE', 'DISPATCH', 'REPROCESS', 'SCRAP']}, 'activeStatus': 1}).lean().exec(function (err, functionAreaRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area data missing! Contact warehouse administrator", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(functionAreaRow, function (element, callback) {

                                    functionAreaArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('1.2');
                                });
                            }
                        });
                    });

                    // Get Holding type PALLET Details
                    flowController.on('1.2', function () {

                        (consoleProcess) ? console.log('1.2') : '';

                        holdingTypeModel.find({'name': {'$in': ['PALLET', 'ANY']}, 'activeStatus': 1}).lean().exec(function (err, holdingTypePalletRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypePalletRow == null) {

                                flowController.emit('ERROR', {message: "Function area data missing! Contact warehouse administrator", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(holdingTypePalletRow, function (element, callback) {

                                    holdingTypeArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('START');
                                });
                            }
                        });
                    });

                    // Get locations from rule engine matching criteria
                    // Get zone details
                    flowController.on('START', function () {

                        (consoleProcess) ? console.log('START') : '';

                        zoneMasterModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (zoneMasterRow == null) {

                                res.json({message: 'zone Id missing or modified!!!!!!', status: 'error', statusCode: '304'});
                            } else {

                                if (zoneMasterRow != null) {

                                    var zoneName = zoneMasterRow.zone;
                                    flowController.emit('0', zoneName);
                                }
                            }
                        });
                    });

                    // Get locations from rule engine
                    flowController.on('0', function (zoneName) {

                        (consoleProcess) ? console.log('0') : '';
                        (consoleProcess) ? console.log(zoneName) : '';

                        var locationArray = [];

                        var P1 = {'$match': {zone: zoneName, palletType: palletType, palletSize: palletSize, activeStatus: 1}};
                        var P2 = {'$lookup': {from: "transactionalData-locationStores", localField: "location", foreignField: "customerAddress", as: "locationStore"}};
                        var P3 = {'$unwind': {path: "$locationStore"}};
                        if (selectedMHE != '')
                            var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.materialHandlingUnitId': selectedMHE, 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
                        else
                            var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
                        var P5 = {'$sort': {location: 1}};
                        var P6 = {'$project': {zone: 1, location: 1, availability: '$locationStore.availability', capacity: '$locationStore.availableCapacity', holdingType: '$locationStore.holdingType', function: '$locationStore.function'}};

                        ruleEngineModel.aggregate([P1, P2, P3, P4, P5, P6],
                                function (err, result) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        async.eachSeries(result, function (element, callback) {

                                            locationArray.push(element.location);
                                            setImmediate(callback);

                                        }, function (err) {

                                            flowController.emit('1', locationArray);
                                        });
                                    }
                                });
                    });

                    // Get the master data of this item
                    flowController.on('1', function (customerAddressArray) {

                        (consoleProcess) ? console.log('1') : '';
                        (consoleProcess) ? console.log(customerAddressArray) : '';

                        itemMasterModel.findOne({'_id': itemStoreRow.itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                            if (err) {
                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow == null) {

                                flowController.emit('error', {message: 'No records for item master found!', status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('2', customerAddressArray, itemMasterRow);
                            }
                        });

                    });

                    // Filter & out locations reserved for items other than required item
                    flowController.on('2', function (customerAddressArray, itemMasterRow) {

                        (consoleProcess) ? console.log('2') : '';
                        (consoleProcess) ? console.log(customerAddressArray) : '';

                        filteredLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(customerAddressArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {
                                    // Location not available in warehouse
                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {
                                    // Location does not belongs to PUT functions so takeit further for processing
                                    filteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (holdingTypeArray.indexOf(locationStoreRow.holdingType) == -1) {
                                    // Location holding type is other than pallet...Ignore
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    // Capacity at this location is not sufficient
                                    setImmediate(callback);
                                } else {

                                    if (locationStoreRow.isReservedForItem === 'YES') {

                                        if (locationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                                            filteredLocationArray.push(element);
                                            setImmediate(callback);
                                        } else {

                                            setImmediate(callback);
                                        }

                                    } else {

                                        filteredLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', err);
                            } else {

                                if (filteredLocationArray.length === 0) {

                                    flowController.emit('error', {message: 'No capacity available in locations for MHE selected by User.', status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('3', filteredLocationArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Filter & out locations exclusive for other items
                    // Filter & in locations reserved for required item
                    // Filter & in blank locations
                    // Filter & in shared locations
                    flowController.on('3', function (customerAddressArray, itemMasterRow) {

                        (consoleProcess) ? console.log('3') : '';
                        (consoleProcess) ? console.log(customerAddressArray) : '';

                        var newFilteredLocationArray = [];

                        var otherItemArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(customerAddressArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'isReservedForItem': 'NO', 'assignedItemStoreId.0': {'$exists': true}, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {
                                    // Blank locations
                                    newFilteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    newFilteredLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    console.log('capacity: ' + element + ' not available');
                                    setImmediate(callback);
                                } else {

                                    var sameItemObject = [];
                                    var otherItemObject = [];

                                    assignItemStoreArray = locationStoreRow.assignedItemStoreId;

                                    async.eachSeries(assignItemStoreArray, function (element2, callback2) {

                                        itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                            if (err) {

                                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                if (itemStoreRow.itemMasterId == itemMasterId) {

                                                    sameItemObject.push(element2);
                                                    setImmediate(callback2);
                                                } else {

                                                    otherItemObject.push(element);
                                                    setImmediate(callback2);
                                                }
                                            }
                                        });
                                    }, function (err) {

                                        if (err) {

                                            callback(err);
                                        } else {

                                            if (sameItemObject.length === assignItemStoreArray.length) {
                                                // All same items
                                                newFilteredLocationArray.push(element);
                                                setImmediate(callback);
                                            } else if (otherItemObject.length === assignItemStoreArray.length) {
                                                // All other item
                                                otherItemArray.push(element);
                                                setImmediate(callback);
                                            } else {
                                                // Shared
                                                newFilteredLocationArray.push(element);
                                                setImmediate(callback);
                                            }
                                        }
                                    });
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', err);
                            } else {

                                if (newFilteredLocationArray.length === 0 && otherItemArray.length === 0) {
                                    // If required locations after filtering with conditions are not available & other locations also exclusive or not having capacity
                                    flowController.emit('error', {message: 'No locations available! Choose different zone if available.', status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('4', filteredLocationArray, otherItemArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Check out other item array and check exclusivity of those item if array is not empty
                    // Other items who are exclusive will be removed
                    flowController.on('4', function (filteredLocationArray, otherItemArray, itemMasterRow) {

                        (consoleProcess) ? console.log('4') : '';
                        (consoleProcess) ? console.log(filteredLocationArray) : '';

                        if (otherItemArray.length == 0) {

                            flowController.emit('5', filteredLocationArray, itemMasterRow);
                        } else {

                            async.eachSeries(otherItemArray, function (element, callback) {

                                locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (locationStoreRow == null) {

                                        setImmediate(callback);
                                    } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                        filteredLocationArray.push(element);
                                        setImmediate(callback);
                                    } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                        console.log('capacity: ' + element + ' not available');
                                        setImmediate(callback);
                                    } else {

                                        var itemStoreId = locationStoreRow.assignedItemStoreId[0];

                                        itemStoreModel.count({'_id': itemStoreId, 'exclusiveStorage': 'YES', 'activeStatus': 1}, function (err, itemStoreRowCount) {

                                            if (itemStoreRowCount > 0) {

                                                setImmediate(callback);
                                            } else {

                                                var in_Array = filteredLocationArray.indexOf(element);

                                                if (in_Array == -1) {

                                                    filteredLocationArray.push(element);
                                                    setImmediate(callback);
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', err);
                                } else {

                                    flowController.emit('5', filteredLocationArray, itemMasterRow);
                                }
                            });
                        }
                    });

                    // Final execution logic
                    // Get reserved locations array
                    flowController.on('5', function (filteredLocationArray, itemMasterRow) {

                        (consoleProcess) ? console.log('5') : '';
                        (consoleProcess) ? console.log(filteredLocationArray) : '';

                        var reservedLocationArray = [];

                        var otherLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(filteredLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    otherLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    // Sufficient capacity not available 
                                    setImmediate(callback);
                                } else {

                                    if (locationStoreRow.isReservedForItem === 'YES') {

                                        if (locationStoreRow.reservedItemId.length > 1) {

                                            if (locationStoreRow.assignedItemStoreId.length > 0) {

                                                conflictArray = [];

                                                async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                                    itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                                        if (itemStoreRow.itemMasterId == itemMasterId) {

                                                            setImmediate(callback2);
                                                        } else if (itemStoreRow.exclusiveStorage == 'YES') {

                                                            conflictArray.push(element2);
                                                            setImmediate(callback2);
                                                        } else {

                                                            setImmediate(callback2);
                                                        }
                                                    });

                                                }, function (err) {

                                                    if (conflictArray.length != 0) {

                                                        setImmediate(callback);
                                                    } else if (itemMasterRow.exclusiveStorage == 'YES') {

                                                        setImmediate(callback);
                                                    } else {

                                                        reservedLocationArray.push(element);
                                                        setImmediate(callback);
                                                    }
                                                });
                                            } else {

                                                reservedLocationArray.push(element);
                                                setImmediate(callback);
                                            }
                                        } else {

                                            reservedLocationArray.push(element);
                                            setImmediate(callback);
                                        }
                                    } else {

                                        otherLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err)
                                flowController.emit('error', err);
                            else
                                flowController.emit('6', reservedLocationArray, otherLocationArray, itemMasterRow);
                        });
                    });

                    // Get locations where item is present (item already present and adding the same item)
                    flowController.on('6', function (reservedLocationArray, otherLocationArray, itemMasterRow) {

                        (consoleProcess) ? console.log('6') : '';
                        (consoleProcess) ? console.log(reservedLocationArray) : '';
                        (consoleProcess) ? console.log(otherLocationArray) : '';

                        var itemPresentLocationArray = [];

                        var remainingLocationArray = [];

                        var itemMasterId = String(itemMasterRow._id);

                        async.eachSeries(otherLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    remainingLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    //Sufficient location capacity not available
                                    setImmediate(callback);
                                } else {

                                    var successObject = [];

                                    if (locationStoreRow.assignedItemStoreId.length != 0) {

                                        async.eachSeries(locationStoreRow.assignedItemStoreId, function (element2, callback2) {

                                            itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                                if (err) {
                                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                                } else if (itemStoreRow.itemMasterId == itemMasterId) {

                                                    successObject.push({process: 'done'});

                                                    setImmediate(callback2);
                                                } else {

                                                    setImmediate(callback2);
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                console.log('Error at mid-interval execution!!!');
                                            } else {
                                                if (successObject.length > 0) {

                                                    itemPresentLocationArray.push(element);
                                                    setImmediate(callback);
                                                } else {
                                                    remainingLocationArray.push(element);
                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    } else {

                                        remainingLocationArray.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err)
                                flowController.emit('error', err);
                            else
                                flowController.emit('7', reservedLocationArray, itemPresentLocationArray, remainingLocationArray, itemMasterRow);
                        });
                    });

                    // process locations which are blank and location where required item is not present
                    flowController.on('7', function (reservedLocationArray, itemPresentLocationArray, remainingLocationArray, itemMasterRow) {

                        (consoleProcess) ? console.log('7') : '';
                        (consoleProcess) ? console.log(reservedLocationArray) : '';
                        (consoleProcess) ? console.log(itemPresentLocationArray) : '';
                        (consoleProcess) ? console.log(remainingLocationArray) : '';

                        var exclusiveStorage = itemMasterRow.exclusiveStorage;

                        var overflowAutoAssign = itemMasterRow.overflowAutoAssign;

                        emptyAndSharedLocationArray = [];

                        async.eachSeries(remainingLocationArray, function (element, callback) {

                            locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                                if (err) {
                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (locationStoreRow == null) {

                                    setImmediate(callback);
                                } else if (functionAreaArray.indexOf(locationStoreRow.function) != -1) {

                                    emptyAndSharedLocationArray.push(element);
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < requiredQuantity) {
                                    // Capacity not available
                                    setImmediate(callback);
                                } else {

                                    if (overflowAutoAssign == 'YES') {

                                        if (locationStoreRow.assignedItemStoreId.length != 0) {
                                            // required item is not present at this location
                                            if (exclusiveStorage == 'NO') {

                                                emptyAndSharedLocationArray.push(element);
                                                setImmediate(callback);
                                            } else {

                                                setImmediate(callback);
                                            }
                                        } else {
                                            // Empty locations
                                            emptyAndSharedLocationArray.push(element);
                                            setImmediate(callback);
                                        }
                                    } else {

                                        setImmediate(callback);
                                    }
                                }
                            });

                        }, function (err) {

                            if (err) {
                                flowController.emit('error', err);
                            } else {

                                flowController.emit('8', reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, itemMasterRow);
                            }
                        });
                    });

                    // Combine array
                    flowController.on('8', function (reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, itemMasterRow) {

                        if (consoleProcess) {
                            console.log('Reservation');
                            console.log(reservedLocationArray);
                            console.log('Present at locations');
                            console.log(itemPresentLocationArray);
                            console.log('Empty or shared location');
                            console.log(emptyAndSharedLocationArray);
                        }

                        var temp = reservedLocationArray.concat(itemPresentLocationArray);

                        combinedArray = temp.concat(emptyAndSharedLocationArray);

                        if (consoleProcess) {
                            console.log('Combined array');
                            console.log(combinedArray);
                        }

                        flowController.emit('9', combinedArray);

                    });

                    // Check if location is suggested to any other sublist
                    flowController.on('9', function (combinedArray) {

                        (consoleProcess) ? console.log('9') : '';

                        (consoleProcess) ? console.log('CombinedArray: ' + combinedArray) : '';

                        if (combinedArray.length == 0) {

                            flowController.emit('error', {location: combinedArray, message: 'Nomlocations available', status: 'success', statusCode: '200'});
                        } else {

                            var finalResultArray = [];

                            async.eachSeries(combinedArray, function (element, callback) {

                                locationStoreModel.findOne({'customerAddress': element, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (locationStoreRow == null) {

                                        setImmediate(callback);
                                    } else if (locationStoreRow.availableCapacity == -1) {

                                        finalResultArray.push(element);
                                        setImmediate(callback);
                                    } else {

                                        putSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, putSublist2Row) {
                                            if (err) {

                                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else if (putSublist2Row.length == 0) {

                                                pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, pickSublistRow) {
                                                    if (err) {

                                                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                    } else if (pickSublistRow.length == 0) {

                                                        finalResultArray.push(element);
                                                        setImmediate(callback);
                                                    } else {

                                                        var totalPickReservedCapacity = 0;

                                                        customPalletNumber = [];

                                                        async.eachSeries(pickSublistRow, function (element2, callback2) {

                                                            if (element2.itemType === 'PALLET' && element2.palletType === 'O') {

                                                                if (customPalletNumber.indexOf(element2.customPalletNumber) == -1) {
                                                                    customPalletNumber.push(element2.customPalletNumber);
                                                                    totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                                                }
                                                                setImmediate(callback2);
                                                            } else {

                                                                totalPickReservedCapacity = totalPickReservedCapacity + element2.requiredQuantity;
                                                                setImmediate(callback2);
                                                            }
                                                        }, function (err) {

                                                            availableCapacity = locationStoreRow.availableCapacity;

                                                            var remaining = ((availableCapacity - totalPickReservedCapacity) - 0);

                                                            if (element == 'DC06') {

                                                                console.log('AV' + availableCapacity);
                                                                console.log('RM' + remaining);
                                                            }

                                                            if (remaining >= requiredQuantity) {

                                                                finalResultArray.push(element);
                                                            }
                                                            setImmediate(callback);
                                                        });
                                                    }
                                                });
                                            } else {

                                                var suggestedCount = putSublist2Row.length; // GBL Specific

                                                var availableCapacity = locationStoreRow.availableCapacity;

                                                var finalAvailableCapacity = (availableCapacity - suggestedCount);

                                                (consoleProcess) ? console.log('suggestedCount: ' + suggestedCount) : '';
                                                (consoleProcess) ? console.log('availableAt: ' + availableCapacity) : '';
                                                (consoleProcess) ? console.log('FinalAvailable: ' + finalAvailableCapacity) : '';

                                                if (finalAvailableCapacity >= requiredQuantity) {

                                                    pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, pickSublistRow) {
                                                        if (err) {

                                                            flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                        } else if (pickSublistRow.length == 0) {

                                                            finalResultArray.push(element);
                                                            setImmediate(callback);
                                                        } else {

                                                            var totalPickReservedCapacity = 0;

                                                            customPalletNumber = [];

                                                            async.eachSeries(pickSublistRow, function (element2, callback2) {

                                                                if (element2.itemType === 'PALLET' && element2.palletType === 'O') {

                                                                    if (customPalletNumber.indexOf(element2.customPalletNumber) == -1) {
                                                                        customPalletNumber.push(element2.customPalletNumber);
                                                                        totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                                                    }
                                                                    setImmediate(callback2);
                                                                } else {

                                                                    totalPickReservedCapacity = totalPickReservedCapacity + element2.requiredQuantity;
                                                                    setImmediate(callback2);
                                                                }
                                                            }, function (err) {

                                                                availableCapacity = locationStoreRow.availableCapacity;

                                                                var remaining = ((availableCapacity - totalPickReservedCapacity) - suggestedCount);

                                                                if (element == 'DC06') {

                                                                    console.log('AV' + availableCapacity);
                                                                    console.log('RM' + remaining);
                                                                }

                                                                if (remaining >= requiredQuantity) {

                                                                    finalResultArray.push(element);
                                                                }
                                                                setImmediate(callback);
                                                            });
                                                        }
                                                    });
                                                } else {

                                                    setImmediate(callback);
                                                }
                                            }
                                        });
                                    }
                                });

                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', err);
                                } else {

                                    if (finalResultArray.length == 0) {

                                        var error = {message: 'No locations with sufficient capacity found! Locations might be reserved for other activities like PICK/PUT.', status: 'error', statusCode: '404'};
                                        flowController.emit('error', error);
                                    } else {

                                        flowController.emit('end', finalResultArray);
                                    }
                                }
                            });
                        }
                    });

                    // Successful processing
                    flowController.on('end', function (location) {

                        (consoleProcess) ? console.log('end') : '';

                        var response = {location: location, message: 'Operation Successful', status: 'success', statusCode: '200'};
                        res.json(response);
                    });

                    // Successful processing
                    flowController.on('error', function (error) {

                        (consoleProcess) ? console.log('error') : '';
                        (consoleProcess) ? console.log(error) : '';
                        logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                        res.json(error);
                    });

                    // To be kept at the end always
                    flowController.emit('1.1');
                }
            });
        });
//        
//        
//---------------------------------------------------------------------------------------------------------------------------
// Create Pick-Sublist Manually       
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/create/pickSubList/')

        .post(function (req, res, next) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (showConsole) ? console.log(req.body) : '';

            var pickListId = req.body.pickListId.trim(); // MongoId of the waarehouse
            var hopperPriority = req.body.hopperPriority.trim();
            var itemType = req.body.itemType.trim();
            var itemValue = req.body.itemValue.trim();
            var itemDescription = req.body.itemDescription.trim();
            var requiredQuantity = req.body.requiredQuantity.trim(); // UserId who created this user
            var dropLocationAddress = req.body.dropLocationAddress.trim().toUpperCase();
            var createdBy = req.body.createdBy.trim();
            var orderNumber = req.body.orderNumber;

            var materialHandlingUnit = [];
            var flowController = new EventEmitter();

            // Check if picklist activated or not
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                pickListModel.findOne({'_id': pickListId, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}).exec(function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No Pick-List data available!', status: 'error', statusCode: '404'});
                    } else if (pickListRow.mergedPickLists.length > 0) {

                        flowController.emit('ERROR', {message: 'This is a merged Picklist! Adding new line-items to merged picklist not allowed.', status: 'error', statusCode: '404'});
                    } else if (pickListRow.status >= 11) {

                        flowController.emit('ERROR', {message: 'This Picklist already activated! Create new Picklist to add new line items.', status: 'error', statusCode: '404'});
                    } else {

                        materialHandlingUnit = pickListRow.materialHandlingUnit;
                        flowController.emit('0');
                    }
                });
            });
            //
            // Get item master details based on inputs & forward to next flow
            flowController.on('0', function () {

                (showConsole) ? console.log('0') : '';

                if (itemType == 'PALLET') {

                    itemStoreModel.findOne({'palletNumber': itemValue, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            flowController.emit('ERROR', {message: "This pallet is not available in warehouse inventory.", status: 'error', statusCode: '404'});
                        } else {

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemMasterRow == null) {

                                    flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('1', itemMasterRow);
                                }
                            });
                        }
                    });

                } else if (itemType == 'SERIALNUMBER') {

                    itemStoreModel.findOne({'itemSerialNumber': itemValue, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            flowController.emit('ERROR', {message: "No item with this serial number is available in warehouse inventory.", status: 'error', statusCode: '404'});
                        } else {

                            itemMasterId = itemStoreRow.itemMasterId;

                            itemMasterModel.findOne({'_id': itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemMasterRow == null) {

                                    flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('1', itemMasterRow);
                                }
                            });
                        }
                    });
                } else {

                    itemMasterModel.findOne({'itemCode': itemValue, 'activeStatus': 1}, function (err, itemMasterRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow == null) {

                            flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('1', itemMasterRow);
                        }
                    });
                }
            });
            //
            // Check if item is obsolete
            flowController.on('1', function (itemMasterRow) {

                (showConsole) ? console.log('1') : '';

                var status = itemMasterRow.itemSystemSpecification[0].itemStatus;

                if (status == 'OBSOLETE') {

                    flowController.emit('ERROR', {message: "This item is obsolete! Can't proceed further.", status: 'error', statusCode: '500'});
                } else {

                    flowController.emit('2', itemMasterRow);
                }
            });
            //
            // Get dispatch rules
            flowController.on('2', function (itemMasterRow) {// Default will be none

                (showConsole) ? console.log('2') : '';

                dispatchRuleModel.findOne({'_id': itemMasterRow.dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (dispatchRuleRow == null) {

                        flowController.emit('ERROR', {message: "Dispatch rule data missing!", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3', itemMasterRow, dispatchRuleRow);
                    }
                });
            });
            //
            // Find function area for pick process
            flowController.on('3', function (itemMasterRow, dispatchRuleRow) {

                (showConsole) ? console.log('3') : '';

                functionAreaArray = [];

                var query = {};
                query.name = (itemType === 'ITEMCODE') ? {'$in': ['STORAGE']} : {'$in': ['REPROCESS', 'STORAGE']};
                query.activeStatus = 1;

                functionAreaModel.find(query).lean().exec(function (err, functionAreaRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (functionAreaRow == null) {

                        flowController.emit('ERROR', {message: 'Function area for pick missing! Records tampered/removed from system.', status: 'error', statusCode: '200'});
                    } else {

                        async.eachSeries(functionAreaRow, function (element, callback) {

                            functionAreaArray.push(String(element._id));
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('4', itemMasterRow, dispatchRuleRow, functionAreaArray);
                            }
                        });
                    }
                });
            });
            //
            // Filter and get zones allowed for pick of item as per function area of pick process /**/
            flowController.on('4', function (itemMasterRow, dispatchRuleRow, functionAreaRow) {

                (showConsole) ? console.log('4') : '';

                allowedZoneArray = [];

                locationStoreModel.find({'function': {'$in': functionAreaRow}, 'activeStatus': 1}).lean().exec(function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No zones are defined for Pick process! Define zones first.', status: 'error', statusCode: '200'});
                    } else {

                        async.eachSeries(locationStoreRow, function (element, callback) {

                            if (!(allowedZoneArray.indexOf(element.zoneId) > -1)) {

                                allowedZoneArray.push(element.zoneId);
                                setImmediate(callback);
                            } else {

                                setImmediate(callback);
                            }
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('5', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray);
                            }
                        });
                    }
                });
            });
            //
            // Get items from item store based on input
            flowController.on('5', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray) {

                (showConsole) ? console.log('5') : '';

                itemStoreArray = [];

                var itemMasterId = itemMasterRow._id;

                if (itemType == 'SERIALNUMBER') {

                    itemStoreModel.findOne({'itemMasterId': itemMasterId, 'palletNumber': {'$exists': false}, 'itemSerialNumber': itemValue, 'locationStoreId': {'$exists': true}, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            flowController.emit('ERROR', {message: "No item with this serial number available in warehouse for Pick.", status: 'error', statusCode: '404'});
                        } else {

                            flowController.emit('6', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow);
                        }
                    });

                } else if (itemType == 'PALLET') {

                    itemStoreModel.find({'palletNumber': itemValue, 'locationStoreId': {'$exists': true}, 'activeStatus': 1}).lean().exec(function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow.length === 0) {

                            flowController.emit('ERROR', {message: "No pallet with this pallet number available in warehouse for Pick or Pallet's PUT activity not completed yet!", status: 'error', statusCode: '404'});
                        } else {

                            var palletBoxType = itemStoreRow[0].randomFields[0].boxType;
                            // If the pallet is OUTER then CPN must be present & if not present that means PALLET is in REPROCESSING area
                            if (palletBoxType == 'O') {

                                var customPalletNumber = (itemStoreRow[0].customPalletNumber) ? itemStoreRow[0].customPalletNumber : '';

                                if (customPalletNumber == '') {

                                    flowController.emit('ERROR', {message: "This is an OUTER pallet & is undergoing REPROCESSING! PICK activity not allowed until the activity gets completed.", status: 'error', statusCode: '404'});
                                } else {

                                    flowController.emit('6', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow);
                                }
                            } else {

                                flowController.emit('6', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow);
                            }
                        }
                    });
                } else {

                    // Pick should not be scheduled if item is in reprocess area
                    // Alerts to be added

                    var itemStoreArray = [];

                    itemStoreModel.find({'itemMasterId': itemMasterId, 'palletNumber': {'$exists': false}, 'locationStoreId': {'$exists': true}, 'activeStatus': 1}).lean().exec(function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow.length === 0) {

                            flowController.emit('ERROR', {message: "No items with this item-code available under loose box area. Check reprocess area for availability.", status: 'error', statusCode: '404'});
                        } else {

                            async.eachSeries(itemStoreRow, function (element, callback) {

                                var d = new Date(element.timeCreated * 1000);
                                var date = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); //dd/mm/yyyy

                                var temp = {
                                    itemStoreId: String(element._id),
                                    itemSerialNumber: ('itemSerialNumber' in element) ? element.itemSerialNumber : '',
                                    locationStoreId: element.locationStoreId,
                                    manufacturingDate: element.manufacturingDate,
                                    timeManufactured: (element.manufacturingDate) ? (new Date(element.manufacturingDate.split("/").reverse().join("-")).getTime() / 1000) : 0, //////
                                    expiryDate: (element.expiryDate) ? element.expiryDate : 'NA', //////
                                    timeExpiry: (element.expiryDate) ? (new Date(element.expiryDate.split("/").reverse().join("-")).getTime() / 1000) : 0, //////
                                    inwardDate: date,
                                    timeCreated: element.timeCreated
                                };

                                itemStoreArray.push(temp);

                                setImmediate(callback);

                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('6', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreArray);
                                }
                            });
                        }
                    });
                }
            });
            //
            // Filter & in items based on allowed zones with allowed pick locations with that
            flowController.on('6', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow) {

                (showConsole) ? console.log('6') : '';

                if (itemType == 'SERIALNUMBER') {

                    locationStoreModel.findOne({'_id': itemStoreRow.locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickLocationStoreRow == null) {

                            flowController.emit('ERROR', {message: "This serial number item's pick location is blocked! Can't proceed further.", status: 'error', statusCode: '500'});
                        } else {

                            if (allowedZoneArray.indexOf(pickLocationStoreRow.zoneId) == -1) {

                                flowController.emit('ERROR', {message: "This item does not belongs to Pick process allowed zones.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('7', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow);
                            }
                        }
                    });

                } else if (itemType == 'PALLET') {

                    locationStoreModel.findOne({'_id': itemStoreRow[0].locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickLocationStoreRow == null) {

                            flowController.emit('ERROR', {message: "This pallet location is blocked! Can't proceed further.", status: 'error', statusCode: '500'});
                        } else {

                            if (allowedZoneArray.indexOf(pickLocationStoreRow.zoneId) == -1) {

                                flowController.emit('ERROR', {message: "This pallet does not belongs to Pick process allowed zones.", status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('7', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow);
                            }
                        }
                    });

                } else {

                    var filteredItemStoreArray = [];

                    var filteredPickLocationStoreIdArray = [];

                    var filteredPickLocationStoreArray = [];

                    async.eachSeries(itemStoreRow, function (element, callback) {

                        locationStoreModel.findOne({'_id': element.locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickLocationStoreRow == null) {

                                setImmediate(callback);
                            } else {

                                if (allowedZoneArray.indexOf(pickLocationStoreRow.zoneId) == -1) {

                                    setImmediate(callback);
                                } else {

                                    filteredItemStoreArray.push(element);

                                    if (filteredPickLocationStoreIdArray.indexOf(String(pickLocationStoreRow._id)) == -1) {

                                        filteredPickLocationStoreIdArray.push(String(pickLocationStoreRow._id));

                                        filteredPickLocationStoreArray.push(pickLocationStoreRow);

                                        setImmediate(callback);
                                    } else {

                                        setImmediate(callback);
                                    }
                                }
                            }
                        });
                    }, function (err) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('7', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, filteredItemStoreArray, filteredPickLocationStoreArray);
                        }
                    });
                }
            });
            //
            // remove itemStoreId who are already in other picklist of same day and time (NEED TO WORK IF SERIAL NUMBER RESERVED IN OTHER LIST)
            flowController.on('7', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow) {

                (showConsole) ? console.log('7') : '';

                if (itemType == 'SERIALNUMBER') {

                    pickSubListModel.find({'itemType': itemType, 'itemValue': itemValue, 'status': {'$lt': 31}, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow.length != 0) {

                            flowController.emit('ERROR', {message: "Box No. " + itemValue + " is already scheduled for PICK Activity.", status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('8', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow);
                        }
                    });

                } else if (itemType == 'PALLET') {

                    pickSubListModel.find({'itemType': itemType, 'itemValue': itemValue, 'status': {'$lt': 31}, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow.length != 0) {

                            flowController.emit('ERROR', {message: "Pallet number " + itemValue + " is already scheduled for PICK Activity.", status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('8', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow);
                        }
                    });
                } else {

                    //console.log(itemStoreRow);

                    var filteredItemStoreArray = [];

                    async.eachSeries(itemStoreRow, function (element, callback) {

                        var itemStoreId = element.itemStoreId;

                        pickSubListModel.find({'itemStoreId': itemStoreId, 'status': {'$lt': 31}, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                filteredItemStoreArray.push(element);
                                setImmediate(callback);
                                //                                
                            } else {

                                async.eachSeries(pickSubListRow, function (element2, callback2) {

                                    if (element2.pickActivity == 'FULL') {
                                        setImmediate(callback2);
                                    } else {

                                        if (filteredItemStoreArray.indexOf(element) == -1) {

                                            filteredItemStoreArray.push(element);
                                        }
                                        setImmediate(callback2);
                                    }
                                }, function (err) {

                                    setImmediate(callback);
                                });
                            }
                        });
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            //if (filteredItemStoreArray.length < requiredQuantity) {

                            //flowController.emit('ERROR', {message: 'Required quantity is not available in warehouse! Current stock of item left: ' + filteredItemStoreArray.length, status: 'error', statusCode: '304'});
                            //} else {

                            flowController.emit('8', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, filteredItemStoreArray, pickLocationStoreRow);
                            //}
                        }
                    });
                }//
            });
            //
            // Get drop location details with capacity & availability
            flowController.on('8', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow) {

                (showConsole) ? console.log('8') : '';

                locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'availability': 'A', 'activeStatus': 1}, function (err, dropLocationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (dropLocationStoreRow == null) {

                        flowController.emit('ERROR', {message: "Drop location is blocked! Can't proceed further.", status: 'error', statusCode: '404'});
                    } else {

                        if (itemType == 'PALLET') {

                            var palletType = itemStoreRow[0].randomFields[0].palletType;
                            var palletSize = itemStoreRow[0].randomFields[0].palletSize;

                            ruleEngineModel.findOne({'location': dropLocationAddress, 'activeStatus': 1}, function (err, ruleEngineRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (ruleEngineRow == null) {

                                    flowController.emit('ERROR', {message: "Location not configured in Rule Engine!", status: 'error', statusCode: '404'});
                                } else {

                                    if (ruleEngineRow.palletType.indexOf(palletType) == -1 || ruleEngineRow.palletSize.indexOf(palletSize) == -1) {

                                        flowController.emit('ERROR', {message: "Location not eligible to drop Pallet with Pallet Type/Size : (" + palletType + "/" + palletSize + "), Allowed Pallet Types at " + dropLocationAddress + " are: " + ruleEngineRow.palletType + " & Pallet Sizes are: " + ruleEngineRow.palletSize, status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('8A', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                                    }
                                }
                            });
                        } else {

                            flowController.emit('8A', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                        }
                    }
                });
            });
            //
            // Ignore capacity if defined as Unlimited
            flowController.on('8A', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow) {

                (showConsole) ? console.log('8A') : '';

                var length = dropLocationStoreRow.locationProperties.length;
                if (length == 0) {

                    flowController.emit('ERROR', {message: "Capacity of the location not defined yet.", status: 'error', statusCode: '404'});
                } else {

                    var userDefinedCapacity = dropLocationStoreRow.locationProperties[0].userDefinedCapacity;

                    if (userDefinedCapacity != "") {

                        if (userDefinedCapacity == '-1') {

                            flowController.emit('9', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                        } else {

                            var availableCapacity = dropLocationStoreRow.availableCapacity;

                            (showConsole) ? console.log('available quantity: ' + availableCapacity) : '';

                            if (availableCapacity < requiredQuantity) {

                                flowController.emit('ERROR', {message: "Available capacity at drop location is not sufficient! Current available capacity: " + availableCapacity, status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('8.0', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        }
                    } else {
                        // capacity calculation part
                        flowController.emit('ERROR', {message: "System defined calculation coming soon.", status: 'error', statusCode: '404'});
                    }
                }
            });
            //
            // if itemType is PALLET then check if drop location holding type is PALLET or different
            flowController.on('8.0', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow) {

                (showConsole) ? console.log('8.0') : '';

                var dropLocationHoldingType = dropLocationStoreRow.holdingType;

                holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (holdingTypeRow == null) {

                        flowController.emit('ERROR', {message: "Drop location's Holding type details tampered/modified!", status: 'error', statusCode: '404'});
                    } else {

                        holdingType = holdingTypeRow.name;

                        if (itemType == 'PALLET') {

                            if (holdingType != 'PALLET') {

                                if (holdingType != 'ANY') {

                                    flowController.emit('ERROR', {message: "Pallet not allowed to be put at location " + dropLocationAddress + " as the location is a Non-Pallet location! However, you can allow pallets to be dropped here by changing the properties of " + dropLocationAddress + " in Location Master.", status: 'error', statusCode: '404'});
                                } else {

                                    flowController.emit('8.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                                }
                            } else {

                                flowController.emit('8.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        }

                        if (itemType == 'ITEMCODE' || itemType == 'SERIALNUMBER') {

                            if (holdingType == 'PALLET') {

                                flowController.emit('ERROR', {message: "Location: " + dropLocationAddress + " holds Pallets only! Loose boxes are not allowed here. However, you can allow loose box here by changing the properties of " + dropLocationAddress + " in Location Master.", status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('8.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        }
                    }
                });
            });
            //
            // Check if drop location capacity reserved in any current PUT activity
            flowController.on('8.1', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow) {

                (showConsole) ? console.log('8.1 PUT') : '';

                var dropLocationId = String(dropLocationStoreRow._id);

                putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}).lean().exec(function (err, putSubListRow) {

                    if (putSubListRow.length == 0) {

                        flowController.emit('8.2', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, 0);
                    } else {

                        availableCapacity = dropLocationStoreRow.availableCapacity;

                        var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                        var remaining = availableCapacity - suggestedCount;

                        (showConsole) ? console.log('Remaining capacity at location after PUT: ' + remaining) : '';

                        if (remaining >= requiredQuantity) {

                            flowController.emit('8.2', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, suggestedCount);
                        } else {

                            flowController.emit('ERROR', {message: "Drop location capacity is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining, status: 'error', statusCode: '500'});
                        }
                    }
                });
            });
            //
            // Check if drop location capacity reserved in any current PICK activity
            flowController.on('8.2', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, putReservedCapacity) {

                (showConsole) ? console.log('8.2 PICK') : '';

                var dropLocationId = String(dropLocationStoreRow._id);

                pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {

                    if (pickSubListRow.length == 0) {

                        var dropLocationAvailableAfterPut = dropLocationStoreRow.availableCapacity - putReservedCapacity;

                        if (dropLocationAvailableAfterPut < requiredQuantity) {

                            flowController.emit('ERROR', {message: "Available capacity at location named " + dropLocationStoreRow.customerAddress + " is not sufficient. Current available capacity is: " + dropLocationAvailableAfterPut, status: 'error', statusCode: '404'});
                        } else {

                            flowController.emit('9', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, 0);
                        }
                    } else {

                        var totalPickReservedCapacity = 0;

                        customPalletNumber = [];

                        async.eachSeries(pickSubListRow, function (element, callback) {

                            if (element.itemType === 'PALLET' && element.palletType === 'O') {

                                if (customPalletNumber.indexOf(element.customPalletNumber) == -1) {
                                    customPalletNumber.push(element.customPalletNumber);
                                    totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                }
                                setImmediate(callback);
                            } else {

                                totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                setImmediate(callback);
                            }
                        }, function (err) {

                            availableCapacity = dropLocationStoreRow.availableCapacity;

                            var remaining = ((availableCapacity - totalPickReservedCapacity) - putReservedCapacity);

                            (showConsole) ? console.log('Remaining capacity at location after PICK: ' + remaining) : '';

                            if (remaining >= requiredQuantity) {

                                flowController.emit('9', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, remaining);
                            } else {

                                flowController.emit('ERROR', {message: "Drop location capacity is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity is " + remaining, status: 'error', statusCode: '500'});
                            }
                        });
                    }
                });
            });
            //
            // IF PICKLIST MHE AVAILABLE OR NOT
            flowController.on('9', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow) {

                (showConsole) ? console.log('9') : '';

                var itemMHE = itemMasterRow.handlingUnit;
                var dropLocationMHE = dropLocationStoreRow.materialHandlingUnitId;

                if (itemType == 'SERIALNUMBER' || itemType == 'PALLET') {

                    var pickLocationMHE = pickLocationStoreRow.materialHandlingUnitId;
                    var intersectionMHE = intersection(pickLocationMHE, itemMHE, dropLocationMHE);

                    if (materialHandlingUnit.length != 0) {

                        if (pickLocationMHE.length == 0 && itemMHE.length == 0 && dropLocationMHE.length == 0) {

                            flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                        } else {

                            var found = 0;

                            async.eachSeries(materialHandlingUnit, function (element, callback) {

                                if (found == 0)
                                    if (intersectionMHE.indexOf(element) > -1)
                                        found = 1;

                                setImmediate(callback);
                            }, function () {
                                if (found == 0)
                                    flowController.emit('ERROR', {message: "Material handling unit provided by you does not match with PICK/DROP location or item.", status: 'error', statusCode: '500'});
                                else
                                    flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            });
                        }
                    } else {

                        if ((pickLocationMHE.length == 0 && itemMHE.length == 0 && dropLocationMHE.length == 0) || (pickLocationMHE.length == 0 && itemMHE.length == 0) || (itemMHE.length == 0 && dropLocationMHE.length == 0) || (pickLocationMHE.length == 0 && dropLocationMHE.length == 0)) {

                            flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                        } else if (pickLocationMHE.length == 0) {

                            var intersectionMHE = intersection(itemMHE, dropLocationMHE);
                            if (intersectionMHE.length == 0) {

                                flowController.emit('ERROR', {message: "Material handling unit  by you does not match with PICK/DROP location or item.", status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        } else if (itemMHE.length == 0) {

                            var intersectionMHE = intersection(pickLocationMHE, dropLocationMHE);
                            if (intersectionMHE.length == 0) {

                                flowController.emit('ERROR', {message: "Material handling unit  by you does not match with PICK/DROP location or item.", status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        } else if (dropLocationMHE.length == 0) {

                            var intersectionMHE = intersection(pickLocationMHE, itemMHE);
                            if (intersectionMHE.length == 0) {

                                flowController.emit('ERROR', {message: "Material handling unit  by you does not match with PICK/DROP location or item.", status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        } else if (intersectionMHE.length == 0) {

                            flowController.emit('ERROR', {message: "Material handling unit  by you does not match with PICK/DROP location or item.", status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                        }
                    }
                } else {

                    allAllowedMHEItems = [];
                    commonMHEItems = [];

                    if (materialHandlingUnit.length != 0) {

                        async.eachSeries(itemStoreRow, function (element, callback) {

                            var locationStoreId = element.locationStoreId;

                            function_locationStoreService.getLocationDataByLocationStoreId(locationStoreId, function (err, locationStoreRecord) {
                                if (err) {

                                    callback(err);
                                } else {

                                    var pickLocationMHE = locationStoreRecord.materialHandlingUnitId;

                                    function_pickSubListService.materialHandlingUnitValidationForItemCodeOnSelectedMHE(materialHandlingUnit, pickLocationMHE, itemMHE, dropLocationMHE, function (err, result) {
                                        if (err)
                                            callback(err);

                                        if (result == 'ALL')
                                            allAllowedMHEItems.push(element);

                                        if (result == 'PARTIAL')
                                            commonMHEItems.push(element);

                                        setImmediate(callback);
                                    });
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        });
                    } else {

                        async.eachSeries(itemStoreRow, function (element, callback) {

                            var locationStoreId = element.locationStoreId;

                            function_locationStoreService.getLocationDataByLocationStoreId(locationStoreId, function (err, locationStoreRecord) {
                                if (err) {

                                    callback(err);
                                } else {

                                    var pickLocationMHE = locationStoreRecord.materialHandlingUnitId;

                                    function_pickSubListService.materialHandlingUnitValidationForItemCode(pickLocationMHE, itemMHE, dropLocationMHE, function (err, result) {
                                        if (err)
                                            callback(err);

                                        if (result == 'ALL')
                                            allAllowedMHEItems.push(element);

                                        if (result == 'PARTIAL')
                                            commonMHEItems.push(element);

                                        setImmediate(callback);
                                    });
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('10', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow);
                            }
                        });
                    }
                }
            });
            //
            // Get data about drop location functions
            flowController.on('10', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow) {

                (showConsole) ? console.log('10') : '';
                dropFunctionArea = [];
                functionAreaModel.distinct('_id', {'name': {'$in': ['STORAGE', 'DISPATCH', 'REPROCESS', 'SCRAP']}}).exec(function (err, functionAreaMongoIdRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (functionAreaMongoIdRow.length == 0) {

                        flowController.emit('ERROR', {message: "This serial number item's pick location is blocked! Can't proceed further.", status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(functionAreaMongoIdRow, function (element, callback) {

                            dropFunctionArea.push(String(element));
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {
                                flowController.emit('ERROR', err);
                            } else {
                                flowController.emit('11', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                            }
                        });
                    }
                });
            });
            //
            //Check if the drop location function is same as pick location function /**/
            flowController.on('11', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('11') : '';
                pickProcessFunction = functionAreaRow;

                dropLocationFunction = dropLocationStoreRow.function;

                if (dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                    // Drop location function does not belongs to valid pick process drop functions
                    flowController.emit('ERROR', {message: "Drop location not allowed under valid Pick process drop zones.", status: 'error', statusCode: '404'});
                } else {

                    if (pickProcessFunction.indexOf(dropLocationFunction) > -1) {
                        // Pick between same area
                        flowController.emit('12', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    } else {

                        flowController.emit('14', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    }
                }
            });
            //
            // if the activity is in same area then this flow has to be considered
            // VALIDATE_ITEM_RESERVATION
            flowController.on('12', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('12') : '';
                var itemMasterId = String(itemMasterRow._id);

                if (dropLocationStoreRow.isReservedForItem == 'YES') {

                    if (dropLocationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                        if (dropLocationStoreRow.reservedItemId.length > 1) {

                            flowController.emit('13', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);

                        } else {
                            //
                            flowController.emit('14', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                        }
                    } else {
                        //
                        flowController.emit('ERROR', {message: 'This location is reserved for different item! Choose different location.', status: 'error', statusCode: '403'});
                    }
                } else {
                    //
                    flowController.emit('13', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            // VALIDATE_ELIGIBILITY Check eligibility if item is not reserved but present or not OR empty location
            flowController.on('13', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('13') : '';
                if (dropLocationStoreRow.assignedItemStoreId.length > 0) {

                    conflictArray = [];
                    async.eachSeries(dropLocationStoreRow.assignedItemStoreId, function (element2, callback2) {

                        itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {
                            if (err) {

                                callback2(err);
                            } else if (itemStoreRow == null) {

                                callback2({message: 'Item not found in warehouse!' + element2, status: 'error', statusCode: '403'});
                            } else if (itemStoreRow.itemMasterId == String(itemMasterRow._id)) {

                                setImmediate(callback2);
                            } else if (itemStoreRow.exclusiveStorage == 'YES') {

                                conflictArray.push(element2);
                                setImmediate(callback2);
                            } else {

                                setImmediate(callback2);
                            }
                        });
                    }, function (err) {

                        if (err) {

                            flowController.emit('ERROR', err);
                        } else if (conflictArray.length != 0) {

                            flowController.emit('ERROR', {message: 'This shared location contain Exclusive Items, this location is not eligible!', status: 'error', statusCode: '403'});
                        } else if (itemMasterRow.exclusiveStorage === 'YES') {

                            flowController.emit('ERROR', {message: 'This item is Exclusive & not allowed to be put at shared location, this location is not eligible!', status: 'error', statusCode: '403'});
                        } else {

                            flowController.emit('14', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                        }
                    });
                } else {

                    flowController.emit('14', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            // If BOX / PALLET then move to creating sublist else process as per dispatch rules
            flowController.on('14', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('14') : '';
                if (itemType == 'SERIALNUMBER' || itemType == 'PALLET') {

//                    if (String(pickLocationStoreRow._id) == String(dropLocationStoreRow._id)) {
//
//                        if (itemType == 'SERIALNUMBER') {
//
//                            flowController.emit('ERROR', {message: 'This Box belongs to Location ' + pickLocationStoreRow.customerAddress + ', dropping it to same location via Pick activity is not allowed.', status: 'error', statusCode: '403'});
//                        } else {
//
//                            flowController.emit('ERROR', {message: 'This Pallet belongs to Location ' + pickLocationStoreRow.customerAddress + ', dropping it to same location via Pick activity is not allowed.', status: 'error', statusCode: '403'});
//                        }
//                    } else {

                    flowController.emit('17', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
//                    }
                } else {

                    flowController.emit('15', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            // Dispatch rule wise routing
            flowController.on('15', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('15') : '';
                var dispatchRule = dispatchRuleRow.name;

                if (dispatchRule == 'NONE') {
                    // most efficient routing
                    flowController.emit('16', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                } else {

                    if (dispatchRule === 'FIFO') {

                        itemStoreRow.sort(function (a, b) {
                            return parseFloat(a.timeCreated) - parseFloat(b.timeCreated);
                        });

                        setTimeout(function (e) {

                            sortedItemStoreRow = [];
                            async.eachSeries(itemStoreRow, function (element, callback) {

                                if (sortedItemStoreRow.length < requiredQuantity) {

                                    sortedItemStoreRow.push(element);
                                    setImmediate(callback);
                                } else {

                                    setImmediate(callback);
                                }
                            }, function (err) {
                                if (err) {
                                    console.log(err);
                                }

                                flowController.emit('16', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, sortedItemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                            });
                        }, 200);

                    } else if (dispatchRule === 'FMFO') {
                        itemStoreRow.sort(function (a, b) {
                            return parseFloat(a.timeManufactured) - parseFloat(b.timeManufactured);
                        });
                        setTimeout(function () {

                            sortedItemStoreRow = [];
                            async.eachSeries(itemStoreRow, function (element, callback) {

                                if (sortedItemStoreRow.length < requiredQuantity) {

                                    sortedItemStoreRow.push(element);
                                    setImmediate(callback);
                                } else {

                                    setImmediate(callback);
                                }
                            }, function (err) {
                                if (err) {
                                    console.log(err);
                                }

                                flowController.emit('16', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, sortedItemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                            });
                        }, 200);

                    } else if (dispatchRule === 'FEFO') {
                        itemStoreRow.sort(function (a, b) {
                            return parseFloat(a.timeExpiry) - parseFloat(b.timeExpiry);
                        });

                        setTimeout(function () {

                            sortedItemStoreRow = [];
                            async.eachSeries(itemStoreRow, function (element, callback) {

                                if (sortedItemStoreRow.length < requiredQuantity) {

                                    sortedItemStoreRow.push(element);
                                    setImmediate(callback);
                                } else {

                                    setImmediate(callback);
                                }
                            }, function (err) {
                                if (err) {
                                    console.log(err);
                                }

                                flowController.emit('16', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, sortedItemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                            });
                        }, 200);

                    } else {// LIFO

                        itemStoreRow.sort(function (a, b) {
                            return parseFloat(b.timeCreated) - parseFloat(a.timeCreated);
                        });

                        setTimeout(function () {

                            sortedItemStoreRow = [];
                            async.eachSeries(itemStoreRow, function (element, callback) {

                                if (sortedItemStoreRow.length < requiredQuantity) {

                                    sortedItemStoreRow.push(element);
                                    setImmediate(callback);
                                } else {

                                    setImmediate(callback);
                                }

                            }, function (err) {
                                if (err) {
                                    console.log(err);
                                }

                                flowController.emit('16', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, sortedItemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                            });
                        }, 200);
                    }
                }
            });
            //
            // Consolidating item store against each location store
            flowController.on('16', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('16') : '';
                var locationStoreArray = [];
                var promise_getLocationUniqueArray = new Promises(function (resolve, reject) {

                    async.eachSeries(itemStoreRow, function (element, callback) {

                        if (locationStoreArray.indexOf(element.locationStoreId) == -1) {

                            locationStoreArray.push(element.locationStoreId);
                            setImmediate(callback);
                        } else {

                            setImmediate(callback);
                        }

                    }, function (err) {

                        resolve(locationStoreArray);
                    });
                });

                promise_getLocationUniqueArray.then(function (promise1_resolvedData) {

                    finalObjectArray = [];
                    async.eachSeries(promise1_resolvedData, function (element, callback) {

                        var itemStoreIdArray = [];
                        var serialNumberArray = [];
                        async.eachSeries(itemStoreRow, function (element2, callback2) {

                            if (element2.locationStoreId == element) {

                                itemStoreIdArray.push(element2.itemStoreId);
                                serialNumberArray.push(element2.itemSerialNumber);
                                callback2();
                            } else {

                                callback2();
                            }
                        }, function (err) {

                            var obj = {'locationStoreId': element,
                                'itemStoreId': itemStoreIdArray,
                                'serialNumberArray': serialNumberArray
                            };
                            finalObjectArray.push(obj);
                            setImmediate(callback);
                        });

                    }, function (err) {
                        flowController.emit('16.0', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, finalObjectArray, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                        //flowController.emit('19', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, finalObjectArray, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    });

                }, function (promise1_rejectedData) {
                    flowController.emit('ERROR', {message: 'Internal Error fetching pick sublists!', status: 'error', statusCode: '500'});
                });
            });

            // Take all locations one by one to provide complete quantity for picking purpose
            flowController.on('16.0', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('16.0') : '';
                var totalObject = itemStoreRow;

                var finalObject = [];
                async.eachSeries(totalObject, function (lastObject, asyncCallback) {

                    locationStoreModel.findOne({'_id': lastObject.locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                        if (err) {

                            asyncCallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickLocationStoreRow == null) {
                            asyncCallback({message: "Data missing! records tampered/removed from system.", status: 'error', statusCode: '404'});
                        } else {

                            totalItems = [];
                            serialNumbers = [];
                            async.eachSeries(pickLocationStoreRow.assignedItemStoreId, function (element, callback) {

                                itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {
                                    if (itemStoreRow.itemMasterId == itemMasterRow._id) {

                                        totalItems.push(element);
                                        serialNumbers.push(itemStoreRow.itemSerialNumber);
                                        setImmediate(callback);
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    asyncCallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    lastObject.itemStoreId = totalItems;
                                    lastObject.availableItems = totalItems.length;
                                    lastObject.serialNumberArray = serialNumbers;

                                    finalObject.push(lastObject);
                                    setImmediate(asyncCallback);
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        asyncCallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('16.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, finalObject, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    }
                });
            });
            //
            // Add quantity reserved for pick and available for pick after iteration
            flowController.on('16.1', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('16.1') : '';
                var totalObject = itemStoreRow;

                var finalObject = [];
                async.eachSeries(totalObject, function (lastObject, asyncCallback) {

                    var availableQuantityAtThisLocation = lastObject.availableItems;

                    locationStoreModel.findOne({'_id': lastObject.locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                        if (err) {

                            asyncCallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickLocationStoreRow == null) {
                            asyncCallback({message: "Data missing! records tampered/removed from system.", status: 'error', statusCode: '404'});
                        } else {

                            pickSubListModel.find({'pickLocationId': pickLocationStoreRow._id, 'pickActivity': 'PARTIAL', 'itemType': itemType, 'itemValue': itemValue, 'status': {'$lt': 31}, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {

                                if (err) {

                                    asyncCallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (pickSubListRow.length == 0) {

                                    lastObject.reservedQuantity = 0;
                                    lastObject.availableForPickQuantity = lastObject.availableItems;
                                    finalObject.push(lastObject);
                                    setImmediate(asyncCallback);
                                } else {

                                    totalReserved = 0;
                                    async.eachSeries(pickSubListRow, function (element, callback) {

                                        totalReserved = totalReserved + element.requiredQuantity;
                                        setImmediate(callback);

                                    }, function (err) {

                                        var remaining = availableQuantityAtThisLocation - totalReserved;

                                        lastObject.reservedQuantity = totalReserved;
                                        lastObject.availableForPickQuantity = remaining;

                                        finalObject.push(lastObject);
                                        setImmediate(asyncCallback);
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('16.2', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, finalObject, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    }
                });
            });
            //
            // Check if final required quantity is available in warehouse from inventory or not
            flowController.on('16.2', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('16.2') : '';
                var totalObject = itemStoreRow;

                var totalAvailableForPick = 0;
                async.eachSeries(totalObject, function (lastObject, asyncCallback) {

                    totalAvailableForPick = totalAvailableForPick + lastObject.availableForPickQuantity;
                    setImmediate(asyncCallback);

                }, function (err) {

                    if (totalAvailableForPick < requiredQuantity) {

                        flowController.emit('ERROR', {message: 'Currently, required quantity not available in warehouse for pick activity. Current available quantity: ' + totalAvailableForPick, status: 'error', statusCode: '500'});
                    } else {

                        //resultArray = totalObject.slice(0, parseInt(requiredQuantity));

                        flowController.emit('19', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, totalObject, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    }
                });
            });
            //
            // For type = PALLET/SERIALNUMBER Generate item store
            flowController.on('17', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('17') : '';
                var itemStoreRowObject = {};
                var itemStoreId = [];
                var itemSerialNumberArray = [];
                if (itemType == 'PALLET') {

                    async.eachSeries(itemStoreRow, function (element, callback) {

                        itemStoreId.push(String(element._id));
                        ('itemSerialNumber' in element) ? itemSerialNumberArray.push(element.itemSerialNumber) : '';
                        setImmediate(callback);

                    }, function (err) {

                        var palletType = itemStoreRow[0].randomFields[0].palletType;
                        var palletSize = itemStoreRow[0].randomFields[0].palletSize;

                        itemStoreRowObject.itemStoreId = itemStoreId;
                        (palletType === 'O') ? itemStoreRowObject.customPalletNumber = itemStoreRow[0].customPalletNumber : '';
                        itemStoreRowObject.palletType = palletType;
                        itemStoreRowObject.palletSize = palletSize;
                        itemStoreRowObject.serialNumberArray = itemSerialNumberArray;

                        flowController.emit('18', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRowObject, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    });

                } else {

                    itemStoreId.push(String(itemStoreRow._id));
                    itemSerialNumberArray.push(itemStoreRow.itemSerialNumber);

                    itemStoreRowObject.itemStoreId = itemStoreId;
                    itemStoreRowObject.palletType = '';
                    itemStoreRowObject.palletSize = '';
                    itemStoreRowObject.serialNumberArray = itemSerialNumberArray;

                    flowController.emit('18', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRowObject, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            //For type = PALLET/SERIALNUMBER
            flowController.on('18', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('18') : '';
                pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().sort({'sequence': -1}).exec(function (err, pickSubListRow) {

                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var sequence = (pickSubListRow.length == 0) ? 1 : (pickSubListRow[0].sequence + 1);
                        var newPickSubList = new pickSubListModel();
                        newPickSubList.pickListId = pickListId;
                        newPickSubList.itemCode = itemMasterRow.itemCode;
                        newPickSubList.itemType = itemType;
                        newPickSubList.itemValue = itemValue;
                        newPickSubList.palletType = itemStoreRow.palletType;
                        newPickSubList.palletSize = itemStoreRow.palletSize;
                        newPickSubList.pickActivity = 'FULL';
                        newPickSubList.customPalletNumber = itemStoreRow.customPalletNumber;
                        newPickSubList.hopperPriority = hopperPriority;
                        newPickSubList.itemStoreId = itemStoreRow.itemStoreId;
                        newPickSubList.serialNumberArray = itemStoreRow.serialNumberArray;
                        newPickSubList.itemDescription = itemDescription;
                        newPickSubList.requiredQuantity = requiredQuantity;
                        newPickSubList.pickLocationId = pickLocationStoreRow._id;
                        newPickSubList.pickLocationAddress = pickLocationStoreRow.customerAddress;
                        newPickSubList.dropLocationId = dropLocationStoreRow._id;
                        newPickSubList.dropLocationAddress = dropLocationStoreRow.customerAddress;
                        newPickSubList.sequence = sequence;
                        newPickSubList.createdBy = createdBy;
                        newPickSubList.timeCreated = timeInInteger;
                        if (orderNumber != "") {
                            newPickSubList.orderNumber = orderNumber;
                        }
                        newPickSubList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                currentActivityStatusFunction('PICK', insertedRecordDetails._id.toString(), 'PICK - Scheduled(UI)');

                                var query = {'_id': pickListId};
                                var update = {'$addToSet': {'pickSubLists': insertedRecordDetails._id.toString()}};

                                pickListModel.update(query, update, function (err) {

                                    if (err) {
                                        // error while adding records
                                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                        deviceId = '';
                                        pickLocationAddress = (pickLocationStoreRow.customerAddress) ? pickLocationStoreRow.customerAddress : '';
                                        dropLocationAddress = (dropLocationStoreRow.customerAddress) ? dropLocationStoreRow.customerAddress : '';
                                        flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, pickLocationAddress, dropLocationAddress, pickListId);
                                        flowController.emit('18.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // If it is CPN then add all other Outer pallets to line items
            flowController.on('18.1', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                if (itemType != 'PALLET') {

                    flowController.emit('DONE', {message: 'New Pick-Sublist added into the system!', status: 'success', statusCode: '200'});
                } else if (!itemStoreRow.customPalletNumber) {

                    flowController.emit('DONE', {message: 'New Pick-Sublist added into the system!', status: 'success', statusCode: '200'});
                } else {

                    var customPalletNumber = itemStoreRow.customPalletNumber;
                    itemStoreModel.distinct('palletNumber', {"customPalletNumber": customPalletNumber}).exec(function (err, palletNumberArray) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (palletNumberArray.length == 0) {

                            flowController.emit('ERROR', {message: "No outer pallets found", status: 'error', statusCode: '304'});
                        } else {

                            console.log('Item storr length: ' + palletNumberArray.length);

                            async.eachSeries(palletNumberArray, function (element, callback) {

                                if (element == itemValue) {

                                    setImmediate(callback);
                                } else {

                                    pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().sort({'sequence': -1}).exec(function (err, pickSubListRow) {

                                        if (err) {

                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            var sequence = (pickSubListRow.length == 0) ? 1 : (pickSubListRow[0].sequence + 1);
                                            var newPickSubList = new pickSubListModel();
                                            newPickSubList.pickListId = pickListId;
                                            newPickSubList.itemCode = itemMasterRow.itemCode;
                                            newPickSubList.itemType = itemType;
                                            newPickSubList.itemValue = element;////
                                            newPickSubList.palletType = itemStoreRow.palletType;
                                            newPickSubList.palletSize = itemStoreRow.palletSize;
                                            newPickSubList.pickActivity = 'FULL';
                                            newPickSubList.customPalletNumber = itemStoreRow.customPalletNumber;
                                            newPickSubList.hopperPriority = hopperPriority;
                                            //newPickSubList.itemStoreId = itemStoreRow.itemStoreId;
                                            //newPickSubList.serialNumberArray = itemStoreRow.serialNumberArray;
                                            newPickSubList.itemDescription = itemDescription;
                                            newPickSubList.requiredQuantity = requiredQuantity;
                                            newPickSubList.pickLocationId = pickLocationStoreRow._id;
                                            newPickSubList.pickLocationAddress = pickLocationStoreRow.customerAddress;
                                            newPickSubList.dropLocationId = dropLocationStoreRow._id;
                                            newPickSubList.dropLocationAddress = dropLocationStoreRow.customerAddress;
                                            newPickSubList.sequence = sequence;
                                            newPickSubList.createdBy = createdBy;
                                            newPickSubList.timeCreated = timeInInteger;
                                            if (orderNumber != "") {
                                                newPickSubList.orderNumber = orderNumber;
                                            }
                                            newPickSubList.save(function (err, insertedRecordDetails) {
                                                if (err) {

                                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else {

                                                    currentActivityStatusFunction('PICK', insertedRecordDetails._id.toString(), 'PICK - Scheduled(UI)');

                                                    var query = {'_id': pickListId};
                                                    var update = {'$addToSet': {'pickSubLists': insertedRecordDetails._id.toString()}};

                                                    pickListModel.update(query, update, function (err) {

                                                        if (err) {
                                                            // error while adding records
                                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                        } else {

                                                            itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                                            deviceId = '';
                                                            pickLocationAddress = (pickLocationStoreRow.customerAddress) ? pickLocationStoreRow.customerAddress : '';
                                                            dropLocationAddress = (dropLocationStoreRow.customerAddress) ? dropLocationStoreRow.customerAddress : '';
                                                            flowController.emit('LOG', itemCode, itemType, element, deviceId, pickLocationAddress, dropLocationAddress, pickListId);
                                                            setImmediate(callback);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', err);
                                } else {

                                    flowController.emit('18.2', customPalletNumber);
                                }
                            });
                        }
                    });
                }
            });
            //
            //
            flowController.on('18.2', function (customPalletNumber) {

                (showConsole) ? console.log('18.2') : '';
                pickSubListModel.find({'pickListId': pickListId, 'customPalletNumber': customPalletNumber, 'activeStatus': 1}).exec(function (err, pickSubListRow) {

                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(pickSubListRow, function (element, callback) {

                            var pickSubListId = String(element._id);

                            itemStoreModel.find({'palletNumber': element.itemValue, 'activeStatus': 1}, function (err, itemStoreRow) {
                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow == null) {

                                    callback({message: "No item with this serial number available in warehouse for Pick.", status: 'error', statusCode: '404'});
                                } else {

                                    var itemStoreId = [];
                                    var serialNumberArray = [];
                                    async.eachSeries(itemStoreRow, function (element2, callback2) {

                                        itemStoreId.push(String(element2._id));
                                        serialNumberArray.push(String(element2.itemSerialNumber));
                                        setImmediate(callback2);

                                    }, function () {
                                        console.log('hi2');
                                        var query = {'_id': pickSubListId};
                                        var update = {'$set': {'itemStoreId': itemStoreId, 'serialNumberArray': serialNumberArray}};

                                        pickSubListModel.update(query, update, function (err) {
                                            if (err)
                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            else
                                                setImmediate(callback);
                                        });
                                    });
                                }
                            });
                        }, function () {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('DONE', {message: 'New Pick-Sublist added into the system!', status: 'success', statusCode: '200'});
                        });
                    }
                });
            });
            //
            // Item Code : Check if required quantity is available for pick process in the warehouse
            flowController.on('19', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('19') : '';
                var arrayToPush = [];
                var added = 0;
                async.eachSeries(itemStoreRow, function (element, callback) {

                    var availableForPickQuantity = element.availableForPickQuantity;
                    added = added + availableForPickQuantity;
                    if (added >= requiredQuantity) {

                        arrayToPush.push(element);
                        callback({process: 'done'});
                    } else {

                        arrayToPush.push(element);
                        setImmediate(callback);
                    }
                }, function (err) {
                    if (err && err.process == 'done') {

                        flowController.emit('19.1', itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, arrayToPush, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea);
                    } else {

                        console.log('No process further');
                    }
                });
            });
            //
            // For type = ITEMCODE
            flowController.on('19.1', function (itemMasterRow, dispatchRuleRow, functionAreaRow, allowedZoneArray, itemStoreRow, pickLocationStoreRow, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('19.1') : '';
                console.log(itemStoreRow);

                unaddedQuantity = parseInt(requiredQuantity);

                async.eachSeries(itemStoreRow, function (element, callback) {

                    if (element.availableForPickQuantity != 0) {

                        locationStoreModel.findOne({'_id': element.locationStoreId, 'activeStatus': 1}, function (err, locationRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                            } else {

                                pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().sort({'sequence': -1}).exec(function (err, pickSubListRow) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        var sequence = (pickSubListRow.length == 0) ? 1 : (pickSubListRow[0].sequence + 1);
                                        var qReserved = parseInt(element.reservedQuantity);
                                        var qAvailableForPick = parseInt(element.availableForPickQuantity);

                                        if (qAvailableForPick <= unaddedQuantity) {
                                            if (qReserved == 0)
                                                pickActivity = 'FULL';
                                            else
                                                pickActivity = 'PARTIAL';

                                            specificRequired = (unaddedQuantity - (unaddedQuantity - qAvailableForPick));
                                        } else {
                                            pickActivity = 'PARTIAL';
                                            if ((unaddedQuantity - qAvailableForPick) <= 0)
                                                specificRequired = unaddedQuantity;
                                            else
                                                specificRequired = qAvailableForPick;
                                        }

                                        var newPickSubList = new pickSubListModel();
                                        newPickSubList.pickListId = pickListId;
                                        newPickSubList.itemCode = itemMasterRow.itemCode;
                                        newPickSubList.itemType = itemType;
                                        newPickSubList.itemValue = itemValue;
                                        newPickSubList.palletType = 'L';
                                        newPickSubList.palletSize = '';
                                        newPickSubList.pickActivity = pickActivity;
                                        newPickSubList.inHopper = 'NO';
                                        newPickSubList.hopperPriority = hopperPriority;
                                        newPickSubList.itemStoreId = element.itemStoreId;
                                        newPickSubList.serialNumberArray = element.serialNumberArray;
                                        newPickSubList.itemDescription = itemDescription;
                                        newPickSubList.requiredQuantity = specificRequired;
                                        newPickSubList.pickLocationId = locationRow._id;
                                        newPickSubList.pickLocationAddress = locationRow.customerAddress;
                                        newPickSubList.dropLocationId = dropLocationStoreRow._id;
                                        newPickSubList.dropLocationAddress = dropLocationStoreRow.customerAddress;
                                        newPickSubList.sequence = sequence;
                                        newPickSubList.createdBy = createdBy;
                                        newPickSubList.timeCreated = timeInInteger;

                                        newPickSubList.save(function (err, insertedRecordDetails) {
                                            if (err) {

                                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                currentActivityStatusFunction('PICK', insertedRecordDetails._id.toString(), 'PICK - Scheduled(UI)');

                                                unaddedQuantity = unaddedQuantity - specificRequired;
                                                var pickSubListId = String(insertedRecordDetails._id);
                                                var query = {'_id': pickListId};
                                                var update = {'$addToSet': {'pickSubLists': pickSubListId}};

                                                pickListModel.update(query, update, function (err) {

                                                    if (err) {
                                                        // error while adding records
                                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {
                                                        setTimeout(function () {

                                                            itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                                            deviceId = '';
                                                            pickLocationAddress = (locationRow.customerAddress) ? locationRow.customerAddress : '';
                                                            dropLocationAddress = (dropLocationStoreRow.customerAddress) ? dropLocationStoreRow.customerAddress : '';
                                                            flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, pickLocationAddress, dropLocationAddress, pickListId);
                                                            setImmediate(callback);
                                                        }, 10);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else {

                        setImmediate(callback);
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('DONE', {message: 'New Pick-Sublist added into the system!', status: 'success', statusCode: '200'});
                    }
                });
            });
            //
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemType, itemValue, deviceId, pickLocationAddress, dropLocationAddress, pickListId) {
                pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        console.log({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        console.log({message: 'No Pick-List available !', status: 'error', statusCode: '404'});
                    } else {

                        usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                console.log({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                console.log({message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                            } else {

                                username = (userRow.username) ? userRow.username : '';
                                fs.appendFile(pathPickSubList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PICKSUBLIST' + ',' + username + ',' + pickListRow.name + ',' + itemCode + ',' + itemType + ',' + itemValue + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddress + ',' + dropLocationAddress + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        console.log(err);
                                        console.log({message: 'Error while update Pick-Sublist. ', status: 'error', statusCode: '500'});
                                    } else {

                                        console.log('append pickSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';
                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-CREATE',
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
            //
            // START
            flowController.emit('START');
        });
//    
//            
//---------------------------------------------------------------------------------------------------------------------------
// Update Pick-Sublist        
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/update/pickSubList/')

        .patch(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var pickSubListId = req.body.pickSubListId.trim();

            var newQuantity = req.body.newQuantity.trim();

            var dropLocationAddress = req.body.dropLocationAddress.trim();

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            // Check if in hopper or not
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'activeStatus': 1}, function (err, pickSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        if (pickSubListRow.status < 11) {

                            flowController.emit('SWITCH', pickSubListRow);
                        } else {

                            flowController.emit('ERROR', {message: 'Pick-List already activated! Edit not allowed.', status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            //
            // Check what type of line item is it
            flowController.on('SWITCH', function (pickSubListRow) {

                (showConsole) ? console.log('SWITCH') : '';
                if (pickSubListRow.itemType == 'ITEMCODE') {

                    flowController.emit('QUANTITY-EDIT', pickSubListRow);
                } else {

                    flowController.emit('DROP-LOCATION-EDIT', pickSubListRow);
                }
            });
            //
            // Drop location Edit (For ITEM CODE Only)
            flowController.on('QUANTITY-EDIT', function (pickSubListRow) {

                (showConsole) ? console.log('QUANTITY-EDIT') : '';
                var currentQuantity = pickSubListRow.requiredQuantity;
                if (newQuantity == currentQuantity) {
                    var currentDropLocationAddress = pickSubListRow.dropLocationAddress;
                    if (dropLocationAddress == currentDropLocationAddress) {

                        flowController.emit('ERROR', {message: 'No edit has been done yet!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('DROP-LOCATION-EDIT', pickSubListRow);
                    }
                } else if (newQuantity < currentQuantity) {
                    // allow to update as quantity decreasing
                    flowController.emit('Q5', pickSubListRow);
                } else {

                    flowController.emit('Q1', pickSubListRow);
                }
            });
            //
            // Quantity edit (For ITEM CODE Only)
            flowController.on('Q1', function (pickSubListRow) {

                (showConsole) ? console.log('Q1') : '';
                pickLocationId = pickSubListRow.pickLocationId;

                locationStoreModel.findOne({'_id': pickLocationId, 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickLocationStoreRow == null) {
                        res.json({message: 'Location data tampered/removed! Contact customer-support.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('Q2', pickSubListRow, pickLocationStoreRow);
                    }
                });
            });
            //
            // Get item master details
            flowController.on('Q2', function (pickSubListRow, pickLocationStoreRow) {

                (showConsole) ? console.log('Q2') : '';
                var itemCode = pickSubListRow.itemCode;
                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('Q3', pickSubListRow, pickLocationStoreRow, itemMasterRow);
                    }
                });
            });
            //
            // Find available quantity at pick location for this item
            flowController.on('Q3', function (pickSubListRow, pickLocationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('Q3') : '';
                var itemMasterId = String(itemMasterRow._id);
                var itemStoreArray = [];
                async.eachSeries(pickLocationStoreRow.assignedItemStoreId, function (element, callback) {

                    itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {
                        if (itemStoreRow.itemMasterId == itemMasterId) {

                            itemStoreArray.push(itemStoreRow);
                            setImmediate(callback);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {
                        Console.log(err);
                    } else {

                        var availableQuantity = itemStoreArray.length;

                        flowController.emit('Q4', pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray);
                    }
                });
            });
            //
            // Check if any pick other that this list is scheduled for this item
            flowController.on('Q4', function (pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray) {

                (showConsole) ? console.log('Q4') : '';
                var pickLocationId = String(pickLocationStoreRow._id);
                var itemCode = itemMasterRow.itemCode;
                pickSubListModel.find({'_id': {'$ne': pickSubListId}, 'status': {"$lt": 31}, 'itemCode': itemCode, 'pickLocationId': pickLocationId, 'activeStatus': 1}, function (err, pickSubListRow2) {

                    if (pickSubListRow2.length == 0) {

                        if (availableQuantity >= newQuantity) {

                            flowController.emit('Q6', pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray);
                        } else {

                            flowController.emit('ERROR', {message: "Required quantity is not available at Pick location! Current available for this item is " + availableQuantity + ".", status: 'error', statusCode: '404'});
                        }
                    } else {

                        var totalPickReservedCapacity = 0;
                        async.eachSeries(pickSubListRow2, function (element, callback) {

                            totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                            setImmediate(callback);

                        }, function (err) {

                            availableCapacityForPickOfThisItem = availableQuantity - totalPickReservedCapacity;

                            if (availableCapacityForPickOfThisItem >= newQuantity) {

                                flowController.emit('Q6', pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray);
                            } else {

                                flowController.emit('ERROR', {message: "Quantity at location is not sufficient! Due to other scheduled operations from this location like PICK, current available quantity for this item is " + availableCapacityForPickOfThisItem + ".", status: 'error', statusCode: '500'});
                            }
                        });
                    }
                });
            });
            //
            // Remove the items from array
            flowController.on('Q5', function (pickSubListRow) {

                (showConsole) ? console.log('Q5') : '';
                newItemStoreArray = [];
                newSerialNumberArray = [];
                async.eachSeries(pickSubListRow.itemStoreId, function (element, callback) {

                    if (newItemStoreArray.length < newQuantity) {

                        itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {
                            if (itemStoreRow != null) {

                                newItemStoreArray.push(element);
                                newSerialNumberArray.push(itemStoreRow.itemSerialNumber);
                                setImmediate(callback);
                            }
                        });
                    } else {

                        setImmediate(callback);
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        var query = {'_id': pickSubListId};
                        var update = {'$set': {'itemStoreId': newItemStoreArray, 'newSerialNumberArray': newSerialNumberArray}};

                        pickSubListModel.update(query, update, function (err) {

                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('Q7', pickSubListRow);
                            }
                        });
                    }
                });
            });
            //
            // Update additional quantity in pick sublist
            flowController.on('Q6', function (pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray) {

                (showConsole) ? console.log('Q6') : '';
                var update = 1;
                async.eachSeries(itemStoreArray, function (element, callback) {

                    if (update <= newQuantity) {

                        var query = {'_id': pickSubListId};
                        var update = {'$addToSet': {'itemStoreId': String(element._id), 'serialNumberArray': element.itemSerialNumber}};

                        pickSubListModel.update(query, update, function (err) {

                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                update++;
                                setImmediate(callback);
                            }
                        });
                    } else {

                        setImmediate(callback);
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('Q7', pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray);
                    }
                });
            });
            //
            // Update quantity to sublist
            flowController.on('Q7', function (pickSubListRow, pickLocationStoreRow, itemMasterRow, availableQuantity, itemStoreArray) {

                (showConsole) ? console.log('Q7') : '';
                var query = {'_id': pickSubListId};
                var update = {'$set': {'requiredQuantity': newQuantity, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}};

                pickSubListModel.update(query, update, function (err) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        if (pickSubListRow.dropLocationAddress == dropLocationAddress) {

                            pickListId = pickSubListRow.pickListId;
                            itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                            deviceId = '';//(pickSubListRow.resourceAssigned[0].deviceId) ? pickSubListRow.resourceAssigned[0].deviceId : '';
                            orderNumber = (pickSubListRow.orderNumber) ? pickSubListRow.orderNumber : '';
                            itemType = (pickSubListRow.itemType) ? pickSubListRow.itemType : '';
                            itemValue = (pickSubListRow.itemValue) ? pickSubListRow.itemValue : '';
                            pickLocationAddress = (pickSubListRow.pickLocationAddress) ? pickSubListRow.pickLocationAddress : '';
                            dropLocationAddress = (pickSubListRow.dropLocationAddress) ? pickSubListRow.dropLocationAddress : '';
                            flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress, pickListId);
                            flowController.emit('DONE', {message: "Pick-Sublist quantity updated in system.", status: 'success', statusCode: '200'});
                        } else {

                            flowController.emit('DROP-LOCATION-EDIT', pickSubListRow);
                        }
                    }
                });
            });
            //
            // Drop location edit (For ITEMCODE/SERIALNUMBER/PALLET)
            flowController.on('DROP-LOCATION-EDIT', function (pickSubListRow) {

                (showConsole) ? console.log('DROP-LOCATION-EDIT') : '';
                var currentDropLocationAddress = pickSubListRow.dropLocationAddress;
                if (dropLocationAddress == currentDropLocationAddress) {

                    flowController.emit('ERROR', {message: 'No edit has been done yet!', status: 'error', statusCode: '404'});
                } else {

                    flowController.emit('D');
                }
            });
            //
            // Get updated pickSubList
            flowController.on('D', function (pickSubListRow) {

                (showConsole) ? console.log('D') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'activeStatus': 1}, function (err, pickSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        if (pickSubListRow.status < 11) {

                            flowController.emit('D1', pickSubListRow);
                        } else {

                            flowController.emit('ERROR', {message: 'Pick-List already activated! Edit not allowed.', status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            //
            // Pick location details
            flowController.on('D1', function (pickSubListRow) {

                (showConsole) ? console.log('D1') : '';
                pickLocationId = pickSubListRow.pickLocationId;

                locationStoreModel.findOne({'_id': pickLocationId, 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickLocationStoreRow == null) {
                        res.json({message: 'Location data tampered/removed! Contact customer-support.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('D2', pickSubListRow, pickLocationStoreRow);
                    }
                });
            });
            //
            // Get pick location function 
            flowController.on('D2', function (pickSubListRow, pickLocationStoreRow) {

                (showConsole) ? console.log('D2') : '';
                pickLocationFunctionId = pickLocationStoreRow.function;

                functionAreaModel.findOne({'_id': pickLocationFunctionId, 'activeStatus': 1}, function (err, pickFunctionArea) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickFunctionArea == null) {

                        res.json({message: 'Pick function area data tampered/removed! Contact customer-support.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('D3', pickSubListRow, pickLocationStoreRow, pickFunctionArea);
                    }
                });
            });
            // 
            // Drop location details with Rule engine compatibility if line item is of type PALLET
            flowController.on('D3', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea) {

                (showConsole) ? console.log('D3') : '';
                locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'availability': 'A', 'activeStatus': 1}, function (err, dropLocationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (dropLocationStoreRow == null) {
                        flowController.emit('ERROR', {message: "Drop location is blocked! Can't proceed further.", status: 'error', statusCode: '404'});
                    } else if (pickSubListRow.pickLocationAddress == dropLocationAddress) {
                        // Dropping at pick location not allowed
                        flowController.emit('ERROR', {message: "This Pallet belongs to Location " + dropLocationAddress + ", dropping it to same location via Pick activity is not allowed.", status: 'error', statusCode: '404'});
                    } else {

                        if (pickSubListRow.itemType == 'PALLET') {

                            var palletType = pickSubListRow.palletType;
                            var palletSize = pickSubListRow.palletSize;

                            ruleEngineModel.findOne({'location': dropLocationAddress, 'activeStatus': 1}, function (err, ruleEngineRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (ruleEngineRow == null) {

                                    flowController.emit('ERROR', {message: "Location not configured in Rule Engine! Add location to rule engine first.", status: 'error', statusCode: '404'});
                                } else {

                                    if (ruleEngineRow.palletType.indexOf(palletType) == -1 || ruleEngineRow.palletSize.indexOf(palletSize) == -1) {

                                        flowController.emit('ERROR', {message: "Location not eligible to drop Pallet with Pallet Type/Size : (" + palletType + "/" + palletSize + "), Allowed Pallet Types at " + dropLocationAddress + " are: " + ruleEngineRow.palletType + " & Pallet Sizes are: " + ruleEngineRow.palletSize, status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('D3A', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                                    }
                                }
                            });
                        } else {

                            flowController.emit('D3A', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                        }
                    }
                });
            });
            //
            // Check if drop location quantity 
            flowController.on('D3A', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow) {

                (showConsole) ? console.log('D3A') : '';
                var requiredQuantity = pickSubListRow.requiredQuantity;
                var length = dropLocationStoreRow.locationProperties.length;
                if (length == 0) {

                    flowController.emit('ERROR', {message: "Capacity of the location not defined yet.", status: 'error', statusCode: '404'});
                } else {

                    var userDefinedCapacity = dropLocationStoreRow.locationProperties[0].userDefinedCapacity;

                    if (userDefinedCapacity != "") {

                        if (userDefinedCapacity == '-1') {

                            flowController.emit('D4', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                        } else {

                            var availableCapacity = dropLocationStoreRow.availableCapacity;

                            (showConsole) ? console.log('available quantity: ' + availableCapacity) : '';
                            if (availableCapacity < requiredQuantity) {

                                flowController.emit('ERROR', {message: "Available capacity at drop location is not sufficient! Current available capacity: " + availableCapacity, status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('D3.0', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                            }
                        }
                    } else {
                        // capacity calculation part
                        flowController.emit('ERROR', {message: "System defined calculation coming soon.", status: 'error', statusCode: '404'});
                    }
                }
            });
            //
            // Check for drop location's holding type 
            flowController.on('D3.0', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow) {

                (showConsole) ? console.log('D3.0') : '';
                var itemType = pickSubListRow.itemType;
                var dropLocationHoldingType = dropLocationStoreRow.holdingType;
                holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (holdingTypeRow == null) {
                        flowController.emit('ERROR', {message: "Drop location's Holding type details tampered/modified!", status: 'error', statusCode: '404'});
                    } else {

                        holdingType = holdingTypeRow.name;

                        if (itemType == 'PALLET') {

                            if (holdingType != 'PALLET') {

                                if (holdingType != 'ANY') {

                                    flowController.emit('ERROR', {message: "Pallet not allowed to be put at location " + dropLocationAddress + " as the location is a Non-Pallet location! However, you can allow pallets to be dropped here by changing the properties of " + dropLocationAddress + " in Location Master.", status: 'error', statusCode: '404'});
                                } else {

                                    flowController.emit('D3.1', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                                }
                            } else {

                                flowController.emit('D3.1', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                            }
                        }

                        if (itemType == 'ITEMCODE' || itemType == 'SERIALNUMBER') {

                            if (holdingType == 'PALLET') {

                                flowController.emit('ERROR', {message: "Location: " + dropLocationAddress + " holds Pallets only! Loose boxes are not allowed here. However, you can allow loose box here by changing the properties of " + dropLocationAddress + " in Location Master.", status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('D3.1', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                            }
                        }
                    }
                });
            });
            //
            // Check if capacity reserved in any current PUT activity
            flowController.on('D3.1', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow) {

                (showConsole) ? console.log('D3.1 PUT') : '';
                var dropLocationId = String(dropLocationStoreRow._id);
                putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}).lean().exec(function (err, putSubListRow) {

                    if (putSubListRow.length == 0) {

                        flowController.emit('D3.2', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, 0);
                    } else {

                        availableCapacity = dropLocationStoreRow.availableCapacity;

                        var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                        var remaining = availableCapacity - suggestedCount;
                        (showConsole) ? console.log('available quantity after PUT: ' + remaining) : '';
                        if (remaining >= newQuantity) {

                            flowController.emit('D3.2', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, suggestedCount);
                        } else {

                            flowController.emit('ERROR', {message: "Location capacity is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining, status: 'error', statusCode: '500'});
                        }
                    }
                });
            });
            //
            // Check if capacity reserved in any current PICK activity
            flowController.on('D3.2', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, putReservedCapacity) {

                (showConsole) ? console.log('D3.2 PICK') : '';
                var dropLocationId = String(dropLocationStoreRow._id);
                pickSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow2) {

                    if (pickSubListRow2.length == 0) {

                        flowController.emit('D4', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                    } else {

                        var totalPickReservedCapacity = 0;
                        var customPalletNumber = [];
                        async.eachSeries(pickSubListRow2, function (element, callback) {

                            if (element.itemType === 'PALLET' && element.palletType === 'O') {

                                if (customPalletNumber.indexOf(element.customPalletNumber) == -1) {
                                    customPalletNumber.push(element.customPalletNumber);
                                    totalPickReservedCapacity = totalPickReservedCapacity + 1;
                                }
                                setImmediate(callback);
                            } else {

                                totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                setImmediate(callback);
                            }
                        }, function (err) {

                            availableCapacity = dropLocationStoreRow.availableCapacity;

                            var suggestedCount = totalPickReservedCapacity;

                            var remaining = ((availableCapacity - suggestedCount) - putReservedCapacity);

                            (showConsole) ? console.log('available quantity after PICK: ' + remaining) : '';
                            if (remaining >= newQuantity) {

                                flowController.emit('D4', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow);
                            } else {

                                flowController.emit('ERROR', {message: "Drop location capacity is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity: " + remaining, status: 'error', statusCode: '500'});
                            }
                        });
                    }
                });
            });
            //
            // Get function area for drop
            flowController.on('D4', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow) {

                (showConsole) ? console.log('D4') : '';
                dropFunctionArea = [];
                functionAreaModel.distinct('_id', {'name': {'$in': ['STORAGE', 'DISPATCH', 'REPROCESS', 'SCRAP']}}).exec(function (err, functionAreaMongoIdRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (functionAreaMongoIdRow.length == 0) {

                        flowController.emit('ERROR', {message: "This serial number item's pick location is blocked! Can't proceed further.", status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(functionAreaMongoIdRow, function (element, callback) {

                            dropFunctionArea.push(String(element));
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {
                                flowController.emit('ERROR', err);
                            } else {
                                flowController.emit('D5', pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                            }
                        });
                    }
                });
            });
            //
            //Check if the drop location function is same as pick location function 
            flowController.on('D5', function (pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('D5') : '';
                var itemCode = pickSubListRow.itemCode;
                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('D6', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                    }
                });
            });
            //
            // Get item master details
            flowController.on('D6', function (itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('D6') : '';
                pickProcessFunction = String(pickFunctionArea._id);

                dropLocationFunction = dropLocationStoreRow.function;
                if (dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                    // Drop location function does not belongs to valid pick process drop functions
                    flowController.emit('ERROR', {message: "Drop location not allowed under valid Pick process drop zones.", status: 'error', statusCode: '404'});
                } else {

                    if (pickProcessFunction == dropLocationFunction) {
                        // Pick between same area
                        flowController.emit('D7', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                    } else {

                        flowController.emit('D9', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                    }
                }
            });
            //
            // if the activity is in same area then this flow has to be considered
            // VALIDATE_ITEM_RESERVATION
            flowController.on('D7', function (itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('D7') : '';
                var itemMasterId = String(itemMasterRow._id);
                if (dropLocationStoreRow.isReservedForItem == 'YES') {

                    if (dropLocationStoreRow.reservedItemId.indexOf(itemMasterId) > -1) {

                        if (dropLocationStoreRow.reservedItemId.length > 1) {

                            flowController.emit('D8', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);

                        } else {
                            //
                            flowController.emit('D9', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                        }
                    } else {
                        //
                        flowController.emit('ERROR', {message: 'This location is reserved for different item! Choose different location.', status: 'error', statusCode: '403'});
                    }
                } else {
                    //
                    flowController.emit('D8', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            // VALIDATE_ELIGIBILITY Check eligibility if item is not reserved but present or not OR empty location
            flowController.on('D8', function (itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('D8') : '';
                if (dropLocationStoreRow.assignedItemStoreId.length > 0) {

                    conflictArray = [];
                    async.eachSeries(dropLocationStoreRow.assignedItemStoreId, function (element2, callback2) {

                        itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {
                            if (err) {

                                callback2(err);
                            } else if (itemStoreRow == null) {

                                callback2({message: 'Item not found in warehouse! Item Id ' + element2});
                            } else if (itemStoreRow.itemMasterId == itemMasterRow._id) {

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

                            flowController.emit('ERROR', {message: 'As per the item properties provided by you, this location is not eligible!', status: 'error', statusCode: '403'});
                        } else if (itemMasterRow.exclusiveStorage === 'YES') {

                            flowController.emit('ERROR', {message: 'As per the item properties provided by you, this location is not eligible!!', status: 'error', statusCode: '403'});
                        } else {

                            flowController.emit('D9', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                        }
                    });
                } else {

                    flowController.emit('D9', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                }
            });
            //
            // Update drop location to pickSubList
            flowController.on('D9', function (itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {

                (showConsole) ? console.log('D9') : '';
                var query = {'_id': pickSubListId};
                var update = {'$set': {
                        'dropLocationId': dropLocationStoreRow._id,
                        'dropLocationAddress': dropLocationStoreRow.customerAddress,
                        'timeModified': timeInInteger,
                        'modifiedBy': modifiedBy}
                };

                pickSubListModel.update(query, update, function (err) {

                    if (err) {
                        // error while adding records
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        pickListId = pickSubListRow.pickListId;
                        itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                        serialNumberArray = pickSubListRow.serialNumberArray;
                        deviceId = '';//(pickSubListRow.resourceAssigned[0].deviceId) ? pickSubListRow.resourceAssigned[0].deviceId : '';
                        orderNumber = (pickSubListRow.orderNumber) ? pickSubListRow.orderNumber : '';
                        itemType = (pickSubListRow.itemType) ? pickSubListRow.itemType : '';
                        itemValue = (pickSubListRow.itemValue) ? pickSubListRow.itemValue : '';
                        pickLocationAddress = (pickSubListRow.pickLocationAddress) ? pickSubListRow.pickLocationAddress : '';
                        dropLocationAddress = (pickSubListRow.dropLocationAddress) ? pickSubListRow.dropLocationAddress : '';
                        flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress, pickListId);
                        flowController.emit('D10', itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea);
                    }
                });
            });
            //
            // Bulk update if pallet is outer
            flowController.on('D10', function (itemMasterRow, pickSubListRow, pickLocationStoreRow, pickFunctionArea, dropLocationStoreRow, dropFunctionArea) {
                if (pickSubListRow.palletType != 'O') {

                    flowController.emit('DONE', {message: 'Line item(s) updated!', status: 'success', statusCode: '200'});
                } else {

                    var pickListId = pickSubListRow.pickListId;
                    var customPalletNumber = pickSubListRow.customPalletNumber;
                    var query = {'pickListId': pickListId, 'customPalletNumber': customPalletNumber, 'activeStatus': 1};
                    var update = {'$set': {
                            'dropLocationId': dropLocationStoreRow._id,
                            'dropLocationAddress': dropLocationStoreRow.customerAddress,
                            'timeModified': timeInInteger,
                            'modifiedBy': modifiedBy}
                    };
                    var multi = {'multi': true};

                    pickSubListModel.update(query, update, multi, function (err) {
                        if (err) {
                            // error while adding records
                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('DONE', {message: 'Line item(s) updated!', status: 'success', statusCode: '200'});
                        }
                    });
                }
            });
            //
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress, pickListId) {
                pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        console.log('Picklist not found: ' + err);
                    } else if (pickListRow == null) {

                        console.log('Picklist line items not found: ' + err);
                    } else {
                        usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                console.log('User not found: ' + err);
                            } else if (userRow == null) {

                                console.log('Users not found: ' + err);
                            } else {

                                username = (userRow.username) ? userRow.username : '';
                                pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");

                                fs.appendFile(pathPickSubList, '\n' + 'WEB' + ',' + 'UPDATE' + ',' + 'PICKSUBLIST' + ',' + username + ',' + pickListRow.name + ',' + itemCode + ',' + itemType + ',' + itemValue + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddressRegex + ',' + dropLocationAddressRegex + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        // append failed
                                        console.log('Error occurrend while updating ' + err);
                                    } else {

                                        console.log('append pickSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';
                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(reason) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-UPDATE',
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
            //
            // To be kept at the end always
            flowController.emit('START');
        });
//     
//           
//---------------------------------------------------------------------------------------------------------------------------
// Auto-Route Picklist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/update/auto-route/')

        .patch(function (req, res) {

            var warehouseId = req.body.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickListId = req.body.pickListId.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                pickListModel.findOne({'_id': pickListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No Pick-List available !', status: 'error', statusCode: '404'});
                    } else if (pickListRow == 'FIXED') {
                        flowController.emit('ERROR', {message: 'This list is of fixed type! Auto-route not allowed.', status: 'error', statusCode: '404'});
                    } else {

                        pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().exec(function (err, pickSubListRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                flowController.emit('ERROR', {message: 'No Line items available for Auto-routing!', status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('1', pickSubListRow);
                            }
                        });
                    }
                });
            });
            //
            // Get pick locations based on line items
            flowController.on('1', function (pickSubListRow) {
                var locationSequenceArray = [];
                async.eachSeries(pickSubListRow, function (element, callback) {

                    locationStoreModel.findOne({'customerAddress': element.pickLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow == null) {

                            callback({message: 'Location data missing!', status: 'error', statusCode: '404'});
                        } else {

                            var sequenceId = locationStoreRow.sequenceId;

                            locationSequenceArray.push(sequenceId);

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('2', locationSequenceArray.sort());
                    }
                });
            });
            //
            // Get customer address based on sorted sequence
            flowController.on('2', function (locationSequenceArray) {
                var customerAddressArray = [];
                async.eachSeries(locationSequenceArray, function (element, callback) {

                    locationStoreModel.findOne({'sequenceId': element, 'activeStatus': 1}, function (err, locationStoreRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow == null) {

                            callback({message: 'Location data missing!', status: 'error', statusCode: '404'});
                        } else {

                            var customerAddress = locationStoreRow.customerAddress;
                            customerAddressArray.push(customerAddress);

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('3', customerAddressArray.sort());
                    }
                });
            });
            //
            // Update final sequence
            flowController.on('3', function (customerAddressArray) {

                async.eachSeries(customerAddressArray, function (element, callbackDone) {
                    var query = {'pickListId': pickListId, 'pickLocationAddress': element, 'activeStatus': 1};
                    var update = {'$set': {'sequence': (customerAddressArray.indexOf(element) + 1)}};

                    pickSubListModel.update(query, update, function (err) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('END', {message: 'Sequence updated into the system!', status: 'success', statusCode: '304'});
                    }
                });
            });
            //
            // End
            flowController.on('END', function (result) {

                res.json(result);
            });
            //
            // Error Handling
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-AUTOROUTE',
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
            //
            // Initializer
            flowController.emit('START');
        });
//        
//        
//---------------------------------------------------------------------------------------------------------------------------
// Delete Pick-Sublist          
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/delete/pickSubList/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var pickListId = req.body.pickListId.trim();

            var pickSubListIdArray = (req.body.pickSubListIdArray.length !== 0) ? req.body.pickSubListIdArray : [];

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            // Get Pick line items data
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var pickSubListIdArr = [];

                async.eachSeries(pickSubListIdArray, function (element, callbackDone) {

                    pickSubListModel.findOne({'_id': element, 'pickListId': pickListId, 'status': {$lte: 5}, 'activeStatus': 1}, function (err, pickSubListRow) {

                        if (err) {// Serverside error

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow == null) {// Data already present in database || 304 - not modified

                            callbackDone({message: "Can't remove Line item! It is already activated.", status: 'error', statusCode: '304'});
                        } else {

                            pickSubListIdArr.push(pickSubListRow);
                            setImmediate(callbackDone);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('1', pickSubListIdArr);
                    }
                });
            });
            // If line item is of outer then remove all the line items with that pallet number
            flowController.on('1', function (pickSubListIdArr) {

                (showConsole) ? console.log('1') : '';

                var removedPickSubListArray = [];
                var PickSubListArray = [];
                var uniqueArray = [];

                async.eachSeries(pickSubListIdArr, function (element, callbackDone) {

                    if (element.itemType == 'PALLET' && element.palletType == 'O') {

                        if (uniqueArray.indexOf(element.pickListId) > -1) {

                            setImmediate(callbackDone);
                        } else {

                            pickSubListModel.find({'pickListId': element.pickListId, 'customPalletNumber': element.customPalletNumber, 'activeStatus': 1}, function (err, pickSubListRow) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (pickSubListRow.length == 0) {

                                    callbackDone({message: 'No Line items with CPN: ' + pickSubListRow.customPalletNumber + ' found!', status: 'error', statusCode: '500'});
                                } else {

                                    async.eachSeries(pickSubListRow, function (element, callback) {

                                        element.activeStatus = 2;
                                        element.modifiedBy = modifiedBy;
                                        element.timeModified = timeInInteger;

                                        element.save(function (err) {
                                            if (err) {

                                                callback(err);
                                            } else {

                                                uniqueArray.push(element.pickListId);
                                                removedPickSubListArray.push(element);
                                                setImmediate(callback);
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {

                                            callbackDone(err);
                                        } else {

                                            setImmediate(callbackDone);
                                            //flowController.emit('3', pickSubListRow, removedPickSubListArray);
                                        }
                                    });
                                }
                            });
                        }
                    } else {

                        PickSubListArray.push(element);
                        setImmediate(callbackDone);
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', removedPickSubListArray, PickSubListArray);
                    }
                });
            });
            //
            // Outer case : Remove line item IDs from picklist
            flowController.on('2', function (removedPickSubListArray, PickSubListArray) {

                (showConsole) ? console.log('2') : '';


                if (removedPickSubListArray.length !== 0) {

                    async.eachSeries(removedPickSubListArray, function (element, callback) {

                        var query = {'_id': pickListId};
                        var update = {'$pull': {'pickSubLists': String(element._id)}};

                        pickListModel.update(query, update, function (err) {
                            if (err) {

                                callback(err);
                            } else {

                                itemCode = (element.itemCode) ? element.itemCode : '';
                                deviceId = '';//(pickSubListRow.resourceAssigned[0].deviceId) ? pickSubListRow.resourceAssigned[0].deviceId : '';
                                orderNumber = (element.orderNumber) ? element.orderNumber : '';
                                itemType = (element.itemType) ? element.itemType : '';
                                itemValue = (element.itemValue) ? element.itemValue : '';
                                pickLocationAddress = (element.pickLocationAddress) ? element.pickLocationAddress : '';
                                dropLocationAddress = (element.dropLocationAddress) ? element.dropLocationAddress : '';
                                flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress);
                                setImmediate(callback);
                            }
                        });

                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', err);
                        } else {

                            flowController.emit('3', PickSubListArray);
                        }
                    });
                } else {

                    flowController.emit('3', PickSubListArray);
                }
            });
            //
            // Remove line item IDs from picklist
            flowController.on('3', function (PickSubListArray) {

                (showConsole) ? console.log('3') : '';

                if (PickSubListArray.length !== 0) {

                    async.eachSeries(PickSubListArray, function (element, callbackDone) {

                        var query = {'_id': element._id};
                        var update = {'$set': {'activeStatus': 2, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};

                        pickSubListModel.update(query, update, function (err) {
                            if (err) {

                                callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                setImmediate(callbackDone);
                            }
                        });
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', err);
                        } else {

                            flowController.emit('4', PickSubListArray);
                        }
                    });
                } else {

                    flowController.emit('5');
                }
            });

            flowController.on('4', function (PickSubListArray) {

                async.eachSeries(PickSubListArray, function (element, callback) {

                    var query = {'_id': pickListId};
                    var update = {'$pull': {'pickSubLists': String(element._id)}};

                    pickListModel.update(query, update, function (err) {
                        if (err) {

                            callback(err);
                        } else {

                            itemCode = (element.itemCode) ? element.itemCode : '';
                            deviceId = '';//(pickSubListRow.resourceAssigned[0].deviceId) ? pickSubListRow.resourceAssigned[0].deviceId : '';
                            orderNumber = (element.orderNumber) ? element.orderNumber : '';
                            itemType = (element.itemType) ? element.itemType : '';
                            itemValue = (element.itemValue) ? element.itemValue : '';
                            pickLocationAddress = (element.pickLocationAddress) ? element.pickLocationAddress : '';
                            dropLocationAddress = (element.dropLocationAddress) ? element.dropLocationAddress : '';
                            flowController.emit('LOG', itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress);
                            setImmediate(callback);
                        }
                    });

                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('5');
                    }
                });
            });
            //
            //
            flowController.on('5', function () {

                pickSubListModel.find({pickListId: pickListId, 'activeStatus': 1}).lean().sort({'status': 1}).limit(1).exec(function (err, pickSublistRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        statusUpdate = (pickSublistRow.length == 0) ? 1 : pickSublistRow[0].status;
                        var query = {'_id': pickListId};
                        var update = {'$set': {'status': statusUpdate}};

                        pickListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('DONE', {message: 'Line item(s) removed from system!!', status: 'success', statusCode: '201'});
                            }
                        });
                    }
                });
            });
            //
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemType, itemValue, deviceId, orderNumber, pickLocationAddress, dropLocationAddress) {

                (showConsole) ? console.log('LOG') : '';

                pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        //flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        // flowController.emit('ERROR', {message: 'No Pick-List data available!', status: 'error', statusCode: '404'});
                    } else {

                        usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                //flowController.emit('ERROR', {message: 'No User data available !', status: 'error', statusCode: '404'});
                            } else {

                                username = (userRow.username) ? userRow.username : '';
                                pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                                fs.appendFile(pathPickSubList, '\n' + 'WEB' + ',' + 'DELETE' + ',' + 'PICKSUBLIST' + ',' + username + ',' + pickListRow.name + ',' + itemCode + ',' + itemType + ',' + itemValue + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddressRegex + ',' + dropLocationAddressRegex + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        //flowController.emit('ERROR', err);
                                    } else {


                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';
                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                var dataObject = {MODULE: 'PICK-SUB-LIST-DELETE',
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
            //
            // To be kept at the end always
            flowController.emit('START');
        });
//        
//        
//---------------------------------------------------------------------------------------------------------------------------
// Picklist dashboard headers    
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/get/pickSubListHeader/:pickListId/')

        .get(function (req, res) {

            var pickListId = req.params.pickListId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var putSubListArray = [];
                pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: "No line items found under this Picklist", status: 'error', statusCode: '404'});
                    } else {

                        async.waterfall([
                            //deviceName
                            function (waterfallcallback) {

                                var deivceArrId = [];
                                var uniArray = [];
                                if (pickListRow.resourceAssigned.length == 0) {

                                    waterfallcallback(null, deivceArrId);
                                } else {

                                    async.eachSeries(pickListRow.resourceAssigned, function (element, callback) {

                                        if (uniArray.indexOf(element.deviceId) == -1) {

                                            deviceId = element.deviceId;

                                            uniArray.push(deviceId);

                                            deviceMasterModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceRow) {
                                                if (err) {

                                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (deviceRow == null) {

                                                    callback();
                                                } else {

                                                    deviceName = (deviceRow.name) ? deviceRow.name : deviceRow.model;
                                                    deivceArrId.push(deviceName);
                                                    callback();
                                                }
                                            });
                                        } else {

                                            callback();
                                        }
                                    }, function (err) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            waterfallcallback(null, deivceArrId);
                                        }
                                    });
                                }
                            },
                            //username pickSubList
                            function (deivceArrId, waterfallcallback) {
                                var userNameArr = [];
                                pickSubListModel.find({'pickListId': pickListId, activeStatus: 1}).lean().exec(function (err, pickSubListRow) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (pickSubListRow.length == 0) {

                                        waterfallcallback(null, deivceArrId, userNameArr);
                                    } else {
                                        var uniArray = [];
                                        async.eachSeries(pickSubListRow, function (element, callback) {

                                            if (element.assignedTo) {

                                                if (uniArray.indexOf(element.assignedTo) == -1) {
                                                    uniArray.push(element.assignedTo);

                                                    usersModel.findOne({_id: element.assignedTo, activeStatus: 1}, function (err, userRow) {
                                                        if (err) {

                                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                        } else if (userRow == null) {

                                                            callback();
                                                        } else {

                                                            username = (userRow.username) ? userRow.username : '';
                                                            userNameArr.push(username);
                                                            callback();
                                                        }
                                                    });
                                                } else {

                                                    callback();
                                                }
                                            } else {

                                                callback();
                                            }
                                        }, function (err) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                waterfallcallback(null, deivceArrId, userNameArr);
                                            }
                                        });
                                    }
                                });
                            },
                            //total pickSubList
                            function (deivceArrId, userNameArr, waterfallcallback) {

                                pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListCount) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deivceArrId, userNameArr, pickSubListCount);
                                    }
                                });
                            },
                            //Activated
                            function (deivceArrId, userNameArr, pickSubListCount, waterfallcallback) {

                                pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1, 'status': 11}, function (err, pickSubListActivatedCount) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount);
                                    }
                                });
                            },
                            //Done
                            function (deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount, waterfallcallback) { //Done

                                pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1, 'status': 31}, function (err, pickSubLisDoneCount) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount, pickSubLisDoneCount);
                                    }
                                });
                            },
                            //Skipped
                            function (deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount, pickSubLisDoneCount, waterfallcallback) {

                                pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1, 'status': 33}, function (err, pickSubLisSkippedCount) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount, pickSubLisDoneCount, pickSubLisSkippedCount);
                                    }
                                });
                            },
                            //Result
                            function (deivceArrId, userNameArr, pickSubListCount, pickSubListActivatedCount, pickSubLisDoneCount, pickSubLisSkippedCount, waterfallcallback) {

                                var resources = {userArray: userNameArr,
                                    deviceArray: deivceArrId
                                };
                                var pickListCreated = {
                                    pickListName: pickListRow.name,
                                    pickListMerge: (pickListRow.mergedPickLists.length == 0) ? 'false' : 'true',
                                    status: (pickListRow.status == 1) ? 'Unassigned' : '' || (pickListRow.status == 5) ? 'Withdrawn' : '' || (pickListRow.status == 11) ? 'Activated' : '' || (pickListRow.status == 21) ? 'Assigned' : '' || (pickListRow.status == 25) ? 'In progress' : '' || (pickListRow.status == 31) ? 'Done' : '' || (pickListRow.status == 35) ? 'Done Skipped ' : '' || (pickListRow.status == 41) ? 'Backlog' : '', timeStarted: (pickListRow.timeStarted) ? moment.unix(pickListRow.timeStarted).format("DD/MM/YY") : '', timeAssigned: (pickListRow.timeAssigned) ? moment.unix(pickListRow.timeAssigned).format("DD/MM/YY") : '', timeCompleted: (pickListRow.timeCompleted) ? moment.unix(pickListRow.timeCompleted).format("DD/MM/YY") : '', totalLine: pickSubListCount,
                                    pickSubListActivated: pickSubListActivatedCount,
                                    pickSubListCompleted: pickSubLisDoneCount,
                                    pickSubListSkipped: pickSubLisSkippedCount,
                                    listType: pickListRow.listType,
                                    hopperPriority: pickListRow.hopperPriority,
                                    orderNumber: pickListRow.orderNumber,
                                    materialHandlingUnit: pickListRow.materialHandlingUnit,
                                    resources: resources,
                                    pickRate: (pickListRow.pickRate) ? pickListRow.pickRate : 0};
                                waterfallcallback(null, pickListCreated);
                            }
                        ], function (err, result) {
                            // result now equals 'done'
                            if (err) {
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {
                                putSubListArray.push(result);
                                flowController.emit('END', {data: putSubListArray, message: 'Operation Successful', status: 'success', statusCode: 200});
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
//-----------------------------------------------------------------------------------------------------------------------------------------
//Status changed to withdrawn
//-----------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/update/status-to-withdrawn/')

        .post(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickListId = req.body.pickListId.trim(); // MongoId of the waarehouse

            var pickSubListId = req.body.pickSubListId.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();
            //
            //START
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        if (pickSubListRow.status == 21 || pickSubListRow.status == 33) {

                            deviceId = pickSubListRow.resourceAssigned[0].deviceId;
                            flowController.emit('LOGOUTSTATUS', deviceId);
                        } else {

                            flowController.emit('ERROR', {message: 'Line item can only be withdrawn if it is assigned or skipped.', status: 'error', statusCode: '304'});
                        }
                    }
                });
            });
            //
            //LOGOUTSTATUS
            flowController.on('LOGOUTSTATUS', function (deviceId) {

                (showConsole) ? console.log('LOGOUTSTATUS') : '';
                devicesTrackingModel.find({'deviceId': deviceId, activeStatus: 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (devicesTrackingRow.length == 0) {
                        flowController.emit('ERROR', {message: 'Device Not Found in System!', status: 'error', statusCode: '404'});
                    } else {

                        if (devicesTrackingRow[0].status == 'LOGOUT') {

                            flowController.emit('DELETE');
                        } else {

                            flowController.emit('SOCKETIO');
                        }
                    }
                });
            });
            //
            //SOCKETIO
            flowController.on('SOCKETIO', function () {

                const myCache = appJs.cacheVariable;

                (showConsole) ? console.log('SOCKETIO') : '';
                var keyFound = false;
                var responseValue;
                var gotAndriodWithrawnStatusInterval;
                var countOfInterval = 0;
                io = req.app.get('io');
                
                gotAndriodWithrawnStatusInterval = setInterval(function () {

                    if (gotAndriodWithrawnStatusInterval != null) {

                        myCache.get(pickSubListId, function (err, value) {
                            if (!err) {

                                if (value == undefined) {
                                    keyFound = false;
                                } else {
                                    keyFound = true;
                                    responseValue = value;
                                }
                                var withdrawStatus;

                                if (keyFound) {

                                    withdrawStatus = responseValue.withrawnStatus;

                                    if (responseValue.withrawnStatus)
                                        if (withdrawStatus != "pending") {

                                            clearInterval(gotAndriodWithrawnStatusInterval);
                                            gotAndriodWithrawnStatusInterval = null;
                                            value = myCache.del(pickSubListId);

                                            if (withdrawStatus == 'NO') {

                                                flowController.emit('ERROR', {message: 'Device Working On this Line Item.', status: 'error', statusCode: '304'});
                                            } else if (withdrawStatus == 'YES') {
                                                flowController.emit('DELETE');
                                            }
                                        } else if (countOfInterval == 3) {

                                            clearInterval(gotAndriodWithrawnStatusInterval);
                                            gotAndriodWithrawnStatusInterval = null;
                                            value = myCache.del(pickSubListId);

                                            flowController.emit('END', {message: 'Operation Successfully !', showModalDialog: 'true', status: 'error', statusCode: '304'});

                                        }
                                } else {

                                    var cacheObjToStore = {"pickListId": pickSubListId, "withrawnStatus": "pending"};
                                    var success = myCache.set(pickSubListId, cacheObjToStore);

                                }

                                if (withdrawStatus != 'NO' || withdrawStatus != 'YES') {
                                    countOfInterval = ++countOfInterval;
                                    io.sockets.emit('withdrawn', pickSubListId + '#' + modifiedBy);
                                    console.log('emited' + pickSubListId + '==countOfInterval' + countOfInterval);

                                }
                            }
                        });
                    }
                }, 4000);
            });
            //
            //DELETE
            flowController.on('DELETE', function () {

                (showConsole) ? console.log('DELETE') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick line item not found!', status: 'error', statusCode: '404'});
                    } else {

                        var lot = pickSubListRow.resourceAssigned[0].lot;
                        var deviceId = pickSubListRow.resourceAssigned[0].deviceId;

                        var query = {'_id': pickSubListId};
                        var update = {'$set': {'status': 5, 'resourceAssigned': [], 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};

                        pickSubListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', lot, deviceId);
                            }
                        });
                    }
                });
            });
            //
            // OUTER CASE : Check if line item is of type OUTER
            flowController.on('1', function (lot, deviceId) {

                (showConsole) ? console.log('1') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        var itemType = pickSubListRow.itemType;
                        if (itemType != 'PALLET') {

                            flowController.emit('3', lot, deviceId);
                        } else {
                            if (pickSubListRow.palletType != 'O') {

                                flowController.emit('3', lot, deviceId);
                            } else {

                                flowController.emit('2.1', pickSubListRow, lot, deviceId);
                            }
                        }
                    }
                });
            });
            //
            // OUTER CASE : Check if any line item is pending for drop
            // If found then bring the items back to location from where it is picked
            flowController.on('2.1', function (pickSubListRow, lot, deviceId) {

                (showConsole) ? console.log('2.1') : '';
                var pickListId = pickSubListRow.pickListId;
                var customPalletNumber = pickSubListRow.customPalletNumber;
                pickSubListModel.find({'pickListId': pickListId, 'customPalletNumber': customPalletNumber, 'activeStatus': 1}, function (err, pickSubListRecords) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRecords == null) {

                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2.2', pickSubListRecords, lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAW
            flowController.on('2.2', function (pickSubListRecords, lot, deviceId) {

                (showConsole) ? console.log('2.2') : '';
                processErrors = [];
                async.eachSeries(pickSubListRecords, function (element, callback) {

                    if (element.status == 27) {

                        var itemStoreArray = element.itemStoreId;
                        var pickLocationId = element.pickLocationId;

                        async.waterfall([
                            // Push items back to location from where it has picked before
                            function (waterfallcallback) {

                                async.eachSeries(itemStoreArray, function (element2, callback2) {

                                    var query = {'_id': pickLocationId, 'activeStatus': 1};
                                    var update = {'$addToSet': {'assignedItemStoreId': element2}};
                                    locationStoreModel.update(query, update, function (err) {
                                        if (err) {

                                            processErrors.push({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                        }
                                        setImmediate(callback2);
                                    });
                                }, function (err) {
                                    if (err) {

                                        waterfallcallback(null);
                                    } else {

                                        waterfallcallback(null);
                                    }
                                });
                            },
                            // Update item store locationStoreId to pick location's Id
                            function (waterfallcallback) {

                                async.eachSeries(itemStoreArray, function (element3, callback3) {

                                    var query = {'_id': element3, 'activeStatus': 1};
                                    var update = {'$set': {'locationStoreId': pickLocationId, 'currentActivityStatus': 'PICK-SCHEDULED'}};

                                    itemStoreModel.update(query, update, function (err) {

                                        if (err) {

                                            processErrors.push({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                        }
                                        setImmediate(callback3);

                                    });
                                }, function () {
                                    waterfallcallback(null);
                                });
                            },
                                    // Done
                        ], function (err, result) {

                            setImmediate(callback);
                        });
                    } else {
                        setImmediate(callback);
                    }
                }, function () {
                    if (processErrors.length != 0) {

                        flowController.emit('ERROR', processErrors);
                    } else {

                        flowController.emit('2.3', pickSubListRecords[0], lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAW
            flowController.on('2.3', function (pickSubListRow, lot, deviceId) {

                (showConsole) ? console.log('2.3') : '';
                var pickListId = pickSubListRow.pickListId;
                var customPalletNumber = pickSubListRow.customPalletNumber;
                var query = {'pickListId': pickListId, 'customPalletNumber': customPalletNumber};
                var update = {'$set': {'status': 5, 'resourceAssigned': [], 'pickedQuantity': 0, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};
                var multi = {'multi': true};

                pickSubListModel.update(query, update, multi, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2.4', lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('2.4', function (lot, deviceId) {

                (showConsole) ? console.log('2.4') : '';
                (showConsole) ? console.log('lot: ' + lot) : '';
                (showConsole) ? console.log('deviceId: ' + deviceId) : '';
                pickSubListModel.find({pickListId: pickListId, 'resourceAssigned': {'$elemMatch': {deviceId: deviceId, lot: lot}}, activeStatus: 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var count = (pickSubListRow.length != 0) ? pickSubListRow.length : 0;
                        flowController.emit('2.5', lot, deviceId, count);
                    }
                });
            });
            //
            // OUTER WITHDRAWN GET LOT FROM PICKLIST 
            flowController.on('2.5', function (lot, deviceId, count) {

                (showConsole) ? console.log('2.5') : '';
                pickListModel.findOne({"_id": pickListId, 'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'lot': lot}}}, {'resourceAssigned.$': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No lot found with lot no. ' + lot + ' for device: ' + deviceId, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2.6', lot, deviceId, count, pickListRow);
                    }
                });
            });
            //
            // OUTER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('2.6', function (lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('2.6') : '';
                var resourceObject = pickListRow.resourceAssigned[0];
                var objectId = String(resourceObject._id);
                var userCapacityToBeReduced = resourceObject.capacityAssigned - count;
                console.log('capacity to be reduced: ' + userCapacityToBeReduced);
                if (count == 0) {
                    console.log('Device lot removed');
                    var query = {'_id': pickListId};
                    var update = {'$pull': {'resourceAssigned': {'_id': mongoose.Types.ObjectId(objectId)}}};
                } else {
                    console.log('Device lot updated');
                    var query = {'_id': pickListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                    var update = {'$set': {'resourceAssigned.$.capacityAssigned': count}};
                }

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('4');
                    }
                });
            });
            //
            // OUTER WITHDRAWN GET USER 
            flowController.on('2.7', function (lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('2.7') : '';
            });
            //             // PALLET/SERIALNUMBER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('3', function (lot, deviceId) {

                (showConsole) ? console.log('2.4') : '';
                (showConsole) ? console.log('lot: ' + lot) : '';
                (showConsole) ? console.log('deviceId: ' + deviceId) : '';
                pickSubListModel.find({pickListId: pickListId, 'resourceAssigned': {'$elemMatch': {deviceId: deviceId, lot: lot}}, activeStatus: 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var count = (pickSubListRow.length != 0) ? pickSubListRow.length : 0;
                        flowController.emit('3.1', lot, deviceId, count);
                    }
                });
            });
            //
            // PALLET/SERIALNUMBER WITHDRAWN GET LOT FROM PICKLIST 
            flowController.on('3.1', function (lot, deviceId, count) {

                (showConsole) ? console.log('3.1') : '';
                pickListModel.findOne({"_id": pickListId, 'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'lot': lot}}}, {'resourceAssigned.$': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No lot found with lot no. ' + lot + ' for device: ' + deviceId, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3.2', lot, deviceId, count, pickListRow);
                    }
                });
            });
            //
            // PALLET/SERIALNUMBER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('3.2', function (lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('3.2') : '';
                var resourceObject = pickListRow.resourceAssigned[0];
                var objectId = String(resourceObject._id);
                var userCapacityToBeReduced = resourceObject.capacityAssigned - count;
                console.log('capacity to be reduced: ' + userCapacityToBeReduced);
                if (count == 0) {
                    console.log('Device lot removed');
                    var query = {'_id': pickListId};
                    var update = {'$pull': {'resourceAssigned': {'_id': mongoose.Types.ObjectId(objectId)}}};
                } else {
                    console.log('Device lot updated');
                    var query = {'_id': pickListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                    var update = {'$set': {'resourceAssigned.$.capacityAssigned': count}};
                }

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('4');
                    }
                });
            });
            //
            // Global pickList 
            flowController.on('4', function () {

                (showConsole) ? console.log('4') : '';
                pickListModel.findOne({'_id': pickListId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'Pick List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().sort({'status': 1}).exec(function (err, pickSubListRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                            } else {

                                var query = {'_id': pickListId};
                                var update = {'$set': {'status': pickSubListRow[0].status, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};
                                pickListModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('ALERT', pickSubListRow);
                                        flowController.emit('END', {message: "Pick global and sub list status updated to withdrawn successfully", status: 'success', statusCode: '201'});
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // ALERT
            flowController.on('ALERT', function (pickSubListRow) {

                (showConsole) ? console.log('ALERT') : '';
                pickListModel.findOne({_id: pickSubListRow.pickListId, activeStatus: 1}, function (err, pickListRow) {
                    if (err) {

                    } else if (pickListRow == null) {

                    } else {

                        dataObject = {
                            warehouseId: pickListRow.warehouseId,
                            textName: 'PickSubList withdraw in this ' + pickListRow.name + ' ' + pickSubListRow.itemCode,
                            module: 'PICK-SUB-LIST WITHDRAW',
                            name: 'PICK LIST NAME : ' + pickListRow.name,
                            id: pickListRow._id
                        };

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {

                                console.log('err');
                            } else {

                                console.log('success');
                            }
                        });
                    }
                });
            });
            //
            //ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-WITHDRAW',
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
            //
            //END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                currentActivityStatusFunction('PICK', pickSubListId, 'PICK - Withdrawn');
                res.json(result);
            });
            //
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------------------------------
//Status SocketIO changed to withdrawn web
//-----------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/update/web/status-to-withdrawn/')

        .patch(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var pickSubListId = req.body.pickSubListId.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();
            //
            //START
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'activeStatus': 1}, function (err, pickSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {

                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        console.log(pickSubListRow);
                        
                        if (pickSubListRow.resourceAssigned.length !== 0) {
                            
                            var lot = pickSubListRow.resourceAssigned[0].lot;
                            var deviceId = pickSubListRow.resourceAssigned[0].deviceId;

                            var query = {'_id': pickSubListId};
                            var update = {'$set': {'status': 5, 'resourceAssigned': [], 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};

                            pickSubListModel.update(query, update, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    pickListId = pickSubListRow.pickListId;
                                    flowController.emit('1', pickListId, lot, deviceId);
                                }
                            });
                        } else {
                            
                            flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            //
            // OUTER CASE
            flowController.on('1', function (pickListId, lot, deviceId) {

                (showConsole) ? console.log('1') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        var itemType = pickSubListRow.itemType;
                        var itemType = pickSubListRow.itemType;
                        if (itemType != 'PALLET') {

                            flowController.emit('3', pickListId, lot, deviceId);
                        } else {
                            if (pickSubListRow.palletType != 'O') {

                                flowController.emit('3', pickListId, lot, deviceId);
                            } else {

                                flowController.emit('2.1', pickSubListRow, lot, deviceId);
                            }
                        }
                    }
                });
            });
            //
            // OUTER CASE : Check if any line item is pending for drop
            // If found then bring the items back to location from where it is picked
            flowController.on('2.1', function (pickSubListRow, lot, deviceId) {

                (showConsole) ? console.log('2.1') : '';
                var pickListId = pickSubListRow.pickListId;
                var customPalletNumber = pickSubListRow.customPalletNumber;
                pickSubListModel.find({'pickListId': pickListId, 'customPalletNumber': customPalletNumber, 'activeStatus': 1}, function (err, pickSubListRecords) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRecords == null) {

                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2.2', pickSubListRecords, lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAW
            flowController.on('2.2', function (pickSubListRecords, lot, deviceId) {

                (showConsole) ? console.log('2.2') : '';
                processErrors = [];
                async.eachSeries(pickSubListRecords, function (element, callback) {

                    if (element.status == 27) {

                        var itemStoreArray = element.itemStoreId;
                        var pickLocationId = element.pickLocationId;

                        async.waterfall([
                            // Push items back to location from where it has picked before
                            function (waterfallcallback) {

                                async.eachSeries(itemStoreArray, function (element, callback) {

                                    var query = {'_id': pickLocationId, 'activeStatus': 1};
                                    var update = {'$addToSet': {'assignedItemStoreId': element}};
                                    locationStoreModel.update(query, update, function (err) {
                                        if (err) {

                                            processErrors.push({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                        }
                                        setImmediate(callback);
                                    });
                                }, function (err) {
                                    if (err) {

                                        waterfallcallback(null);
                                    } else {

                                        waterfallcallback(null);
                                    }
                                });
                            },
                            // Update item store locationStoreId to pick location's Id
                            function (waterfallcallback) {

                                async.eachSeries(itemStoreArray, function (element, callback) {

                                    var query = {'_id': element, 'activeStatus': 1};
                                    var update = {'$set': {'locationStoreId': pickLocationId, 'currentActivityStatus': 'PICK-SCHEDULEDD'}};

                                    itemStoreModel.update(query, update, function (err) {

                                        if (err) {

                                            processErrors.push({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                        }
                                        setImmediate(callback);

                                    });
                                }, function () {
                                    waterfallcallback(null);
                                });
                            },
                                    // Done
                        ], function (err, result) {

                            setImmediate(callback);
                        });
                    } else {
                        setImmediate(callback);
                    }
                }, function () {
                    if (processErrors.length != 0) {

                        flowController.emit('ERROR', processErrors);
                    } else {

                        flowController.emit('2.3', pickSubListRecords[0], lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAW
            flowController.on('2.3', function (pickSubListRow, lot, deviceId) {

                (showConsole) ? console.log('2.3') : '';
                var pickListId = pickSubListRow.pickListId;
                var customPalletNumber = pickSubListRow.customPalletNumber;
                var query = {'pickListId': pickListId, 'customPalletNumber': customPalletNumber};
                var update = {'$set': {'status': 5, 'resourceAssigned': [], 'pickedQuantity': 0, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};
                var multi = {'multi': true};

                pickSubListModel.update(query, update, multi, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2.4', pickListId, lot, deviceId);
                    }
                });
            });
            //
            // OUTER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('2.4', function (pickListId, lot, deviceId) {

                (showConsole) ? console.log('2.4') : '';
                (showConsole) ? console.log('lot: ' + lot) : '';
                (showConsole) ? console.log('deviceId: ' + deviceId) : '';
                pickSubListModel.find({pickListId: pickListId, 'resourceAssigned': {'$elemMatch': {deviceId: deviceId, lot: lot}}, activeStatus: 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var count = (pickSubListRow.length != 0) ? pickSubListRow.length : 0;
                        flowController.emit('2.5', pickListId, lot, deviceId, count);
                    }
                });
            });
            //
            // OUTER WITHDRAWN GET LOT FROM PICKLIST 
            flowController.on('2.5', function (pickListId, lot, deviceId, count) {

                (showConsole) ? console.log('2.5') : '';
                pickListModel.findOne({"_id": pickListId, 'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'lot': lot}}}, {'resourceAssigned.$': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No lot found with lot no. ' + lot + ' for device: ' + deviceId, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2.6', pickListId, lot, deviceId, count, pickListRow);
                    }
                });
            });
            //
            // OUTER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('2.6', function (pickListId, lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('2.6') : '';
                var resourceObject = pickListRow.resourceAssigned[0];
                var objectId = String(resourceObject._id);
                var userCapacityToBeReduced = resourceObject.capacityAssigned - count;
                console.log('capacity to be reduced: ' + userCapacityToBeReduced);
                if (count == 0) {
                    console.log('Device lot removed');
                    var query = {'_id': pickListId};
                    var update = {'$pull': {'resourceAssigned': {'_id': mongoose.Types.ObjectId(objectId)}}};
                } else {
                    console.log('Device lot updated');
                    var query = {'_id': pickListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                    var update = {'$set': {'resourceAssigned.$.capacityAssigned': count}};
                }

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('4', pickListId);
                    }
                });
            });
            //
            // OUTER WITHDRAWN GET USER 
            flowController.on('2.7', function (lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('2.7') : '';
            });
            //             // PALLET/SERIALNUMBER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('3', function (pickListId, lot, deviceId) {

                (showConsole) ? console.log('3') : '';
                (showConsole) ? console.log('lot: ' + lot) : '';
                (showConsole) ? console.log('deviceId: ' + deviceId) : '';
                pickSubListModel.find({pickListId: pickListId, 'resourceAssigned': {'$elemMatch': {deviceId: deviceId, lot: lot}}, activeStatus: 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var count = (pickSubListRow.length != 0) ? pickSubListRow.length : 0;
                        flowController.emit('3.1', pickListId, lot, deviceId, count);
                    }
                });
            });
            //
            // PALLET/SERIALNUMBER WITHDRAWN GET LOT FROM PICKLIST 
            flowController.on('3.1', function (pickListId, lot, deviceId, count) {

                (showConsole) ? console.log('3.1') : '';
                pickListModel.findOne({"_id": pickListId, 'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'lot': lot}}}, {'resourceAssigned.$': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'No lot found with lot no. ' + lot + ' for device: ' + deviceId, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3.2', pickListId, lot, deviceId, count, pickListRow);
                    }
                });
            });
            //
            // PALLET/SERIALNUMBER WITHDRAWN CHECK IF LOT PRESENT CURRENTLY IN PICKLIST 
            flowController.on('3.2', function (pickListId, lot, deviceId, count, pickListRow) {

                (showConsole) ? console.log('3.2') : '';
                var resourceObject = pickListRow.resourceAssigned[0];
                var objectId = String(resourceObject._id);
                var userCapacityToBeReduced = resourceObject.capacityAssigned - count;
                console.log('capacity to be reduced: ' + userCapacityToBeReduced);
                if (count == 0) {
                    console.log('Device lot removed');
                    var query = {'_id': pickListId};
                    var update = {'$pull': {'resourceAssigned': {'_id': mongoose.Types.ObjectId(objectId)}}};
                } else {
                    console.log('Device lot updated');
                    var query = {'_id': pickListId, 'resourceAssigned': {$elemMatch: {'deviceId': deviceId, 'lot': lot}}};
                    var update = {'$set': {'resourceAssigned.$.capacityAssigned': count}};
                }

                pickListModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        flowController.emit('4', pickListId);
                    }
                });
            });
            //
            //Global pickList 
            flowController.on('4', function (pickListId) {

                (showConsole) ? console.log('4') : '';
                pickListModel.findOne({'_id': pickListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow == null) {

                        flowController.emit('ERROR', {message: 'Pick List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {

                        pickSubListModel.find({'pickListId': pickListId, 'activeStatus': 1}).lean().sort({'status': 1}).exec(function (err, pickSubListRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickSubListRow.length == 0) {

                                flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                            } else {

                                var query = {'_id': pickListId};

                                var update = {'$set': {'status': pickSubListRow[0].status, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}};

                                pickListModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('ALERT', pickSubListRow);
                                        flowController.emit('END', {message: 'Operation SuccessFully!', status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            //ALERT
            flowController.on('ALERT', function (pickSubListRow) {

                (showConsole) ? console.log('ALERT') : '';
                pickListModel.findOne({_id: pickSubListRow.pickListId, activeStatus: 1}, function (err, pickListRow) {
                    if (err) {

                    } else if (pickListRow == null) {

                    } else {

                        dataObject = {
                            warehouseId: pickListRow.warehouseId,
                            textName: 'PickSubList withdraw in this ' + pickListRow.name + ' ' + pickSubListRow.itemCode,
                            module: 'PICK-SUB-LIST WITHDRAW',
                            name: 'PICK LIST NAME : ' + pickListRow.name,
                            id: pickListRow._id
                        };

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {

                                console.log('err');
                            } else {

                                console.log('success');
                            }
                        });
                    }
                });
            });
            //
            //ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-WEB-WITHDRAW',
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
            //
            //END
            flowController.on('END', function (result) {
                (showConsole) ? console.log('END') : '';
                currentActivityStatusFunction('PICK', pickSubListId, 'PICK - Withdrawn');
                res.json(result);
            });
            //
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------------------------------
//forcefully done
//-----------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickSubList/configuration/update/web/forcefully-to-done/')

        .patch(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickSubListId = req.body.pickSubListId.trim();
            var deviceId = req.body.deviceId.trim();
            var userId = req.body.userId;
            var baseUrl = req.body.baseUrl.trim();
            var reasonToForceDone = req.body.reasonToForceDone.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            //START
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                var objectToCheck = userId ? {'userId': userId, 'deviceId': deviceId, 'activeStatus': 1} : {deviceId: deviceId, 'activeStatus': 1};
                devicesTrackingModel.find(objectToCheck).lean().sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (deviceTrackingRow.length == 0) {

                        flowController.emit('ERROR', {message: "User Id And Device Id Missing/Modified in System!", status: 'error', statusCode: '404'});
                    } else {

                        if (deviceTrackingRow[0].status == "LOGOUT") {

                            flowController.emit('1');
                        } else {

                            flowController.emit('ERROR', {message: "User already logged in to device id, user need to logout from specified device and logged in to another device.", status: 'error', statusCode: '304'});
                        }
                    }
                });
            });

            // Find line items that are 
            flowController.on('1', function () {

                (showConsole) ? console.log('1') : '';
                pickSubListModel.findOne({'_id': pickSubListId, 'status': {'$in': [25, 27]}, 'activeStatus': 1}, function (err, pickSubListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'Pick Sub List information tampered! Contact customer-support!', status: 'error', statusCode: '404'});
                    } else {
                        if (pickSubListRow.itemType == 'PALLET') {
                            if (pickSubListRow.palletType == 'O') {

                                flowController.emit('2', pickSubListRow);
                            } else {

                                flowController.emit('4', pickSubListRow);
                            }
                        } else {

                            flowController.emit('4', pickSubListRow);
                        }
                    }
                });
            });

            // OUTER case special implementation
            flowController.on('2', function (pickSubListRow) {

                (showConsole) ? console.log('2') : '';
                var pickListId = pickSubListRow.pickListId;
                var customPalletNumber = pickSubListRow.customPalletNumber;
                pickSubListModel.find({'pickListId': pickListId, 'customPalletNumber': customPalletNumber, 'activeStatus': 1}, function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow == null) {
                        flowController.emit('ERROR', {message: 'No Pick-line items found with CPN: ' + customPalletNumber, status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3', pickSubListRow);
                    }
                });
            });

            // OUTER case special implementation
            flowController.on('3', function (pickSubListRow) {

                (showConsole) ? console.log('3') : '';
                var processErrors = [];
                async.eachSeries(pickSubListRow, function (element, callback) {

                    var deviceId = element.resourceAssigned[0].deviceId;
                    var lot = element.resourceAssigned[0].lot;
                    var id = String(element._id);

                    async.waterfall([
                        // Update line item status to in-progress
                        function (waterfallcallback) {

                            var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickSublist/action/update-status/in-progress/';

                            requestify.post(requestifyUrl, {pickSubListId: id, deviceId: deviceId, startedBy: modifiedBy}).then(function (response) {

                                var result = response.getBody();

                                if (result.status === 'success') {
                                    setTimeout(function () {
                                        waterfallcallback(null);
                                    }, 500);
                                }

                                if (result.status === 'error') {
                                    processErrors.push(result);
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Undate line item status to pending-for-drop
                        function (waterfallcallback) {

                            var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickSublist/action/update-status/pending-for-drop/';

                            requestify.post(requestifyUrl, {pickSubListId: id, serialNumberArray: element.serialNumberArray}).then(function (response) {

                                var result = response.getBody();

                                if (result.status === 'success') {

                                    setTimeout(function () {
                                        waterfallcallback(null);
                                    }, 500);
                                }

                                if (result.status === 'error') {
                                    processErrors.push(result);
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Update line item status to done
                        function (waterfallcallback) {

                            var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickSubList/action/update-status/done/';

                            requestify.post(requestifyUrl, {pickSubListId: id, pickActiveTime: 0, lot: lot, endedBy: modifiedBy, deviceId: deviceId, reasonToForceDone: reasonToForceDone}).then(function (response) {

                                var result = response.getBody();

                                if (result.status === 'success') {

                                    setTimeout(function () {
                                        waterfallcallback(null);
                                    }, 500);
                                }

                                if (result.status === 'error') {
                                    processErrors.push(result);
                                    waterfallcallback(null);
                                }
                            });
                        }
                        // Waterfall completed
                    ], function (err, result) {

                        setImmediate(callback);
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else if (processErrors.length != 0) {

                        flowController.emit('ERROR', {message: 'Line item(s) activity completed with Errors', status: 'error', processErrors: processErrors, statusCode: '304'});
                    } else {

                        flowController.emit('5', pickSubListRow[0]);
                    }
                });
            });

            // Normal done implementation
            flowController.on('4', function (pickSubListRow) {

                (showConsole) ? console.log('4') : '';
                var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickSubList/action/update-status/done/';

                requestify.post(requestifyUrl, {pickSubListId: pickSubListId, baseUrl: baseUrl, pickActiveTime: 0, endedBy: modifiedBy, deviceId: deviceId, reasonToForceDone: reasonToForceDone}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        flowController.emit('5', pickSubListRow);
                    }

                    if (result.status === 'error') {
                        (showConsole) ? console.log('Error') : '';
                        flowController.emit('ERROR', result);
                    }
                });
            });

            // Normal done implementation
            flowController.on('5', function (pickSubListRow) {

                (showConsole) ? console.log('5') : '';
                var lot = pickSubListRow.resourceAssigned[0].lot;
                var pickListId = pickSubListRow.pickListId;

                var requestifyUrl = baseUrl + '/v1/processMaster/mobile/pickList/action/update-status/done/';

                requestify.post(requestifyUrl, {pickListId: pickListId, lot: lot, endedBy: modifiedBy, deviceId: deviceId}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        (showConsole) ? console.log('Success') : '';
                        (showConsole) ? console.log(result) : '';
                    }

                    if (result.status === 'error') {

                        (showConsole) ? console.log('Error') : '';
                        (showConsole) ? console.log(result) : '';
                    }
                });
                flowController.emit('END', {message: 'Line item(s) activity completed via Force done', status: 'success', statusCode: '200'});
            });
            //
            //END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                currentActivityStatusFunction('PICK', pickSubListId, 'PICK - Force done');
                res.json(result);
            });
            //
            //ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {MODULE: 'PICK-SUB-LIST-FORCEFULLY-DONE',
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
            //
            // To be kept at the end always
            flowController.emit('START');
        });
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
// //
module.exports = router;
