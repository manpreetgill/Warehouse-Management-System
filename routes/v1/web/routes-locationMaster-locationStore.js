var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var MagicIncrement = require('magic-increment');
//----------------------------------------------------------------------------------------------------------------------------
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var transactionalLogsModel = require('../../../models/transactionalLogs/collection-transactionalLogs');
var customPalletNumberModel = require('../../../models/mongodb/processMaster-customPalletNumber/collection-customPalletNumber');
//----------------------------------------------------------------------------------------------------------------------------
var locationMaster = require('../../../functionSet/function-locationMaster.js');
//----------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//----------------------------------------------------------------------------------------------------------------------------
// Assign category to locations
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/reprocess/action/update/custom-pallet-number/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var palletNumberList = JSON.parse(req.body.palletNumberList);

            //var deviceId = req.body.deviceId.trim();

            //var userId = req.body.userId.trim();

            var rgx = new RegExp("^" + 'CP_' + moment(new Date()).format('DDMMYY'));

            var flowController = new EventEmitter();

            // Get all pallet number records from database
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                customPalletNumberModel.findOne({'customPalletNumber': {$regex: rgx}, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, customPalletNumberRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var customPalletNumber = (customPalletNumberRow == null) ? 'CP_' + moment(new Date()).format('DDMMYY') + '0001' : MagicIncrement.inc(customPalletNumberRow.customPalletNumber);

                        newCustomPalletNumber = new customPalletNumberModel();
                        newCustomPalletNumber.customPalletNumber = customPalletNumber;
                        newCustomPalletNumber.timeCreated = timeInInteger;

                        newCustomPalletNumber.save(function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('0', customPalletNumber);
                        });
                    }
                });
            });

            // Get all pallet number records from database
            flowController.on('0', function (customPalletNumber) {

                (consoleLog) ? console.log('0') : '';

                functionAreaModel.findOne({'name': 'REPROCESS', 'activeStatus': 1}, function (err, functionAreaRow) {

                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (functionAreaRow == null)
                        flowController.emit('ERROR', {message: 'Function area for pick missing! Records tampered/removed from system.', status: 'error', statusCode: '200'});
                    else
                        flowController.emit('1', functionAreaRow, customPalletNumber);
                });
            });

            // Validate against Box Type and current location of Item
            flowController.on('1', function (functionAreaRow, customPalletNumber) {

                (consoleLog) ? console.log('1') : '';

                reprocessId = String(functionAreaRow._id);

                async.eachSeries(palletNumberList, function (element, callback) {

                    itemStoreModel.find({'palletNumber': element, 'locationStoreId': reprocessId, 'activeStatus': 1}, function (err, itemStoreRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            callback({message: 'Pallet number ' + element + ' does not belongs to REPROCESS Area.', status: 'error', statusCode: '404'});
                        } else {

                            async.eachSeries(itemStoreRow, function (element2, callback2) {

                                var boxType = (element2.randomFields[0].boxType) ? element2.randomFields[0].boxType : '';

                                if (boxType != '' && boxType == 'O')
                                    setImmediate(callback2);
                                else
                                    callback2({message: 'Box type of Boxes over pallet ' + element + ' are not OUTER'});

                            }, function (err) {
                                if (err)
                                    callback(err);
                                else
                                    setImmediate(callback);
                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('2', reprocessId, customPalletNumber);
                });
            });

            // Check if any of the pallet is already schedule
            flowController.on('2', function (reprocessId, customPalletNumber) {

                async.eachSeries(palletNumberList, function (element, callback) {

                    pickSubListModel.find({'itemType': 'PALLET', 'itemValue': element, 'pickLocationId': reprocessId, 'status': {'$lt': 31}, 'activeStatus': 1}, function (err, pickSubListRow) {

                        if (err)
                            callback(err);
                        else if (pickSubListRow.length != 0)
                            callback({message: 'Pallet No. ' + element + ' is already scheduled for PICK from reprocess area!'});
                        else
                            setImmediate(callback);

                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('3', customPalletNumber);
                });
            });

            // Update CPN
            flowController.on('3', function (customPalletNumber) {

                async.eachSeries(palletNumberList, function (element, callback) {

                    var query = {'palletNumber': element};
                    var update = {'$set': {'customPalletNumber': customPalletNumber}};
                    var multi = {'multi': true};

                    itemStoreModel.update(query, update, multi, function (err) {
                        if (err)
                            callback({message: "Technical error occurred! " + err, status: 'error', statusCode: '500'});
                        else
                            setImmediate(callback);
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('4', customPalletNumber);
                });
            });

            // Add reprocess Log
            flowController.on('4', function (customPalletNumber) {

                async.eachSeries(palletNumberList, function (element, callback) {

                    var lotAddress = [];

                    itemStoreModel.find({'palletNumber': element, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) {
                            callback(err);
                        } else if (itemStoreRow.length != 0) {
                            callback({message: 'Details of Pallet No. ' + element + ' not available in system'});
                        } else {

                            async.eachSeries(itemStoreRow, function (element2, callback2) {

                                lotAddress.push(element2.lotAddress);
                                callback2();

                            }, function (err) {

                                transactionalLogModel = new transactionalLogsModel();

                                transactionalLogModel.warehouseId = warehouseId;
                                transactionalLogModel.itemType = 'PALLET';
                                transactionalLogModel.itemValue = element;
                                transactionalLogModel.activity = 'Custom pallet number for pallet no. ' + element + ' updated to ' + customPalletNumber + ' in REPROCESS AREA'; //
                                transactionalLogModel.lotAddress = lotAddress; //
                                transactionalLogModel.activityType = 'REPROCESS';
                                transactionalLogModel.date = moment(new Date()).format('DD/MM/YY');
                                transactionalLogModel.timeCreated = timeInInteger; // sent via switch
                                transactionalLogModel.processCode = 3001; //sent via switch

                                transactionalLogModel.save(function (err) {
                                    if (err)
                                        callback(err);
                                    else
                                        setImmediate(callback);
                                });
                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});s
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
                var dataObject = {
                    MODULE: 'LOCATION-CUSTOM_PALLET_NUMBER-UPDATE',
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
//----------------------------------------------------------------------------------------------------------------------------
// Assign category to locations
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/assignment/create/assign-category/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var locationType = req.body.locationType.trim(); // Type of location zone/line/level/side

            var categoryId = req.body.categoryId.trim(); //

            var locationId = req.body.locationId.trim(); // MongoId of the location

            var reservedBy = req.body.locationType.trim();

            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                if (locationType === 'ZONE') {

                    zoneMastersModel.findOne({'_id': locationId, activeStatus: 1}, function (err, zoneMastersRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (zoneMastersRow == null) {

                            flowController.emit('ERROR', {message: 'Zone missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                        } else {

                            if (zoneMastersRow != null) {

                                if (zoneMastersRow.isReservedForCategory === 'YES') {

                                    flowController.emit('ERROR', {message: 'Zone already reserved for different category, Remove assigned relations first!', status: 'error', statusCode: '304'});
                                } else if (zoneMastersRow.isResevedForSubCategory === 'YES') {

                                    flowController.emit('ERROR', {message: 'Zone already reserved for different sub-category, Remove assigned relations first!', status: 'error', statusCode: '304'});
                                } else if (zoneMastersRow.isResevedForItem === 'YES') {

                                    flowController.emit('ERROR', {message: 'Zone already reserved for different item, Remove assigned relations first!', status: 'error', statusCode: '304'});
                                } else if (zoneMastersRow.availability === 'B') {

                                    flowController.emit('ERROR', {message: 'Zone blocked currently from all operations.', status: 'error', statusCode: '304'});
                                } else {

                                    zoneMastersRow.isReservedForCategory = 'YES';
                                    zoneMastersRow.reservedCategoryId = categoryId;
                                    zoneMastersRow.reservedBy = reservedBy;
                                    zoneMastersRow.timeReserved = timeInInteger;

                                    zoneMastersRow.save(function (err, resultRow) {

                                        //var promise_reserveCategoryForAllChildrens = Promises(function (resolve, reject) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            lineMastersModel.find({'zoneId': locationId, activeStatus: 1}, function (err, lineMastersRow) {

                                                if (err) {

                                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (lineMastersRow == null) {

                                                    flowController.emit('ERROR', {message: 'Line missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                                                } else {

                                                    lineMastersModel.update({zoneId: locationId}, {isReservedForCategory: 'YES', reservedCategoryId: categoryId, reservedBy: reservedBy, timeReserved: timeInInteger}, {multi: true}, function (err, num) {

                                                        if (err) {

                                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                        } else {

                                                        }
                                                    });
                                                }
                                            });
                                        }
                                        //});
                                    });
                                }
                            }
                        }
                    });

                } else if (locationType === 'LINE') {

                    lineMastersModel.findOne({'_id': locationId, warehouseId: warehouseId, activeStatus: 1}, function (err, lineMastersModel) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (lineMastersModel == null) {

                            flowController.emit('ERROR', {message: 'Zone missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                        } else {

                            if (lineMastersModel != null) {


                            }
                        }
                    });

                } else
                if (locationType == 'LEVEL') {

                    levelMastersModel.findOne({'_id': locationId, warehouseId: warehouseId, activeStatus: 1}, function (err, levelMastersModel) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (levelMastersModel == null) {

                            flowController.emit('ERROR', {message: 'Zone missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                        } else {

                            if (levelMastersModel != null) {


                            }
                        }
                    });

                } else {

                    if (locationType == 'SIDE') {

                        locationStoresModel.findOne({'_id': locationId, warehouseId: warehouseId, activeStatus: 1}, function (err, locationStoresModel) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (locationStoresModel == null) {

                                flowController.emit('ERROR', {message: 'Zone missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                            } else {

                                if (locationStoresModel != null) {


                                }
                            }
                        });

                    }
                }
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
                    MODULE: 'CREATE-ASSIGN-CATEGORY',
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
//----------------------------------------------------------------------------------------------------------------------------
// Assign category to locations
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationStore/web/location/combination/')

        .post(function (req, res) {

            var category = ['GROCERY'];
            var subCategory = ['FRUIT', 'FASTMOVING'];

            var combinationArray = locationMaster.combine(category.concat(subCategory), 1);
            console.log(combinationArray);

            //            var res = [];
            //
            //            combinationArray.forEach(function (element) {
            //                console.log(element.includes('GROCERY'));// true if present
            //                console.log(element);
            //            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Assign category to locations
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/all-customer-addresses/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (showConsole) ? console.log(req.params) : '';

            var locationStoreArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                locationStoresModel.find({'activeStatus': 1}).sort({'systemAddress': 1}).exec(function (err, locationStoresRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('ERROR', {message: "Warehouse is yet to configure or Data missing, records tampered/removed from system", status: 'error', data: [], statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoresRow, function (element, callback) {

                            var locationRow_data = {};
                            locationRow_data.locationStoreId = element._id;
                            locationRow_data.customerAddress = element.customerAddress || "";

                            locationStoreArray.push(locationRow_data);
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', locationStoreArray);
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
                    if (err)
                        console.log('Entered error ');
                    else
                        console.log('Entered success ');
                });
                res.json(error);
            });

            //instlize
            flowController.emit('START');
        });
//
//
module.exports = router;