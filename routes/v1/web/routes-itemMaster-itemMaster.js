var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
//---------------------------------------------------------------------------------------------------------------------------
var pathitemMaster = './logs/dailyLog/itemMasterLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var holdingTypesModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get Details of specific item from item master
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/item/:warehouseId/:itemMasterId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemMasterId = req.params.itemMasterId.trim(); // MongoId of the warehouse
            // Find all the active rows in the item category collection 
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemMasterModel.findOne({'_id': itemMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemMasterRow) {
                    var itemMasterArray = [];
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                    } else {

                        itemMasterArray.push(itemMasterRow);
                        flowController.emit('END', {data: itemMasterArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
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
// Add item to item master
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/item/')

        .post(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            //Request onject is JSON object so no need to parse the array inside it
            var warehouseId = req.body.warehouseId.trim();
            var itemCode = req.body.itemCode.trim().toUpperCase();
            var itemSerialNumber = req.body.itemSerialNumber.trim().toUpperCase(); //YES/NO
            var barcode = req.body.barcode && req.body.barcode.trim();
            var itemSystemSpecification = (req.body.hasOwnProperty('itemSystemSpecification')) ? req.body.itemSystemSpecification : []; // Array JSON
            var inwardRule = (req.body.hasOwnProperty('inwardRule')) ? req.body.inwardRule : []; // Array JSON
            var category = req.body.category.trim();
            var subCategory = (req.body.hasOwnProperty('subCategory')) ? req.body.subCategory : []; // Array JSON
            var measurementUnit = req.body.measurementUnit.trim(); // kg/litre/units
            var overflowAutoAssign = req.body.overflowAutoAssign.trim().toUpperCase(); // YES/NO
            var exclusiveStorage = req.body.exclusiveStorage.trim().toUpperCase(); // YES/NO
            var holdingType = req.body.holdingType.trim(); // PALLET/BARREL/BAG etc (MongoId)
            var itemSpecification = req.body.itemSpecification.trim(); // One line specification for search purpose
            var itemDescription = req.body.itemDescription.trim(); // Details about item
            var dispatchRule = req.body.dispatchRule.trim(); // Dispatch rules like FIFO/LIFO etc
            var priceValue = req.body.priceValue; // Rate
            var priceCurrency = req.body.priceCurrency.trim().toUpperCase(); // Currency
            var manufacturingDate = req.body.manufacturingDate.trim().toUpperCase(); // YES/NO
            var expiryDate = req.body.expiryDate.trim().toUpperCase(); // YES/NO
            var alertDate = req.body.alertDate.trim().toUpperCase(); // YES/NO
            var alertDays = (alertDate === 'YES') ? req.body.alertDays.trim() : 0; //
            var from = (alertDate === 'YES') ? req.body.from.trim() : 0; //1 - Manufacturing date, 2 - Expiry Date, 3 - Date of Inward
            var handlingUnit = (req.body.hasOwnProperty('handlingUnit')) ? req.body.handlingUnit : []; // Array JSON
            var pickAlert = req.body.pickAlert && req.body.pickAlert.trim();
            var createdBy = req.body.createdBy && req.body.createdBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemMasterModel.find({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This item already configured! Provide different item-code.', status: 'error', statusCode: '304'});
                    } else {

                        if (itemMasterRow.length == 0) {
                            // Waterfall Execution 
                            async.waterfall([
                                // Processing Image
                                function (callback) {

                                    if (req.body.image) {

                                        var base64Data = req.body.image;
                                        databasePath = '/images/item/' + itemCode + '_' + timeInInteger + ".jpeg";
                                        var uploadPath = "./public/images/item/" + itemCode + '_' + timeInInteger + ".jpeg";
                                        require("fs").writeFile(uploadPath, base64Data, 'base64', function (err) {

                                            if (err) {

                                                callback(res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                                            } else {

                                                callback(null, databasePath);
                                            }
                                        });
                                    } else {

                                        databasePath = '/images/item/default.jpg';
                                        callback(null, databasePath);
                                    }
                                },
                                // Process & make Category combinations
                                function (databasePath, callback) {

                                    var categoryCombinations = [];
                                    itemCategorysModel.findOne({'_id': category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                        if (err) {

                                            callback(err);
                                        } else if (itemCategoryRow == null) {

                                            callback(null, databasePath, '');
                                        } else {

                                            categoryCombinations.push(itemCategoryRow.name);
                                            if (subCategory.length != 0) {

                                                async.eachSeries(subCategory, function (element, callbackSubCategory) {

                                                    itemSubCategorysModel.findOne({'_id': element, 'itemCategoryId': category, 'activeStatus': 1}, function (err, itemSubCategoryRow) {

                                                        if (err) {

                                                            callbackSubCategory(err);
                                                        } else if (itemSubCategoryRow == null) {

                                                            callbackSubCategory();
                                                        } else {

                                                            categoryCombinations.push(itemSubCategoryRow.name);
                                                            callbackSubCategory();
                                                        }
                                                    });
                                                }, function (err) {

                                                    if (err) {

                                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        callback(null, databasePath, categoryCombinations);
                                                    }
                                                });
                                            } else {

                                                callback(null, databasePath, categoryCombinations);
                                            }
                                        }
                                    });
                                },
                                // Save product
                                function (databasePath, categoryCombinations, callback) {

                                    var newItemMaster = new itemMasterModel();
                                    newItemMaster.warehouseId = warehouseId;
                                    newItemMaster.itemCode = itemCode;
                                    newItemMaster.itemSerialNumber = itemSerialNumber;
                                    newItemMaster.barcode = barcode;
                                    newItemMaster.image = databasePath;
                                    newItemMaster.itemSystemSpecification = (itemSystemSpecification == null) ? [] : itemSystemSpecification;
                                    newItemMaster.inwardRule = (inwardRule == null) ? [] : inwardRule;
                                    newItemMaster.categoryCombinations = categoryCombinations;
                                    newItemMaster.category = category;
                                    newItemMaster.subCategory = (subCategory == null) ? [] : subCategory;
                                    newItemMaster.measurementUnit = measurementUnit;
                                    newItemMaster.overflowAutoAssign = overflowAutoAssign;
                                    newItemMaster.exclusiveStorage = exclusiveStorage;
                                    newItemMaster.holdingType = holdingType;
                                    newItemMaster.itemSpecification = itemSpecification;
                                    newItemMaster.itemDescription = itemDescription;
                                    newItemMaster.dispatchRule = dispatchRule;
                                    newItemMaster.priceValue = priceValue;
                                    newItemMaster.priceCurrency = priceCurrency;
                                    newItemMaster.manufacturingDate = manufacturingDate;
                                    newItemMaster.expiryDate = expiryDate;
                                    newItemMaster.alertDate = alertDate;
                                    newItemMaster.alertDays = alertDays;
                                    newItemMaster.from = from;
                                    newItemMaster.handlingUnit = (handlingUnit == null) ? [] : handlingUnit;
                                    newItemMaster.pickAlert = pickAlert;
                                    newItemMaster.createdBy = createdBy;
                                    newItemMaster.timeCreated = timeInInteger;
                                    newItemMaster.save(function (err, saveResponse) {
                                        if (err) {

                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            callback(null, {message: 'Item\s master information configured into system!', status: 'success', statusCode: '201'});
                                        }
                                    });
                                }
                            ], function (err, result) {
                                if (err) { // Custom or manual conditional error while processing

                                    flowController.emit('ERROR', err);
                                    //res.json(err);
                                } else {

                                    flowController.emit('LOG');
                                    flowController.emit('end', result);
                                    //res.json(result);
                                }
                            });
                        }
                    }
                });
            });
            //
            //
            flowController.on('LOG', function () {

                usersModel.findOne({_id: createdBy, activeStatus: 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {
                        console.log('null');
                        //flowController.emit('ERROR', {message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathitemMaster, '\n' + 'WEB' + ',' + 'CREATE' + ',' + username + ',' + itemCode + ',' + itemSerialNumber + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err, appendResponse) {
                            if (err) {
                                // append failed
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file!');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'ITEM MASTER-ITEM-ADD',
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
            flowController.on('end', function (reuslt) {

                (showConsole) ? console.log('end') : '';
                res.json(reuslt);
            });
            flowController.emit('START');
        });
//        
//        
//---------------------------------------------------------------------------------------------------------------------------
// Update Item Master
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/update/item/')

        .patch(function (req, res) {
            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            //Request onject is JSON object so no need to parse the array inside it
            var warehouseId = req.body.warehouseId.trim();
            var itemMasterId = req.body.itemMasterId.trim();
            var itemSystemSpecification = (req.body.hasOwnProperty('itemSystemSpecification')) ? req.body.itemSystemSpecification : []; // Array JSON
            var inwardRule = (req.body.hasOwnProperty('inwardRule')) ? req.body.inwardRule : []; // Array JSON
            var category = req.body.category.trim();
            var subCategory = (req.body.hasOwnProperty('subCategory')) ? req.body.subCategory : []; // Array JSON
            var measurementUnit = req.body.measurementUnit.trim(); // kg/litre/units
            var overflowAutoAssign = req.body.overflowAutoAssign.trim().toUpperCase(); // YES/NO
            var exclusiveStorage = req.body.exclusiveStorage.trim().toUpperCase(); // YES/NO
            var holdingType = req.body.holdingType.trim(); // PALLET/BARREL/BAG etc
            var itemSpecification = req.body.itemSpecification.trim(); // One line specification for search purpose
            var itemDescription = req.body.itemDescription.trim(); // Details about item
            var dispatchRule = req.body.dispatchRule.trim(); // Dispatch rules like FIFO/LIFO etc
            var priceValue = req.body.priceValue; // Rate
            var priceCurrency = req.body.priceCurrency.trim().toUpperCase(); // Currency
            var manufacturingDate = req.body.manufacturingDate.trim().toUpperCase(); // YES/NO
            var expiryDate = req.body.expiryDate.trim().toUpperCase(); // YES/NO
            var alertDate = req.body.alertDate.trim().toUpperCase(); // YES/NO
            var alertDays = (alertDate === 'YES') ? req.body.alertDays.trim() : 0; //
            var from = (alertDate === 'YES') ? req.body.from.trim() : 0; //1 - Manufacturing date, 2 - Expiry Date, 3 - Date of Inward
            var handlingUnit = (req.body.hasOwnProperty('handlingUnit')) ? req.body.handlingUnit : []; // Array JSON
            var pickAlert = req.body.pickAlert.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                itemMasterModel.findOne({'_id': itemMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Data missing! Item records tampered/removed from system.', status: 'success', statusCode: '200'});
                    } else {

                        var itemcode = itemMasterRow.itemCode;
                        var itemSerialNumber = itemMasterRow.itemSerialNumber;

                        async.waterfall([
                            function (callback) {
                                itemMasterRow.itemSystemSpecification = itemSystemSpecification;
                                itemMasterRow.inwardRule = inwardRule; //
                                itemMasterRow.category = category;
                                itemMasterRow.subCategory = subCategory;
                                itemMasterRow.measurementUnit = measurementUnit; //
                                itemMasterRow.overflowAutoAssign = overflowAutoAssign; //
                                itemMasterRow.exclusiveStorage = exclusiveStorage; //
                                itemMasterRow.holdingType = holdingType; //
                                itemMasterRow.itemSpecification = itemSpecification; //
                                itemMasterRow.itemDescription = itemDescription; //
                                itemMasterRow.dispatchRule = dispatchRule; //
                                itemMasterRow.priceValue = priceValue; //
                                itemMasterRow.priceCurrency = priceCurrency; //
                                itemMasterRow.manufacturingDate = manufacturingDate; //
                                itemMasterRow.expiryDate = expiryDate; //
                                itemMasterRow.alertDate = alertDate; //
                                itemMasterRow.alertDays = alertDays; //
                                itemMasterRow.from = from; //
                                itemMasterRow.handlingUnit = handlingUnit; //
                                itemMasterRow.pickAlert = pickAlert; //
                                itemMasterRow.timeModified = timeInInteger; //
                                itemMasterRow.modifiedBy = modifiedBy;

                                var promise_insertItemMasterImage = new Promises(function (resolve, reject) {

                                    if (req.body.image) {

                                        var base64Data = req.body.image;
                                        databasePath = '/images/item/' + itemMasterRow.itemCode + '_' + timeInInteger + ".jpeg";
                                        var uploadPath = "./public/images/item/" + itemMasterRow.itemCode + '_' + timeInInteger + ".jpeg";
                                        require("fs").writeFile(uploadPath, base64Data, 'base64', function (err) {

                                            if (err) {

                                                reject(res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                                            } else {

                                                resolve(databasePath);
                                            }
                                        });
                                    } else {
                                        resolve('');
                                    }
                                });
                                promise_insertItemMasterImage.then(function (promise_resolvedData) {

                                    if (promise_resolvedData) {

                                        itemMasterRow.image = promise_resolvedData;

                                        itemMasterRow.save(function (err) {
                                            if (err) {

                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                callback(null, {message: 'Item\s master information updated into system!', status: 'success', statusCode: '201'});
                                            }
                                        });
                                    } else {
                                        itemMasterRow.save(function (err) {
                                            if (err) {

                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                callback(null, {message: 'Item\s master information updated into system!', status: 'success', statusCode: '201'});
                                            }
                                        });
                                    }

                                }, function (reject) { // After 1st promise completes, if promise rejected (REJECTED PART)

                                    res.json(reject);
                                }).catch(function (exception) {
                                    /* error :( */
                                    flowController.emit('ERROR', {message: 'EXCEPTION WHILE ADDING IMAGE/ITEM', status: 'error', statusCode: '500'});
                                });
                            }
                        ], function (err, result) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('LOG', itemcode, itemSerialNumber);
                                flowController.emit('end', result);
                            }
                        });
                    }
                });
            });
            flowController.on('LOG', function (itemcode, itemSerialNumber) {
                (showConsole) ? console.log('LOG') : '';
                usersModel.findOne({_id: modifiedBy, activeStatus: 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {
                        console.log('null');
                        //flowController.emit('ERROR', {message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathitemMaster, '\n' + 'WEB' + ',' + 'UPDATE' + ',' + username + ',' + itemcode + ',' + itemSerialNumber + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file!');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'ITEM MASTER-ITEM-UPDATE',
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
            flowController.on('end', function (reuslt) {

                (showConsole) ? console.log('end') : '';
                res.json(reuslt);
            });
            flowController.emit('START');
        });
//       
//        
//---------------------------------------------------------------------------------------------------------------------------
// Get all data Item master
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/readAll/item/:warehouseId/')

        .get(function (req, res, next) {

            var showConsole = 1;
            (showConsole) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = (req.query.searchValue) ? req.query.searchValue.toUpperCase() : "";
            var sortBy = req.query.sortBy;
            var sortType = (req.query.sortType == "asc") ? 1 : -1;

            var sortQuery = {};
            if (sortBy == 'holdingType' || sortBy == 'category')
                sortQuery.name = sortType;
            else
                sortQuery[sortBy] = sortType;

            var ObjQuery = {};

            ObjQuery.warehouseId = warehouseId;
            ObjQuery.activeStatus = 1;

            var columnCheck;

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                if (selectedColumnFilter == 'holdingType' || selectedColumnFilter == 'category')
                    columnCheck = selectedColumnFilter;
                else {

                    var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery[selectedColumnFilter] = itemCode;
                }

            }

            var flowController = new EventEmitter();
//
//
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var itemMasterArray = [];
                // Find all the active rows in the item category collection 
                itemMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).lean().sort({timeCreated: -1}).exec(function (err, itemMasterRow) {

                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No item master configured yet.", status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(itemMasterRow, function (element, callback) {

                            async.waterfall([
                                function (waterFallcallback) {

                                    if (element.category) {

                                        itemCategorysModel.findOne({'_id': element.category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (itemCategoryRow == null) {

                                                waterFallcallback(null, '');
                                            } else {
                                                var categoryName = (itemCategoryRow.name) ? itemCategoryRow.name : '';
                                                waterFallcallback(null, categoryName);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, '');
                                    }

                                },
                                function (categoryName, waterFallcallback) {

                                    if (element.holdingType) {

                                        holdingTypesModel.findOne({'_id': element.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (holdingTypeRow == null) {

                                                waterFallcallback(null, categoryName, '');
                                            } else {

                                                holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                                waterFallcallback(null, categoryName, holdingType);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, categoryName, '');
                                    }
                                },
                                function (categoryName, holdingType, waterFallcallback) {

                                    var itemMaster = {
                                        id: element._id,
                                        itemCode: element.itemCode,
                                        exclusiveStorage: element.exclusiveStorage,
                                        itemDescription: element.itemDescription,
                                        manufacturingDate: element.manufacturingDate,
                                        expiryDate: element.expiryDate,
                                        alertDate: element.alertDate,
                                        itemSerialNumber: element.itemSerialNumber,
                                        category: categoryName,
                                        overflowAutoAssign: element.overflowAutoAssign,
                                        holdingType: holdingType,
                                        stockCountFrequency: (element.itemSystemSpecification[0].stockCountFrequency) ? (element.itemSystemSpecification[0].stockCountFrequency) : "",
                                        status: (element.itemSystemSpecification[0].itemStatus) ? element.itemSystemSpecification[0].itemStatus : '' // Active or obsolete
                                    };
                                    waterFallcallback(null, itemMaster);
                                }
                            ], function (err, result) {
                                // result now equals 'done'
                                if (err) {

                                    callback(err);
                                } else {

                                    itemMasterArray.push(result);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {data: itemMasterArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('START1', function () {

                (showConsole) ? console.log('START1') : '';

                if (columnCheck == 'holdingType') {

                    var search = searchValue;
                    holdingTypesModel.findOne({name: search, activeStatus: 1}, function (err, holdingTypeRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            flowController.emit('ERROR', {message: "HoldingType " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            ObjQuery.holdingType = String(holdingTypeRow._id);
                            flowController.emit('START2');
                        }
                    });
                } else {

                    var search = searchValue;

                    itemCategorysModel.findOne({name: search, activeStatus: 1}, function (err, itemCategoryRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemCategoryRow == null) {

                            flowController.emit('ERROR', {message: "Category Name  " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            ObjQuery.category = String(itemCategoryRow._id);
                            flowController.emit('START2');
                        }
                    });
                }
            });
            //
            //
            flowController.on('START2', function () {

                (showConsole) ? console.log('START2') : '';
                var itemMasterArray = [];
                // Find all the active rows in the item category collection 
                itemMasterModel.find(ObjQuery).lean().skip(limit * page).limit(limit).sort(sortQuery).exec(function (err, itemMasterRow) {

                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No item master configured yet.", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(itemMasterRow, function (element, callback) {

                            async.waterfall([
                                function (waterFallcallback) {

                                    if (element.category) {

                                        itemCategorysModel.findOne({'_id': element.category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (itemCategoryRow == null) {

                                                waterFallcallback(null, '');
                                            } else {
                                                var categoryName = (itemCategoryRow.name) ? itemCategoryRow.name : '';
                                                waterFallcallback(null, categoryName);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, '');
                                    }

                                },
                                function (categoryName, waterFallcallback) {

                                    if (element.holdingType) {

                                        holdingTypesModel.findOne({'_id': element.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (holdingTypeRow == null) {

                                                waterFallcallback(null, categoryName, '');
                                            } else {

                                                holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                                waterFallcallback(null, categoryName, holdingType);
                                            }
                                        });
                                    } else {
                                        waterFallcallback(null, categoryName, '');
                                    }
                                },
                                function (categoryName, holdingType, waterFallcallback) {

                                    var itemMaster = {
                                        id: element._id,
                                        itemCode: element.itemCode,
                                        exclusiveStorage: element.exclusiveStorage,
                                        itemDescription: element.itemDescription,
                                        manufacturingDate: element.manufacturingDate,
                                        expiryDate: element.expiryDate,
                                        alertDate: element.alertDate,
                                        itemSerialNumber: element.itemSerialNumber,
                                        category: categoryName,
                                        overflowAutoAssign: element.overflowAutoAssign,
                                        holdingType: holdingType,
                                        stockCountFrequency: (element.itemSystemSpecification[0].stockCountFrequency) ? (element.itemSystemSpecification[0].stockCountFrequency) : "",
                                        status: (element.itemSystemSpecification[0].itemStatus) ? element.itemSystemSpecification[0].itemStatus : '' // Active or obsolete
                                    };
                                    waterFallcallback(null, itemMaster);
                                }
                            ], function (err, result) {
                                // result now equals 'done'
                                if (err) {

                                    callback(err);
                                } else {

                                    itemMasterArray.push(result);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                itemMasterModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemMasterCount) {
                                    if (err) {

                                        res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                                    } else {

                                        itemMasterModel.count(ObjQuery, function (err, searchCount) {
                                            if (err) {

                                            } else {

                                                flowController.emit('END', {data: itemMasterArray, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 200});
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('START3', function () {
                (showConsole) ? console.log('START3') : '';

                if (sortBy == 'holdingType') {

                    var holdingArr = [];

                    holdingTypesModel.find({warehouseId: warehouseId, activeStatus: 1}, {_id: 1}).lean().sort(sortQuery).exec(function (err, holdingTypeRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow.length == 0) {

                            flowController.emit('ERROR', {message: "HoldingType " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            flowController.emit('ITEMMASTER', holdingTypeRow, 'holdingType');
                        }
                    });
                } else {

                    itemCategorysModel.find({warehouseId: warehouseId, activeStatus: 1}, {_id: 1}).lean().sort(sortQuery).exec(function (err, itemCategoryRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemCategoryRow.length == 0) {
                            flowController.emit('ERROR', {message: "Category Name  " + searchValue + "  Not Found in System!", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                        } else {

                            flowController.emit('ITEMMASTER', itemCategoryRow, 'category');

                        }
                    });
                }
            });
            //
            //get ITEMMASTER
            flowController.on('ITEMMASTER', function (resultRow, checkCond) {
                (showConsole) ? console.log('ITEMMASTER') : '';

                var itemMasterArray = [];

                async.eachSeries(resultRow, function (element, callback) {

                    if (checkCond == 'holdingType') {

                        itemMasterModel.find({holdingType: element._id, activeStatus: 1}).skip(limit * page).limit(limit).exec(function (err, itemMasterRow) {
                            if (err) {

                                callback(err);
                            } else if (itemMasterRow.length == 0) {

                                setImmediate(callback);
                            } else {



                                async.eachSeries(itemMasterRow, function (element1, callback1) {


                                    if (itemMasterArray.length == limit) {
                                        setImmediate(callback);
                                        // setImmediate(callback1);
                                    } else {
                                        itemMasterArray.push(element1);
                                        setImmediate(callback1);
                                    }


                                }, function (err) {
                                    if (err) {

                                    } else {

                                        setImmediate(callback);
                                    }
                                });

                            }
                        });
                    } else {

                        itemMasterModel.find({category: element._id, activeStatus: 1}).skip(limit * page).limit(limit).exec(function (err, itemMasterRow) {
                            if (err) {

                                callback(err);
                            } else if (itemMasterRow.length == 0) {

                                setImmediate(callback);
                            } else {

                                async.eachSeries(itemMasterRow, function (element1, callback1) {


                                    if (itemMasterArray.length == limit) {
                                        setImmediate(callback);

                                    } else {
                                        itemMasterArray.push(element1);
                                        setImmediate(callback1);
                                    }


                                }, function (err) {
                                    if (err) {

                                    } else {

                                        setImmediate(callback);
                                    }
                                });

                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        console.log(itemMasterArray.length)
                        flowController.emit('SORT', itemMasterArray);
                        //itemMasterArr
                    }
                });
            });
            //
            //sort
            flowController.on('SORT', function (resultRow) {
                (showConsole) ? console.log('SORT') : '';

                var itemMasterArray = [];
                console.log(resultRow.length);
                async.eachSeries(resultRow, function (element, callback) {

                    async.waterfall([
                        function (waterFallcallback) {

                            if (element.category) {

                                itemCategorysModel.findOne({'_id': element.category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                    if (err) { // Serverside error

                                        waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (itemCategoryRow == null) {

                                        waterFallcallback(null, '');
                                    } else {

                                        var categoryName = (itemCategoryRow.name) ? itemCategoryRow.name : '';
                                        waterFallcallback(null, categoryName);
                                    }
                                });
                            } else {
                                waterFallcallback(null, '');
                            }

                        },
                        function (categoryName, waterFallcallback) {

                            if (element.holdingType) {

                                holdingTypesModel.findOne({'_id': element.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                    if (err) { // Serverside error

                                        waterFallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypeRow == null) {

                                        waterFallcallback(null, categoryName, '');
                                    } else {

                                        holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                        waterFallcallback(null, categoryName, holdingType);
                                    }
                                });
                            } else {
                                waterFallcallback(null, categoryName, '');
                            }
                        },
                        function (categoryName, holdingType, waterFallcallback) {

                            var arrkey = element.itemSystemSpecification ? element.itemSystemSpecification[0] : "";

                            var itemMaster = {
                                id: element._id,
                                itemCode: element.itemCode,
                                exclusiveStorage: element.exclusiveStorage,
                                itemDescription: element.itemDescription,
                                manufacturingDate: element.manufacturingDate,
                                expiryDate: element.expiryDate,
                                alertDate: element.alertDate,
                                itemSerialNumber: element.itemSerialNumber,
                                category: categoryName,
                                overflowAutoAssign: element.overflowAutoAssign,
                                holdingType: holdingType,
                                stockCountFrequency: (arrkey) ? (element.itemSystemSpecification[0].stockCountFrequency) : "",
                                status: (arrkey) ? element.itemSystemSpecification[0].itemStatus : '' // Active or obsolete
                            };
                            waterFallcallback(null, itemMaster);
                        }
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {

                            callback(err);
                        } else {

                            itemMasterArray.push(result);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        itemMasterModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemMasterCount) {
                            if (err) {

                                res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404'});
                            } else {

                                itemMasterModel.count(ObjQuery, function (err, searchCount) {
                                    if (err) {

                                    } else {

                                        flowController.emit('END', {data: itemMasterArray, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 200});
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'ITEM MASTER-ITEM(ALL)-READ',
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
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //
            if (limit || page)
                if (columnCheck)
                    flowController.emit('START1');
                else if (sortBy == "holdingType" || sortBy == "category")
                    flowController.emit('START3');
                else
                    flowController.emit('START2');
            else
                flowController.emit('START');
        });
//        
//       
//---------------------------------------------------------------------------------------------------------------------------
//Pick & Put Sublist itemcode search API
//---------------------------------------------------------------------------------------------------------------------------
//GET ALL DATA FOR SEARH API
//---------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
//GET ALL DATA FOR SEARH API
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/itemMaster/configuration/search/itemMaster/:warehouseId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();
            // Item code array
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, {itemCode: 1, itemDescription: 1, '_id': 0}, function (err, itemMasterArray) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterArray.length == 0) {

                        flowController.emit('1', []);
                    } else {

                        flowController.emit('1', itemMasterArray);
                    }
                });
            });

            // Pallet Number Array
            flowController.on('1', function (itemMasterArray) {

                (showConsole) ? console.log('1') : '';

                P1 = {'$match': {warehouseId: warehouseId, palletNumber: {$exists: true}, locationStoreId: {$exists: true}, activeStatus: 1}};
                P2 = {'$unwind': {path: "$randomFields", includeArrayIndex: "arrayIndex", preserveNullAndEmptyArrays: false}};
                P3 = {'$group': {originalId: {$first: '$_id'}, _id: '$palletNumber', customPalletNumber: {$first: '$customPalletNumber'}, palletType: {$first: '$randomFields.palletType'}, palletSize: {$first: '$randomFields.palletSize'}}};
                P4 = {'$project': {_id: 0, palletNumber: '$_id', palletType: '$palletType', palletSize: '$palletSize', itemDescription: 'PALLET', 'customPalletNumber': {$ifNull: ["$customPalletNumber", "NA"]}}};

                itemStoreModel.aggregate([P1, P2, P3, P4], function (err, palletNumberArray) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('2', itemMasterArray, palletNumberArray);

                });
            });

            // Serial Number Array
            flowController.on('2', function (itemMasterArray, palletNumberArray) {

                (showConsole) ? console.log('2') : '';

                P1 = {'$match': {'warehouseId': warehouseId, 'palletNumber': {'$exists': false}, 'activeStatus': 1}};
                P2 = {'$project': {_id: 0, itemDescription: "BOX", boxNumber: "$itemSerialNumber"}};

                itemStoreModel.aggregate([P1, P2], function (err, itemSerialNumberArray) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('3', itemMasterArray, palletNumberArray, itemSerialNumberArray);

                });
            });

            // Combined Array
            flowController.on('3', function (itemMasterArray, palletNumberArray, itemSerialNumberArray) {

                (showConsole) ? console.log('3') : '';

                var combinedArray = [];

                combinedArray.push({itemCode: itemMasterArray, palletNumber: palletNumberArray, boxNumber: itemSerialNumberArray})

                flowController.emit('END', combinedArray);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'ITEM MASTER-ITEM(SEARCH)-READ',
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

            // End
            flowController.on('END', function (reason) {

                (showConsole) ? console.log('END') : '';

                res.json({data: reason, message: 'Operation Successful!', status: 'success', statusCode: 200});
            });

            // Initialize
            flowController.emit('START');
        });
//
//                
//---------------------------------------------------------------------------------------------------------------------------
// Delete Item
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/itemMaster/configuration/delete/itemMaster/:warehouseId/:itemMasterId/:modifiedBy/')

        .delete(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var itemMasterId = req.params.itemMasterId.trim();
            var modifiedBy = req.params.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemMasterModel.findOne({'_id': itemMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'item Master data missing! Item records tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var itemCode = itemMasterRow.itemCode;
                        var itemSerialNumber = itemMasterRow.itemSerialNumber;

                        itemStoreModel.count({'itemMasterId': itemMasterId}, function (err, itemMasterCount) {
                            if (err) {

                            } else if (itemMasterCount !== 0) {

                                flowController.emit('ERROR', {message: 'Item Master records can not tampered/removed from system.', status: 'error', statusCode: '304'});
                            } else {

                                var query = {'_id': itemMasterId, 'warehouseId': warehouseId};
                                var update = {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}};

                                itemMasterModel.update(query, update, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('LOG', itemCode, itemSerialNumber);
                                        flowController.emit('end');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('LOG', function (itemcode, itemSerialNumber) {

                (showConsole) ? console.log('LOG') : '';

                usersModel.findOne({_id: modifiedBy, activeStatus: 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: "Item's master data missing! Data tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathitemMaster, '\n' + 'WEB' + ',' + 'DELETE' + ',' + username + ',' + itemcode + ',' + itemSerialNumber + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file!');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'ITEM MASTER-ITEM-DELETE',
                    ERRORMESSAGE: reason.message
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
            flowController.on('end', function () {

                (showConsole) ? console.log('end') : '';
                res.json({message: "item Master removed from system!", status: 'success', statusCode: '201'});
            });
            flowController.emit('START');
        });
//
//
module.exports = router;