var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
//----------------------------------------------------------------------------------------------------------------------------
var function_locationMaster = require('../../../functionSet/function-locationMaster.js');
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
//Get properties of location by location ID
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/locationProperties/:warehouseId/:locationStoreId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim();

            var locationStoreId = req.params.locationStoreId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            var locationPropertiesArray = [];

            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                locationStoresModel.findOne({'_id': locationStoreId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, locationStoresRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow == null) {

                        flowController.emit('ERROR', {message: "No configured in the system yet!", status: 'error', statusCode: '404', data: []});
                    } else {

                        var locationData = {

                            id: locationStoresRow._id,
                            materialHandlingUnitId: locationStoresRow.materialHandlingUnitId,
                            locationProperties: locationStoresRow.locationProperties,
                            holdingType: locationStoresRow.holdingType,
                            availability: locationStoresRow.availability,
                            function: locationStoresRow.function,
                            comments: locationStoresRow.comments,
                            isResevedForCategory: locationStoresRow.isResevedForCategory,
                            reservedCategoryId: locationStoresRow.reservedCategoryId,
                            isResevedForSubCategory: locationStoresRow.isResevedForSubCategory,
                            reservedSubCategoryId: locationStoresRow.reservedSubCategoryId,
                            isResevedForItem: locationStoresRow.isResevedForItem,
                            reservedItemId: locationStoresRow.reservedItemId,
                            assignedItemStoreId: locationStoresRow.assignedItemStoreId,
                            availableQuantity: locationStoresRow.availableQuantity,
                            sequenceId: locationStoresRow.sequenceId,
                            activeStatus: locationStoresRow.activeStatus
                        };
                        locationPropertiesArray.push(locationData);

                        flowController.emit('END', {message: "Operation Successful.", data: locationPropertiesArray, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-LOCATIONPROERTIES',
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
//Update Location's Category Combinations
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/category-combinations/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var locationStoreId = req.body.locationStoreId.trim(); //MongoId of location

            var reservedCategoryId = req.body.reservedCategoryId.trim();
            var reservedSubCategoryId = req.body.hasOwnProperty('reservedSubCategoryId') ? reservedSubCategoryId : [];
            var modifiedBy = req.body.modifiedBy.trim();
            var categoryCombinationsArray = [];
            categoryCombinationsArray.push(reservedCategoryId);
            categoryCombinationsArray.concat(reservedSubCategoryId);
            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                promise_validateAndSetCategory = new Promises(function (resolve, reject) {

                    locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoresRow) {

                        if (err) {

                            reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoresRow == null) {

                            reject({message: 'Location data missing!', status: 'error', statusCode: '404'});
                        } else {

                            var assignedItemStoreLength = locationStoresRow.assignedItemStoreId.length;
                            //Case 0 : If location reserved for item then category can not be assigned
                            if (locationStoresRow.isResevedForItem == 'YES') {

                                reject({message: 'Location is reserved for Item! Category can\'t be set. If you want to set category, you need to remove reservation of location for item first!', status: 'error', statusCode: '304'});
                            }
                            //Case 1 : location is empty means nothing is reserved or is physically available
                            if (locationStoresRow.isResevedForCategory == 'NO') { // No reservation made for category 

                                if (locationStoresRow.isResevedForItem == 'NO') { // No reservation made for item

                                    if (assignedItemStoreLength == 0) {

                                        locationStoresModel.update({'_id': locationStoreId, 'activeStatus': 1}, {'$set': {'isResevedForCategory': 'YES', 'reservedCategoryId': reservedCategoryId, 'isResevedForSubCategory': 'YES', 'reservedSubCategoryId': reservedSubCategoryId, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}},
                                                function (err) {
                                                    if (err) {
                                                        // error while adding records
                                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    }
                                                    resolve({message: 'Category combinations are updated into system!', status: 'success', statusCode: '200'});
                                                });
                                    }
                                }
                            }
                            // Case 2 : if item is assigned to location (Item physically present at that location)
                            if (assignedItemStoreLength != 0) {

                                locationStoresRow.assignedItemStoreId.forEach(function (element) {

                                    var conflictObject = [];
                                    var dummyObject = [];
                                    var getCombinationsOfItemArray = function_locationMaster.getCategoryCombinationsOfItem(element);

                                    getCombinationsOfItemArray.forEach(function (newElement) {

                                        if (!categoryCombinationsArray.indexOf(newElement) > -1) {

                                            var temp = {conflict: newElement};
                                            conflictObject.push(temp);
                                        }
                                        var temp = {process: 'done'};
                                        dummyObject.push(temp);

                                        if (getCombinationsOfItemArray.length === dummyObject.length) {

                                            if (conflictObject.length == 0) {

                                                locationStoresModel.update({'_id': locationStoreId, 'activeStatus': 1}, {'$set': {'isResevedForCategory': 'YES', 'reservedCategoryId': reservedCategoryId, 'isResevedForSubCategory': 'YES', 'reservedSubCategoryId': reservedSubCategoryId, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}},
                                                        function (err) {
                                                            if (err) {
                                                                // error while adding records
                                                                reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                            } else {
                                                                resolve({message: 'Category combinations are updated into system!', status: 'success', statusCode: '200'});
                                                            }
                                                        });
                                            } else {

                                                reject({message: 'Item present at location is conflicting with the category. Either the category not assigned to all items or few items are not having any category assigned!', status: 'error', statusCode: '304'});
                                            }
                                        }
                                    });
                                });
                            }

                            // Case 3 : Location is having item and category too
                            if (locationStoresRow.isResevedForCategory == 'YES') {

                                var conflictObject = [];
                                var dummyObject = [];
                                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoresRow) {

                                    existingCategoryCombinations = function_locationMaster.getCategoryCombinations(locationStoresRow.category, locationStoresRow.subCategory);

                                    existingCategoryCombinations.forEach(function (newElement) {

                                        if (!categoryCombinationsArray.indexOf(newElement) > -1) {

                                            var temp = {conflict: newElement};
                                            conflictObject.push(temp);
                                        }
                                        var temp = {process: 'done'};
                                        dummyObject.push(temp);
                                        if (existingCategoryCombinations.length === dummyObject.length) {

                                            if (conflictObject.length == 0) {

                                                locationStoresModel.update({'_id': locationStoreId, 'activeStatus': 1}, {'$set': {'isResevedForCategory': 'YES', 'reservedCategoryId': reservedCategoryId, 'isResevedForSubCategory': 'YES', 'reservedSubCategoryId': reservedSubCategoryId, 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}},
                                                        function (err) {
                                                            if (err) {
                                                                // error while adding records
                                                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                            } else {
                                                                resolve({message: 'Category combinations are updated into system!', status: 'success', statusCode: '200'});
                                                            }
                                                        });
                                            } else {

                                                reject({message: 'Item present at location is conflicting with the category. Either the category not assigned to all items or few items are not having any category assigned!', status: 'error', statusCode: '304'});
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    });
                });
                promise_validateAndSetCategory.then(function (promise1_resolvedData) {

                    flowController.emit('END', promise1_resolvedData);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR ", status: 'error', statusCode: '500'});
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
                    MODULE: 'UPDATE-LOCATIONPROERTIES',
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
//Update bulk Reservation for Item
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/bulk/item-reservations/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var locationType = req.body.locationType.toUpperCase(); // Type of location zone/line/level

            var locationId = req.body.locationId.trim(); // MongoId of the location

            var modifiedBy = req.body.modifiedBy.trim();
            var reservedItemId = req.body.hasOwnProperty('reservedItemId') ? req.body.reservedItemId : [] // Exceptional case for patch API

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                //Build Dynamic Query
                var query = {};
                if (locationType == "ZONE") {
                    query['zoneId'] = locationId;
                    query['activeStatus'] = 1;
                } else if (locationType == "LINE") {
                    query['lineId'] = locationId;
                    query['activeStatus'] = 1;
                } else {
                    if (locationType == "LEVEL") {
                        query['levelId'] = locationId;
                        query['activeStatus'] = 1;
                    }
                }

                //Build Dynamic Query
                locationStoresModel.find(query, function (err, locationStoresRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('error', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoresRow, function (element, callback) {

                            locationStoresModel.findOne({"_id": element._id, 'activeStatus': 1}, function (err, locationRow) {

                                if (err) {

                                    flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationRow == null) {

                                    flowController.emit('error', {message: 'location not configured!!', status: 'error', statusCode: '304'});
                                } else {

                                    async.eachSeries(reservedItemId, function (element1, callback1) {

                                        locationStoresModel.update({'_id': element._id}, {'$addToSet': {'reservedItemId': element1}, '$set': {'isReservedForItem': 'YES', 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}}, function (err) {
                                            if (err)
                                                callback1({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                            else
                                                setImmediate(callback1);
                                        });
                                    }, function (err) {
                                        if (err)
                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callback);
                                    });
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                switch (locationType) {

                                    case 'ZONE':
                                        flowController.emit('zone');
                                        break;
                                    case 'LINE':
                                        flowController.emit('line');
                                        break;
                                    case 'LEVEL':
                                        flowController.emit('level');
                                        break;
                                    default:
                                        flowController.emit('error', {message: "Location type not configured", status: 'error', statusCode: '500'});
                                }
                            }
                        });
                    }
                });
            });
            flowController.on('zone', function () {

                zoneMastersModel.findOne({'_id': locationId, 'activeStatus': 1}, function (err, zoneRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneRow == null) {

                        flowController.emit('error', {message: "LocationId missing or modified!", status: 'error', statusCode: '304'});
                    } else {

                        var promise_zone = new Promises(function (resolve, reject) {

                            async.eachSeries(reservedItemId, function (element, callback) {

                                zoneMastersModel.update({'_id': locationId}, {'$addToSet': {'reservedItemId': element}, '$set': {'isReservedForItem': 'YES', 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}}, function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        setImmediate(callback);
                                    }
                                }, function (err) {

                                    if (err) {

                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        resolve({message: "Bulk Items reserved Successfully.", status: 'success', statusCode: '200'});
                                    }
                                });
                            });
                        });
                        promise_zone.then(function (respond) {

                            flowController.emit('end', {message: "Bulk Items reserved Successfully.", status: 'success', statusCode: '200'});
                        }, function (reason) { // After promise completes, if promise rejected (REJECTED PART)

                            res.json(reason);
                        }).catch(function (exption) {
                            /* error :( */
                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        });
                    }
                });
            });
            flowController.on('line', function () {

                lineMastersModel.findOne({'_id': locationId, 'activeStatus': 1}, function (err, lineRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineRow == null) {

                        flowController.emit('error', {message: "LocationId missing or modified!", status: 'error', statusCode: '304'});
                    } else {

                        var promise_line = new Promises(function (resolve, reject) {

                            async.eachSeries(reservedItemId, function (element, callback) {

                                lineMastersModel.update({'_id': locationId}, {'$addToSet': {'reservedItemId': element}, '$set': {'isReservedForItem': 'YES', 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}}, function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    resolve({message: "Bulk Items reserved Successfully.", status: 'success', statusCode: '200'});
                                }
                            });
                        });
                        promise_line.then(function (respond) {

                            flowController.emit('end', {message: "Bulk Items reserved Successfully.", status: 'success', statusCode: '200'});
                        }, function (reason) { // After promise completes, if promise rejected (REJECTED PART)

                            res.json(reason);
                        }).catch(function (exption) {
                            /* error :( */
                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        });
                    }
                });
            });
            flowController.on('level', function () {

                levelMastersModel.findOne({'_id': locationId, 'activeStatus': 1}, function (err, levelRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelRow == null) {

                        flowController.emit('error', {message: "LocationId missing or modified!", status: 'error', statusCode: '304'});
                    } else {

                        var promise_level = new Promises(function (resolve, reject) {

                            async.eachSeries(reservedItemId, function (element, callback) {

                                levelMastersModel.update({'_id': locationId}, {'$addToSet': {'reservedItemId': element}, '$set': {'isReservedForItem': 'YES', 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}}, function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                            }, function (err) {

                                if (err) {

                                    reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    resolve({message: "Bulk Items reserved Successfully.", status: 'success', statusCode: '200'});
                                }
                            });

                        });
                        promise_level.then(function (respond) {

                            flowController.emit('end', {message: "Bulk Items reserved Successfully", status: 'success', statusCode: '200'});
                        }, function (reason) { // After promise completes, if promise rejected (REJECTED PART)

                            res.json(reason);
                        }).catch(function (exption) {
                            /* error :( */
                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        });
                    }
                });
            });
            flowController.on('end', function (result) {

                res.json(result);
            });
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-ITEM_RESERVATION-UPDATE(BULK)',
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
//Update Single Location's Reservation for Item
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/item-reservations/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var locationStoreId = req.body.locationStoreId.trim(); //MongoId of location

            var reservedItemId = req.body.hasOwnProperty('reservedItemId') ? req.body.reservedItemId : [];
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            // Start
            flowController.on('START', function () {

                locationStoresModel.findOne({"_id": locationStoreId, 'activeStatus': 1}, function (err, locationRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationRow == null) {

                        flowController.emit('error', {message: 'Location not configured!!', status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(reservedItemId, function (element, callback) {

                            locationStoresModel.update({'_id': locationStoreId}, {'$addToSet': {'reservedItemId': element}, '$set': {'isReservedForItem': 'YES', 'modifiedBy': modifiedBy, 'timeModified': timeInInteger}}, function (err) {
                                if (err) {

                                    callback({message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('érror', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('end', {message: "Item reserved for single location Successfully.", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('end', function (result) {

                res.json(result);
            });

            // Error
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-ITEM_RESERVATION-UPDATE(SINGLE)',
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
//Update [Bulk amount] Location's properties like(MHU,Dimensions)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/bulk/location-properties-And-MHU/')

        .patch(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var locationType = req.body.locationType.trim(); // Type of location zone/line/level/side

            var locationId = req.body.locationId.trim(); // MongoId of the location

            var materialHandlingUnitId = req.body.hasOwnProperty('materialHandlingUnitId') ? req.body.materialHandlingUnitId : [];

            var locationProperties = req.body.hasOwnProperty('locationProperties') ? req.body.locationProperties : [];

            var holdingType = req.body.holdingType;

            var modifiedBy = req.body.modifiedBy.trim();
            var query = {};
            if (locationType == "ZONE") {
                query['zoneId'] = locationId;
                query['activeStatus'] = 1;
            } else if (locationType == "LINE") {
                query['lineId'] = locationId;
                query['activeStatus'] = 1;
            } else {
                if (locationType == "LEVEL") {
                    query['levelId'] = locationId;
                    query['activeStatus'] = 1;
                }
            }

            var flowController = new EventEmitter();

            //
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                var locationArr = [];

                locationStoresModel.find(query, function (err, locationStoresRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('END', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoresRow, function (element, callbackDone) {

                            locationStoresModel.findOne({'_id': element._id, 'activeStatus': 1}, function (err, locationStoreRow) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                                } else if (locationStoreRow == null) {

                                    callbackDone({message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                                } else {

                                    var data = {
                                        id: locationStoreRow._id,
                                        customerAddress: locationStoreRow.customerAddress
                                    };
                                    locationArr.push(data);
                                    callbackDone();
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', locationArr);
                            }
                        });
                    }
                });
            });

            //
            flowController.on('1', function (locationArrData) {

                (consoleVar) ? console.log('1') : '';

                async.eachSeries(locationArrData, function (element, callbackDone) {

                    pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': element.customerAddress}, {'dropLocationAddress': element.customerAddress}], 'status': {$lt: 2}}], 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow != null) {

                            callbackDone({message: 'Unable to update location Process! This location already in use !!.', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', locationArrData);
                    }
                });
            });

            //
            flowController.on('2', function (locationDATA) {

                (consoleVar) ? console.log('2') : '';

                async.eachSeries(locationDATA, function (element, callbackDone) {

                    putSubListModel.findOne({'dropLocationAddress': element.customerAddress, 'status': {$lt: 2}, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow != null) {

                            callbackDone({message: 'Unable to update location Process! This location already in use !!!', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('UPDATE', locationDATA);
                    }
                });
            });

            //
            flowController.on('UPDATE', function (result) {

                (consoleVar) ? console.log('UPDATE') : '';

                async.eachSeries(result, function (element, callback) {

                    locationStoresModel.findOne({"_id": element.id, 'activeStatus': 1}, function (err, locationRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            callback({message: 'Location not configured!!', status: 'error', statusCode: '304'});
                        } else {

                            (materialHandlingUnitId.length != 0) ? locationRow.materialHandlingUnitId = materialHandlingUnitId : '';
                            (holdingType != undefined) ? locationRow.holdingType = holdingType : '';
                            locationRow.modifiedBy = modifiedBy;
                            locationRow.timeModified = timeInInteger;
                            locationRow.save(function (err) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('UPDATE2', result);
                    }
                });
            });

            //
            flowController.on('UPDATE2', function (result) {

                (consoleVar) ? console.log('UPDATE2') : '';

                async.eachSeries(result, function (element, callback) {

                    locationStoresModel.findOne({"_id": element.id, 'activeStatus': 1}, function (err, locationRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            callback({message: 'Location not configured!!', status: 'error', statusCode: '304'});
                        } else {

                            if (locationProperties.length == 0) {

                                setImmediate(callback);
                            } else {

                                locationRow.locationProperties = locationProperties;

                                locationRow.save(function (err) {

                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                            }
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "Bulk location properties updated successfully.", status: 'success', statusCode: '200'});
                    }
                });
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
                var dataObject = {
                    MODULE: 'LOCATION-LOCATION_PROPERTIES-UPDATE(BULK)',
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

            // Initiallize
            flowController.emit('START');
        });
//  
//            
//---------------------------------------------------------------------------------------------------------------------------
//single update for Location's properties like(MHU,Dimensions)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/location-properties-And-MHU/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var locationStoreId = req.body.locationStoreId.trim(); //MongoId of location

            var materialHandlingUnitId = req.body.hasOwnProperty('materialHandlingUnitId') ? req.body.materialHandlingUnitId : [];
            var locationProperties = req.body.hasOwnProperty('locationProperties') ? req.body.locationProperties : [];
            var holdingType = req.body.holdingType;
            var modifiedBy = req.body.modifiedBy.trim();
            var flowController = new EventEmitter();
            // Get Level data
            flowController.on('START', function () {

                var locationArr = [];
                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                    } else {

                        var data = {
                            id: locationStoreRow._id,
                            customerAddress: locationStoreRow.customerAddress
                        };
                        locationArr.push(data);
                        flowController.emit('1', locationArr);
                    }
                });
            });

            // Check if reserved for PICK
            flowController.on('1', function (locationArrData) {

                async.eachSeries(locationArrData, function (element, callbackDone) {

                    pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': element.customerAddress}, {'dropLocationAddress': element.customerAddress}], 'status': {$lt: 2}}], 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow != null) {

                            callbackDone({message: 'Unable to update location Process! This location already in use !!', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', locationArrData);
                    }
                });
            });

            // Check if reserved under PUT
            flowController.on('2', function (locationDATA) {

                async.eachSeries(locationDATA, function (element, callbackDone) {

                    putSubListModel.findOne({'dropLocationAddress': element.customerAddress, 'status': {$lt: 2}, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow != null) {

                            callbackDone({message: 'Unable to update location Process! This location already in use !!!', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('3', locationDATA);
                    }
                });
            });

            // Update changes
            flowController.on('3', function (result) {

                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoresRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow == null) {

                        flowController.emit('ERROR', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        if (materialHandlingUnitId.length > 0)
                            locationStoresRow.materialHandlingUnitId = materialHandlingUnitId;

                        if (locationProperties.length > 0)
                            locationStoresRow.locationProperties = locationProperties;

                        if (holdingType)
                            locationStoresRow.holdingType = holdingType;

                        locationStoresRow.modifiedBy = modifiedBy;
                        locationStoresRow.timeModified = timeInInteger;
                        locationStoresRow.save(function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Single Location properties updated successfully.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-LOCATION_PROPERTIES-UPDATE(SINGLE)',
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

            // START
            flowController.emit('START');
        });
//
//                
//---------------------------------------------------------------------------------------------------------------------------
//Bulk update for function,availability and comments//
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/bulk/function-and-availability/')

        .patch(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var locationType = req.body.locationType.trim(); // Type of location zone/line/level/side

            var locationId = req.body.locationId.trim(); // MongoId of the location

            var functions = req.body.function;

            var availability = req.body.availability.trim();

            var comments = req.body.comments.trim();

            var modifiedBy = req.body.modifiedBy.trim();

            var query = {};
            if (locationType == "ZONE") {
                query['zoneId'] = locationId;
                query['activeStatus'] = 1;
            } else if (locationType == "LINE") {
                query['lineId'] = locationId;
                query['activeStatus'] = 1;
            } else {
                if (locationType == "LEVEL") {
                    query['levelId'] = locationId;
                    query['activeStatus'] = 1;
                }
            }

            var flowController = new EventEmitter();

            // Get locations data
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                var locationArray = [];
                //Build Dynamic Query
                locationStoresModel.find(query, function (err, locationStoresRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('END', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoresRow, function (element, callbackDone) {

                            locationStoresModel.findOne({'_id': element._id, 'activeStatus': 1}, function (err, locationStoreRow) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                                } else if (locationStoreRow == null) {

                                    callbackDone({message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                                } else {

                                    var data = {
                                        id: locationStoreRow._id,
                                        customerAddress: locationStoreRow.customerAddress
                                    };
                                    locationArray.push(data);
                                    callbackDone();
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', locationArray);
                            }
                        });
                    }
                });
            });

            // Pick sublist check availability
            flowController.on('1', function (locationArrayData) {

                (consoleLog) ? console.log('1') : '';

                async.eachSeries(locationArrayData, function (element, callbackDone) {

                    pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': element.customerAddress}, {'dropLocationAddress': element.customerAddress}], 'status': {$lt: 31}}], 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow != null) {

                            callbackDone({message: 'Unable to update Location! This Location already in use..', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', locationArrayData);
                    }
                });
            });

            // Put sublist check availability
            flowController.on('2', function (locationArrayData) {

                (consoleLog) ? console.log('2') : '';

                async.eachSeries(locationArrayData, function (element, callbackDone) {

                    putSubListModel.findOne({'dropLocationAddress': element.customerAddress, 'status': {$lt: 31}, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow != null) {

                            callbackDone({message: 'Unable to update Location! This Location already in use...', status: 'error', statusCode: '304'});
                        } else {
                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('UPDATE', locationArrayData);
                    }
                });
            });

            // Update function and availability
            flowController.on('UPDATE', function (locationArrayData) {

                (consoleLog) ? console.log('UPDATE') : '';

                async.eachSeries(locationArrayData, function (element, callback) {

                    locationStoresModel.findOne({"_id": element.id, 'activeStatus': 1}, function (err, locationRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            flowController.emit('ERROR', {message: 'Location not configured!!', status: 'error', statusCode: '304'});
                        } else {

                            locationRow.function = functions;
                            locationRow.availability = availability;
                            locationRow.comments = comments;
                            locationRow.timeModified = timeInInteger;
                            locationRow.modifiedBy = modifiedBy;

                            locationRow.save(function (err) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "Location details updated successfully.", status: 'success', statusCode: '200'});
                    }
                });
            });

            // END
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // ERROR
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-FUNCTION&AVAILABILITY-UPDATE(BULK)',
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
//---------------------------------------------------------------------------------------------------
//Single update for function,availability and Comments
//---------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/function-and-availability/')

        .patch(function (req, res) {

            console.log(req.body);
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var locationStoreId = req.body.locationStoreId.trim(); //MongoId of location

            var functions = req.body.function ? req.body.function.trim() : "";
            var availability = req.body.availability.trim();
            var comments = req.body.comments.trim();
            var modifiedBy = req.body.modifiedBy.trim();
            var flowController = new EventEmitter();

            // Start
            flowController.on('START', function () {

                var locationArr = [];
                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                    } else {

                        var data = {
                            id: locationStoreRow._id,
                            customerAddress: locationStoreRow.customerAddress
                        };
                        locationArr.push(data);
                        flowController.emit('1', locationArr);
                    }
                });
            });

            // Pick reservation of location
            flowController.on('1', function (locationArrData) {

                async.eachSeries(locationArrData, function (element, callbackDone) {

                    pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': element.customerAddress}, {'dropLocationAddress': element.customerAddress}], 'status': {$lt: 2}}], 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow != null) {

                            callbackDone({message: 'Unable to update Location! This Location already in use...', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', locationArrData);
                    }
                });
            });

            // Put reservation of location
            flowController.on('2', function (locationDATA) {

                async.eachSeries(locationDATA, function (element, callbackDone) {

                    putSubListModel.findOne({'dropLocationAddress': element.customerAddress, 'status': {$lt: 2}, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow != null) {

                            callbackDone({message: 'Unable to update Location! This Location already in use....', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('3', locationDATA);
                    }
                });
            });

            // Final changes
            flowController.on('3', function (result) {

                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoresRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow == null) {

                        flowController.emit('ERROR', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        locationStoresRow.function = functions ? functions : locationStoresRow.function;
                        locationStoresRow.availability = availability;
                        locationStoresRow.comments = comments;
                        locationStoresRow.modifiedBy = modifiedBy;
                        locationStoresRow.timeModified = timeInInteger;

                        locationStoresRow.save(function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Single location function updated successfully', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-FUNCTION&AVAILABILITY-UPDATE(SINGLE)',
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
//-------------------------------------------------------------------------------------------------------
//Bulk Update Location's capacity cal
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/bulk/location-capacity/')

        .patch(function (req, res) {

            var consoleVar = 1;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var locationType = req.body.locationType.trim().toUpperCase(); // Type of location zone/line/level/side

            var locationId = req.body.locationId.trim(); // MongoId of the location

            var newCapacity = parseInt(req.body.newCapacity); //new capacity for userdefined

            var modifiedBy = req.body.modifiedBy.trim();

            var query = {};
            if (locationType == "ZONE") {
                query['zoneId'] = locationId;
                query['activeStatus'] = 1;
            } else if (locationType == "LINE") {
                query['lineId'] = locationId;
                query['activeStatus'] = 1;
            } else {
                if (locationType == "LEVEL") {
                    query['levelId'] = locationId;
                    query['activeStatus'] = 1;
                }
            }

            var flowController = new EventEmitter();

            // Get Level data
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                var locationArr = [];
                //Build Dynamic Query
                locationStoresModel.find(query, function (err, locationStoresRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('END', {message: 'Location data missing!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoresRow, function (element, callbackDone) {

                            locationStoresModel.findOne({'_id': element._id, 'activeStatus': 1}, function (err, locationStoreRow) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                                } else if (locationStoreRow == null) {

                                    callbackDone({message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                                } else {

                                    var data = {
                                        id: locationStoreRow._id,
                                        customerAddress: locationStoreRow.customerAddress
                                    };
                                    locationArr.push(data);
                                    callbackDone();
                                }
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('0', locationArr);
                        });
                    }
                });
            });

            // Check if location properties set already or not
            flowController.on('0', function (locationArrData) {

                (consoleVar) ? console.log('0') : '';

                var conflictArray = [];

                async.eachSeries(locationArrData, function (element, callbackDone) {

                    locationStoresModel.findOne({'_id': element.id, 'activeStatus': 1}, function (err, locationStoreRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                        } else if (locationStoreRow == null) {

                            callbackDone({message: 'Unable to update Location process ! Try again later.', status: 'success', statusCode: '304'});
                        } else {
                            if (locationStoreRow.locationProperties.length == 0) {

                                conflictArray.push({process: 'done'});
                            }

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else if (conflictArray.length === locationArrData.length)
                        flowController.emit('UPDATE', locationArrData);
                    else
                        flowController.emit('1', locationArrData);
                });
            });

            // Check if reserved under pick process
            flowController.on('1', function (locationArrData) {

                (consoleVar) ? console.log('1') : '';

                async.eachSeries(locationArrData, function (element, callbackDone) {

                    pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': element.customerAddress}, {'dropLocationAddress': element.customerAddress}], 'status': {$lt: 2}}], 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err)
                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        else if (pickSubListRow != null)
                            callbackDone({message: 'Unable to update sequence! Try again later.', status: 'error', statusCode: '304'});
                        else
                            callbackDone();

                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('2', locationArrData);
                });
            });

            // Check if reserved under put process
            flowController.on('2', function (locationDATA) {

                (consoleVar) ? console.log('2') : '';

                async.eachSeries(locationDATA, function (element, callbackDone) {

                    putSubListModel.findOne({'dropLocationAddress': element.customerAddress, 'status': {$lt: 2}, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow != null) {

                            callbackDone({message: 'Unable to update location!This location already in use..', status: 'error', statusCode: '304'});
                        } else {

                            callbackDone();
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('UPDATE', locationDATA);
                    }
                });
            });

            // Update
            flowController.on('UPDATE', function (result) {

                (consoleVar) ? console.log('UPDATE') : '';

                async.eachSeries(result, function (element, callback) {

                    locationStoresModel.findOne({"_id": element.id, 'activeStatus': 1}, function (err, locationRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            callback({message: 'Location not configured!!', status: 'error', statusCode: '304'});
                        } else {

                            var array = [];

                            var newAvailableCapacity = '';

                            availableLength = locationRow.locationProperties.length;

                            var newUserDefinedCapacity = String(newCapacity);

                            var newAvailableCapacity = 0;

                            if (availableLength == 0) {

                                newAvailableCapacity = newCapacity;
                            } else if ((locationRow.locationProperties[0].userDefinedCapacity == locationRow.availableCapacity)) {

                                newAvailableCapacity = newCapacity;
                            } else if (locationRow.availableCapacity < parseInt(locationRow.locationProperties[0].userDefinedCapacity)) {
                                if (newCapacity > parseInt(locationRow.locationProperties[0].userDefinedCapacity)) {

                                    newAvailableCapacity = locationRow.availableCapacity + (newCapacity - (parseInt(locationRow.locationProperties[0].userDefinedCapacity)));
                                } else {

                                    newAvailableCapacity = locationRow.availableCapacity - (parseInt(locationRow.locationProperties[0].userDefinedCapacity) - newCapacity);
                                }
                            }

                            if (newAvailableCapacity < 0) {

                                callback({message: 'Certain locations are going to negative by existing available capacities!', status: 'error', statusCode: '500'});
                            } else {

                                var data = {};
                                data.userDefinedCapacity = newCapacity;
                                data.maxLength = (availableLength != 0) ? locationRow.locationProperties[0].maxLength : "";
                                data.maxWidth = (availableLength != 0) ? locationRow.locationProperties[0].maxWidth : "";
                                data.maxHeight = (availableLength != 0) ? locationRow.locationProperties[0].maxHeight : "";
                                data.maxDiameter = (availableLength != 0) ? locationRow.locationProperties[0].maxDiameter : "";
                                data.maxWeight = (availableLength != 0) ? locationRow.locationProperties[0].maxWeight : "";
                                data.minLength = (availableLength != 0) ? locationRow.locationProperties[0].minLength : "";
                                data.minWidth = (availableLength != 0) ? locationRow.locationProperties[0].minWidth : "";
                                data.minHeight = (availableLength != 0) ? locationRow.locationProperties[0].minHeight : "";
                                data.minDiameter = (availableLength != 0) ? locationRow.locationProperties[0].minDiameter : "";
                                data.minWeight = (availableLength != 0) ? locationRow.locationProperties[0].minWeight : "";

                                array.push(data);

                                locationRow.locationProperties = array;
                                locationRow.availableCapacity = newAvailableCapacity;
                                locationRow.timeModified = timeInInteger;
                                locationRow.modifiedBy = modifiedBy;

                                locationRow.save(function (err) {
                                    if (err)
                                        callback({message: 'Error while updating!!!!!', status: 'error', statusCode: '500'});
                                    else
                                        setImmediate(callback);
                                });
                            }
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('END', {message: "Bulk location capacity updated successfully.", status: 'success', statusCode: '200'});
                });
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
                var dataObject = {
                    MODULE: 'LOCATION-LOCATION_CAPACITY-UPDATE(BULK)',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err)
                        console.log('Entered error ');
                    else
                        console.log('Entered success ');
                });

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//-------------------------------------------------------------------------------------------------------
//Single Update Location's capacity cal
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/locationStore/configuration/update/location-capacity/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var locationStoreId = req.body.locationStoreId.trim(); // MongoId of the location

            var newCapacity = req.body.newCapacity.trim();

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            // Start
            flowController.on('START', function () {

                functionAreaArray = [];

                functionAreaModel.find({'name': {'$in': ['REPROCESS', 'DISPATCH']}, 'activeStatus': 1}, function (err, functionAreaRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else if (functionAreaRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Function area details not found.', status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(functionAreaRow, function (element, callback) {

                            functionAreaArray.push(String(element._id));
                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('0', functionAreaArray);
                        });
                    }
                });
            });

            // Get 
            flowController.on('0', function (functionAreaArray) {

                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'Unable to update Location process ! Try again later.', status: 'error', statusCode: '304'});
                    } else {
                        if (functionAreaArray.indexOf(locationStoreRow.function) > -1) {

                            if (parseInt(newCapacity) !== -1)
                                flowController.emit('ERROR', {message: 'Only -1 can be set in case capacity of the location is unlimited.', status: 'error', statusCode: '304'});
                            else
                                flowController.emit('UPDATE-UNLIMITED');

                        } else {

                            flowController.emit('1', locationStoreRow, functionAreaArray);
                        }
                    }
                });
            });

            // Check if location reserved under pick process
            flowController.on('1', function (locationStoreRow, functionAreaArray) {

                pickSubListModel.findOne({$and: [{$or: [{'pickLocationAddress': locationStoreRow.customerAddress}, {'dropLocationAddress': locationStoreRow.customerAddress}], 'status': {$lt: 2}}], 'activeStatus': 1}, function (err, pickSubListRow) {

                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (pickSubListRow != null)
                        flowController.emit('ERROR', {message: 'Unable to update sequence! Try again later.', status: 'error', statusCode: '304'});
                    else
                        flowController.emit('2', locationStoreRow, functionAreaArray);
                });
            });

            // Check if location reserved under put process
            flowController.on('2', function (locationStoreRow, functionAreaArray) {

                putSubListModel.findOne({'dropLocationAddress': locationStoreRow.customerAddress, 'status': {$lt: 2}, 'activeStatus': 1}, function (err, putSubListRow) {

                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (putSubListRow != null)
                        flowController.emit('ERROR', {message: 'Unable to update sequence! Try again later.', status: 'error', statusCode: '304'});
                    else
                        flowController.emit('UPDATE', locationStoreRow, functionAreaArray);
                });
            });

            // Final update
            flowController.on('UPDATE', function () {

                locationStoresModel.findOne({"_id": locationStoreId, 'activeStatus': 1}, function (err, locationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationRow == null) {

                        flowController.emit('ERROR', {message: 'Location not found!', status: 'error', statusCode: '304'});
                    } else {
                        var array = [];
                        var newAvailableCapacity = '';
                        availableLength = locationRow.locationProperties.length;
                        var newUserDefinedCapacity = String(newCapacity);
                        var newAvailableCapacity = 0;
                        if (availableLength == 0) {

                            newAvailableCapacity = newCapacity;
                        } else if ((locationRow.locationProperties[0].userDefinedCapacity == locationRow.availableCapacity)) {

                            newAvailableCapacity = newCapacity;
                        } else if (locationRow.availableCapacity < parseInt(locationRow.locationProperties[0].userDefinedCapacity)) {
                            if (newCapacity > parseInt(locationRow.locationProperties[0].userDefinedCapacity)) {

                                newAvailableCapacity = locationRow.availableCapacity + (newCapacity - (parseInt(locationRow.locationProperties[0].userDefinedCapacity)));
                            } else {

                                newAvailableCapacity = locationRow.availableCapacity - (parseInt(locationRow.locationProperties[0].userDefinedCapacity) - newCapacity);
                            }
                        }

                        if (newAvailableCapacity < 0) {

                            flowController.emit('ERROR', {message: 'Location ' + locationRow.customerAddress + '\'s capacity is going to negative by existing available items at this location!', status: 'error', statusCode: '500'});
                        } else {

                            var data = {};
                            data.userDefinedCapacity = newUserDefinedCapacity;
                            data.maxLength = (availableLength != 0) ? locationRow.locationProperties[0].maxLength : "";
                            data.maxWidth = (availableLength != 0) ? locationRow.locationProperties[0].maxWidth : "";
                            data.maxHeight = (availableLength != 0) ? locationRow.locationProperties[0].maxHeight : "";
                            data.maxDiameter = (availableLength != 0) ? locationRow.locationProperties[0].maxDiameter : "";
                            data.maxWeight = (availableLength != 0) ? locationRow.locationProperties[0].maxWeight : "";
                            data.minLength = (availableLength != 0) ? locationRow.locationProperties[0].minLength : "";
                            data.minWidth = (availableLength != 0) ? locationRow.locationProperties[0].minWidth : "";
                            data.minHeight = (availableLength != 0) ? locationRow.locationProperties[0].minHeight : "";
                            data.minDiameter = (availableLength != 0) ? locationRow.locationProperties[0].minDiameter : "";
                            data.minWeight = (availableLength != 0) ? locationRow.locationProperties[0].minWeight : "";

                            array.push(data);
                            locationRow.locationProperties = array;
                            locationRow.availableCapacity = newAvailableCapacity;
                            locationRow.timeModified = timeInInteger;
                            locationRow.modifiedBy = modifiedBy;
                            locationRow.save(function (err) {
                                if (err)
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                else
                                    flowController.emit('END', {message: 'Location capacity updated in system.', status: 'success', statusCode: '200'});
                            });
                        }
                    }
                }
                );
            });

            // Final update for REPROCESS & DISPATCH
            flowController.on('UPDATE-UNLIMITED', function () {

                locationStoresModel.findOne({"_id": locationStoreId, 'activeStatus': 1}, function (err, locationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationRow == null) {

                        flowController.emit('ERROR', {message: 'Location not found!', status: 'error', statusCode: '304'});
                    } else {

                        availableLength = locationRow.locationProperties.length;

                        var data = {};
                        data.userDefinedCapacity = newCapacity;
                        data.maxLength = (availableLength != 0) ? locationRow.locationProperties[0].maxLength : "";
                        data.maxWidth = (availableLength != 0) ? locationRow.locationProperties[0].maxWidth : "";
                        data.maxHeight = (availableLength != 0) ? locationRow.locationProperties[0].maxHeight : "";
                        data.maxDiameter = (availableLength != 0) ? locationRow.locationProperties[0].maxDiameter : "";
                        data.maxWeight = (availableLength != 0) ? locationRow.locationProperties[0].maxWeight : "";
                        data.minLength = (availableLength != 0) ? locationRow.locationProperties[0].minLength : "";
                        data.minWidth = (availableLength != 0) ? locationRow.locationProperties[0].minWidth : "";
                        data.minHeight = (availableLength != 0) ? locationRow.locationProperties[0].minHeight : "";
                        data.minDiameter = (availableLength != 0) ? locationRow.locationProperties[0].minDiameter : "";
                        data.minWeight = (availableLength != 0) ? locationRow.locationProperties[0].minWeight : "";

                        var array = [];
                        array.push(data);

                        locationRow.locationProperties = array;
                        locationRow.availableCapacity = newCapacity;
                        locationRow.timeModified = timeInInteger;
                        locationRow.modifiedBy = modifiedBy;

                        locationRow.save(function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: 'Location capacity updated in system.', status: 'success', statusCode: '200'});
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                var dataObject = {
                    MODULE: 'LOCATION-LOCATION_CAPACITY-UPDATE(SINGLE)',
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
module.exports = router;