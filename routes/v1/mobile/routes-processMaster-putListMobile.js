var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var requestify = require('requestify');
var MagicIncrement = require('magic-increment');
//----------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//----------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var byPassModel = require('../../../models/mongodb/programmingMaster-byPassFeature/collection-byPassFeature.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var customPalletNumberModel = require('../../../models/mongodb/processMaster-customPalletNumber/collection-customPalletNumber');
//----------------------------------------------------------------------------------------------------------------------------
// GBL Specific - Display all zones
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/read/all-zone/')

        .post(function (req, res, next) {

            var consoleProcess = 1;

            (consoleProcess) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var putSubListId = req.body.putSubListId.trim();

            var selectedMHE = req.body.selectedMHE.trim();

            var functionAreaArray = [];// In use

            var holdingTypeArray = [];

            var flowController = new EventEmitter();

            putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {

                if (err) {

                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                } else if (putSubListRow == null) {

                    res.json({message: 'No line item details available in system.', status: 'error', statusCode: '200'});
                } else {

                    palletType = putSubListRow.palletType;

                    palletSize = putSubListRow.palletSize;

                    // Get the Function Area array
                    flowController.on('START', function () {

                        (consoleProcess) ? console.log('START') : '';

                        functionAreaModel.find({'name': {'$in': ['REPROCESS', 'STORAGE', 'DISPATCH']}, 'activeStatus': 1}).lean().exec(function (err, functionAreaRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(functionAreaRow, function (element, callback) {

                                    functionAreaArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('1.1');
                                });
                            }
                        });
                    });

                    // Get Holding type PALLET Details
                    flowController.on('1.1', function () {

                        (consoleProcess) ? console.log('1.1') : '';

                        holdingTypeModel.find({'name': {'$in': ['PALLET', 'ANY']}, 'activeStatus': 1}).lean().exec(function (err, holdingTypePalletRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypePalletRow == null) {

                                flowController.emit('ERROR', {message: "Holding type details not available in system", status: 'error', statusCode: '500'});
                            } else {

                                async.eachSeries(holdingTypePalletRow, function (element, callback) {

                                    holdingTypeArray.push(String(element._id));
                                    setImmediate(callback);

                                }, function (err) {

                                    flowController.emit('1.2');
                                });
                            }
                        });
                    });

                    // Get locations from rule engine matching criteria
                    flowController.on('1.2', function () {

                        (consoleProcess) ? console.log('1.2') : '';

                        var customerAddressArray = [];

                        var zoneArray = [];

                        var P1 = {'$match': {palletType: palletType, palletSize: palletSize, activeStatus: 1}};
                        var P2 = {'$lookup': {from: "transactionalData-locationStores", localField: "location", foreignField: "customerAddress", as: "locationStore"}};
                        var P3 = {'$unwind': {path: "$locationStore"}};
                        var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.materialHandlingUnitId': selectedMHE, 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
                        var P5 = {'$sort': {location: 1}};
                        var P6 = {'$project': {zone: 1, location: 1, availability: '$locationStore.availability', capacity: '$locationStore.availableCapacity', holdingType: '$locationStore.holdingType', function: '$locationStore.function'}};

                        ruleEngineModel.aggregate([P1, P2, P3, P4, P5, P6],
                                function (err, result) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        console.log(result);

                                        async.eachSeries(result, function (element, callback) {

                                            customerAddressArray.push(element.location);

                                            if (zoneArray.indexOf(element.zone) == -1) {

                                                zoneArray.push(element.zone);
                                            }

                                            setImmediate(callback);

                                        }, function (err) {

                                            flowController.emit('0', customerAddressArray, zoneArray);
                                        });
                                    }
                                });
                    });

                    // Get the master data of this item
                    flowController.on('0', function (customerAddressArray, zoneArray) {

                        (consoleProcess) ? console.log('0') : '';

                        itemStoreModel.findOne({'_id': putSubListRow.itemStoreId[0], 'activeStatus': 1}, function (err, itemStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                flowController.emit('error', {message: 'No details of inventory available in system.', status: 'error', statusCode: '404'});
                            } else {

                                itemMasterModel.findOne({'_id': itemStoreRow.itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                                    if (err) {
                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (itemMasterRow == null) {

                                        flowController.emit('error', {message: 'No details for item master not available in system!', status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('1', customerAddressArray, zoneArray, itemMasterRow);
                                    }
                                });
                            }
                        });
                    });

                    // Filter & out locations reserved for items other than required item
                    flowController.on('1', function (customerAddressArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('1') : '';

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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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

                                    flowController.emit('2', filteredLocationArray, zoneArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Filter & out locations exclusive for other items
                    // Filter & in locations reserved for required item
                    // Filter & in blank locations
                    // Filter & in shared locations
                    flowController.on('2', function (customerAddressArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('2') : '';

                        console.log(customerAddressArray);
                        console.log(zoneArray);

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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {

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

                                console.log(newFilteredLocationArray.length);
                                console.log(otherItemArray.length);

                                if (newFilteredLocationArray.length === 0 && otherItemArray.length === 0) {
                                    // If required locations after filtering with conditions are not available & other locations also exclusive or not having capacity
                                    flowController.emit('error', {message: 'No suitable locations available in warehouse for Drop! Contact warehouse administrator.', status: 'error', statusCode: '304'});
                                } else {

                                    flowController.emit('3', filteredLocationArray, zoneArray, otherItemArray, itemMasterRow);
                                }
                            }
                        });
                    });

                    // Check out other item array and check exclusivity of those item if array is not empty
                    flowController.on('3', function (filteredLocationArray, zoneArray, otherItemArray, itemMasterRow) {

                        (consoleProcess) ? console.log('3') : '';

                        console.log(filteredLocationArray);
                        console.log(zoneArray);

                        if (otherItemArray.length == 0) {

                            flowController.emit('4', filteredLocationArray, zoneArray, itemMasterRow);
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
                                    } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {

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

                                    flowController.emit('4', filteredLocationArray, zoneArray, itemMasterRow);
                                }
                            });
                        }
                    });

                    // Final execution logic
                    // Get reserved locations array
                    flowController.on('4', function (filteredLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('4') : '';

                        console.log(filteredLocationArray);
                        console.log(zoneArray);

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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {

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
                                flowController.emit('5', reservedLocationArray, otherLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // Get locations where item is present (item already present and adding the same item)
                    flowController.on('5', function (reservedLocationArray, otherLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('5') : '';

                        console.log(reservedLocationArray);
                        console.log(otherLocationArray);
                        console.log(zoneArray);

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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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

                                                callback(err);
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
                                flowController.emit('6', reservedLocationArray, itemPresentLocationArray, remainingLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // process locations which are blank and location where required item is not present
                    flowController.on('6', function (reservedLocationArray, itemPresentLocationArray, remainingLocationArray, zoneArray, itemMasterRow) {

                        (consoleProcess) ? console.log('6') : '';

                        console.log(reservedLocationArray);
                        console.log(itemPresentLocationArray);
                        console.log(remainingLocationArray);
                        console.log(zoneArray);

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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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
                                flowController.emit('7', reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, zoneArray, itemMasterRow);
                        });
                    });

                    // allowed location details
                    flowController.on('7', function (reservedLocationArray, itemPresentLocationArray, emptyAndSharedLocationArray, zoneArray, itemMasterRow) {

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

                        flowController.emit('8', combinedArray);

                    });

                    // Allocated locations array
                    flowController.on('8', function (allowedLocationArray) {

                        (consoleProcess) ? console.log('8') : '';

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
                    });

                    // End
                    flowController.on('end', function (finalZoneArray) {

                        (consoleProcess) ? console.log('end') : '';

                        res.json({zoneName: finalZoneArray, message: 'Operation Successful', status: 'success', statusCode: '200'});
                    });

                    // Error
                    flowController.on('error', function (error) {

                        (consoleProcess) ? console.log('error') : '';
                        (consoleProcess) ? console.log(error) : '';
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
router.route('/v1/processMaster/mobile/putList/action/read/all-locations/')

        .post(function (req, res) {

            var consoleProcess = 1;

            (consoleProcess) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var zoneId = req.body.zoneId.trim();

            var isOuterNextScan = req.body.isOuterNextScan.trim(); // YES/NO // 

            var putSubListId = req.body.putSubListId.trim();

            var selectedMHE = req.body.selectedMHE.trim();

            var functionAreaArray = [];
            var holdingTypeArray = [];

            var flowController = new EventEmitter();

            var byPassDataObject = {};

            putSubListModel.findOne({'_id': putSubListId, 'activeStatus': 1}, function (err, putSubListRow) {
                if (err) {

                    res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                } else if (putSubListRow == null) {

                    res.json({message: 'No line item details available in system.', status: 'error', statusCode: '304'});
                } else {

                    palletType = putSubListRow.palletType;
                    palletSize = putSubListRow.palletSize;

                    // Get bypass details
                    flowController.on('BYPASS', function () {

                        (consoleProcess) ? console.log('BYPASS') : '';

                        byPassModel.find({'master': 'itemMaster', 'activeStatus': 1}).lean().exec(function (err, byPassRow) {
                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (byPassRow.length == 0) {

                                flowController.emit('1.1');
                            } else {

                                byPassRow.forEach(function (element) {

                                    if (element.key === 'exclusiveStorage') {

                                        byPassDataObject.exclusiveStorage = element.value;
                                    }

                                    if (element.key === 'overflowAutoAssign') {

                                        byPassDataObject.overflowAutoAssign = element.value;
                                    }

                                    if (element.key === 'itemReservation') {

                                        byPassDataObject.itemReservation = element.value;
                                    }

                                    if (element.key === 'categoryReservation') {

                                        byPassDataObject.categoryReservation = element.value;
                                    }

                                    if (byPassRow.length === Object.keys(byPassDataObject).length) {

                                        flowController.emit('1.1');
                                    }
                                });
                            }
                        });
                    });

                    // Get the Function Area array
                    flowController.on('1.1', function () {

                        (consoleProcess) ? console.log('1.1') : '';

                        functionAreaModel.find({'name': {'$in': ['REPROCESS', 'STORAGE', 'DISPATCH']}, 'activeStatus': 1}).lean().exec(function (err, functionAreaRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
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

                                flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
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

                                res.json({message: 'Zone details not available in system.', status: 'error', statusCode: '304'});
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
                        var P4 = {'$match': {'$or': [{'locationStore.availableCapacity': -1}, {'locationStore.availableCapacity': {'$gte': 1}}], 'locationStore.materialHandlingUnitId': selectedMHE, 'locationStore.availability': 'A', 'locationStore.holdingType': {'$in': holdingTypeArray}, 'locationStore.function': {'$in': functionAreaArray}}};
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

                        itemStoreModel.findOne({'_id': putSubListRow.itemStoreId[0], 'activeStatus': 1}, function (err, itemStoreRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                flowController.emit('error', {message: 'No inventory details available in system.', status: 'error', statusCode: '404'});
                            } else {

                                itemMasterModel.findOne({'_id': itemStoreRow.itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                                    if (err) {
                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (itemMasterRow == null) {

                                        flowController.emit('error', {message: 'No inventory details available in system.', status: 'error', statusCode: '404'});
                                    } else {

                                        flowController.emit('2', customerAddressArray, itemMasterRow);
                                    }
                                });
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
                                } else if (holdingTypeArray.indexOf(locationStoreRow.holdingType) != -1) {
                                    // Location holding type is other than pallet...Ignore
                                    setImmediate(callback);
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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
                                    } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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

                                                callback(err);
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
                                } else if (locationStoreRow.availableCapacity < putSubListRow.requiredQuantity) {
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

                        if (isOuterNextScan === 'YES') {

                            flowController.emit('10', combinedArray);
                        } else if (combinedArray.length == 0) {

                            flowController.emit('error', {message: 'As per the item properties defined by you, none of the locations under this zone found eligible!', status: 'error', statusCode: '404'});
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

                                        putSubListModel.find({'_id': {"$ne": putSubListId}, 'status': {"$lt": 31}, 'dropLocationAddress': element, 'activeStatus': 1}).lean().exec(function (err, putSublist2Row) {
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

                                                            if (remaining >= putSubListRow.requiredQuantity) {

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

                                                if (finalAvailableCapacity >= putSubListRow.requiredQuantity) {

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

                                                                if (remaining >= putSubListRow.requiredQuantity) {

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

                                        flowController.emit('10', finalResultArray[0]);
                                    }
                                }
                            });
                        }
                    });

                    // Update location as suggested location in put sublist
                    flowController.on('10', function (location) {

                        (consoleProcess) ? console.log('10') : '';

                        locationStoreModel.findOne({'customerAddress': location, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {

                            var query = {'_id': putSubListId};
                            var update = {'dropLocationId': locationStoreRow._id, 'dropLocationAddress': location};

                            putSubListModel.update(query, update, function (err) {

                                if (err) {

                                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('end', location);
                                }
                            });
                        });
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
                    flowController.emit('BYPASS');
                }
            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Update putlist status as assigned
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/update-status/assigned/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();

            var deviceId = req.body.deviceId.trim();

            var assignedTo = req.body.assignedTo;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'Putlist details not available in system!', data: putListId, status: 'error', statusCode: '404'});
                    } else if (putListRow.resourceAssigned.length != 0 && putListRow.resourceAssigned[0].deviceId != deviceId) {

                        flowController.emit('ERROR', {message: 'This Put List is reserved by other resource! Choose next-one if available.', data: putListId, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1');
                    }
                });
            });

            flowController.on('1', function () {

                var query = {'_id': putListId};
                var update = {'$addToSet': {'resourceAssigned': {'deviceId': deviceId}}, '$set': {'status': 21, 'timeAssigned': timeInInteger, 'assignedTo': assignedTo}}

                putListModel.update(query, update, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
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
//----------------------------------------------------------------------------------------------------------------------------
// Update putlist status to in progress
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/update-status/in-progress/')

        .patch(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();
            var startedBy = req.body.startedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No putlist details available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': putListId};
                        var update = {'$set': {'status': 25, 'timeStarted': timeInInteger, 'startedBy': startedBy}};

                        putListModel.update(query, update, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
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
//----------------------------------------------------------------------------------------------------------------------------
// Update status of putlist as done 
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/update-status/done/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();
            var completedBy = req.body.completedBy.trim();
            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            // Check if all done
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                putSubListModel.find({'putListId': putListId, 'activeStatus': 1}).lean().exec(function (err, putSubList2Row) {

                    if (err) {
                        // error while adding records
                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        conflictObject = [];

                        async.eachSeries(putSubList2Row, function (element, callback) {

                            if (element.status != 31)
                                conflictObject.push({process: 'done'});

                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                                flowController.emit('error', err);
                            } else if (conflictObject.length > 0) {

                                flowController.emit('error', {message: "Some items are yet to be processed! Putlist not completed yet!", status: 'error', statusCode: '304'});
                            } else {

                                flowController.emit('1');
                            }
                        });
                    }
                });
            });

            // Update status to putlist
            flowController.on('1', function () {

                (consoleLog) ? console.log('1') : '';

                var query = {'_id': putListId};
                var update = {'$set': {'status': 31, 'completedBy': completedBy, 'timeCompleted': timeInInteger}};

                putListModel.update(query, update, function (err) {
                    if (err) {
                        // error while adding records
                        flowController.emit('error', {message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2');
                    }
                });

            });

            // Export data
            flowController.on('2', function () {

                (consoleLog) ? console.log('2') : '';

                var requestifyUrl = baseUrl + '/v1/processMaster/web/putList/configuration/create/manual-export/';

                data = {putListId: putListId};

                requestify.post(requestifyUrl, data).then(function (response) {

                    var result = response.getBody();
                    if (result.status === 'success') {

                        flowController.emit('update-user-capacity');
                        flowController.emit('end', {message: "Putlist completed.", status: 'success', statusCode: '200'});
                    }

                    if (result.status === 'error') {

                        flowController.emit('error', result);
                    }
                });
            });

            // userCapacity update
            flowController.on('update-user-capacity', function () {

                userModel.findOne({'_id': completedBy, 'activeStatus': 1}, function (err, userRow) {

                    if (err) {
                        // error while adding records
                        console.log({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        console.log({message: 'Data missing! User details modified/deleted from the system!', status: 'error', statusCode: '304'});

                    } else {

                        var query = {'_id': completedBy};

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
                                                id: completedBy
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

            // End
            flowController.on('end', function (response) {

                (consoleLog) ? console.log('end') : '';

                res.json(response);
            });

            // Error
            flowController.on('error', function (error) {

                (consoleLog) ? console.log('error') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Update status of putlist as done-skipped 
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/update-status/done-skipped/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();
            var completedBy = req.body.completedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No putlist available in system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': putListId};
                        var update = {'$set': {'status': 35, 'timeCompleted': timeInInteger, 'completedBy': completedBy}};

                        putListModel.update(query, update, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Status updated into the system!", status: 'success', statusCode: '200'});
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
//----------------------------------------------------------------------------------------------------------------------------
// Special case OUTER PALLET 
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/outer-case/update-status/done/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var outerList = JSON.parse(req.body.outerList);// Array
            var outerSubList = JSON.parse(req.body.outerSubList);// Array
            var dropLocationAddress = req.body.dropLocationAddress.trim();// Drop location SAME
            var completedBy = req.body.completedBy.trim();
            var baseUrl = req.body.baseUrl.trim();
            var pickActiveTime = req.body.pickActiveTime.trim();// Coming string from Android
            var deviceId = req.body.deviceId.trim();

            var rgx = new RegExp("^" + 'CP_' + moment(new Date()).format('DDMMYY'));

            var flowController = new EventEmitter();

            // To be tested
            flowController.on('START', function () {

                customPalletNumberModel.findOne({'customPalletNumber': {$regex: rgx}, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, customPalletNumberRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var customPalletNumber = (customPalletNumberRow == null) ? 'CP_' + moment(new Date()).format('DDMMYY') + '0001' : MagicIncrement.inc(customPalletNumberRow.customPalletNumber);

                        newCustomPalletNumber = new customPalletNumberModel();
                        newCustomPalletNumber.customPalletNumber = customPalletNumber;
                        newCustomPalletNumber.timeCreated = timeInInteger;

                        newCustomPalletNumber.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('UPDATE-SUBLIST', customPalletNumber);
                            }
                        });
                    }
                });
            });

            // Make all putSubList DONE
            flowController.on('UPDATE-SUBLIST', function (customPalletNumber) {

                (consoleLog) ? console.log('UPDATE-SUBLIST') : '';

                async.eachSeries(outerSubList, function (element, callback) {

                    var requestifyUrl = baseUrl + '/v1/processMaster/mobile/putSubList/action/update-status/done/';

                    data = {customPalletNumber: customPalletNumber, putSubListId: element, dropLocationAddress: dropLocationAddress, endedBy: completedBy, pickActiveTime: pickActiveTime, deviceId: deviceId};

                    requestify.post(requestifyUrl, data).then(function (response) {

                        var result = response.getBody();

                        if (result.status === 'success') {
                            setTimeout(function () {
                                setImmediate(callback);
                            }, 200);
                        }

                        if (result.status === 'error') {
                            console.log('Error: ' + result.message);
                            setTimeout(function () {
                                setImmediate(callback);
                            }, 200);
                        }
                    });
                }, function () {

                    flowController.emit('UPDATE-LIST');
                });
            });

            // Make all putList DONE
            flowController.on('UPDATE-LIST', function () {

                (consoleLog) ? console.log('UPDATE-LIST') : '';

                async.eachSeries(outerList, function (element, callback) {

                    var requestifyUrl = baseUrl + '/v1/processMaster/mobile/putList/action/update-status/done/';

                    data = {putListId: element, completedBy: completedBy, baseUrl: baseUrl};

                    requestify.post(requestifyUrl, data).then(function (response) {

                        var result = response.getBody();

                        if (result.status === 'success') {
                            setTimeout(function () {
                                setImmediate(callback);
                            }, 500);
                        }

                        if (result.status === 'error') {
                            console.log('Error: ' + result.message);
                            setTimeout(function () {
                                setImmediate(callback);
                            }, 200);
                        }
                    });
                }, function () {

                    flowController.emit('UPDATE-CAPACITY');
                });
            });

            // Capacity to be updated by -1
            flowController.on('UPDATE-CAPACITY', function () {

                locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: "Drop location " + dropLocationAddress + " not available in system.", status: 'error', statusCode: '500'});
                    } else {

                        dropLocationFunction = locationStoreRow.function;

                        functionAreaModel.findOne({'_id': dropLocationFunction, 'activeStatus': 1}, function (err, functionAreaRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (functionAreaRow == null) {

                                flowController.emit('ERROR', {message: "Function area details not available in system.", status: 'error', statusCode: '500'});
                            } else {
                                // Ignore capacity as capacity does not matter here
                                if (functionAreaRow.name == 'REPROCESS' || functionAreaRow.name == 'DISPATCH') {

                                    flowController.emit('UPDATE-USER-CAPACITY');
                                    flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                                } else {

                                    var query = {'customerAddress': dropLocationAddress, 'activeStatus': 1};
                                    var update = {'$inc': {'availableCapacity': -1}};

                                    locationStoreModel.update(query, update, function (err) {
                                        if (err) {
                                            // error while adding records
                                            flowController.emit('ERROR', err);
                                        } else {

                                            flowController.emit('UPDATE-USER-CAPACITY');
                                            flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
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
                        console.log({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        console.log({message: 'Data missing! User details modified/deleted from the system!', status: 'error', statusCode: '304'});

                    } else {

                        var query = {'_id': completedBy};

                        var count = (userRow.doneCount) + 1;

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
                                                id: completedBy
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

            // End
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';
                dashboardService.createAlert();
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
Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};
//
//
module.exports = router;