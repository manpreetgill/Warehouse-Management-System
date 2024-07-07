var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var MagicIncrement = require('magic-increment');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async'); //underscore
var underscore = require('underscore');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMastersModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var holdingTypesModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var dispatchRulesModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var measurementUnitsModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var itemCategoryModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details by ITEM CODE
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/item-code/:warehouseId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = req.query.searchValue;
            var sortBy = req.query.sortBy;
            var sortType = (req.query.sortType == "asc") ? 1 : -1;

            var sortQuery = {};
            if (sortBy == "itemQuantity" || sortBy == "totalPriceCheck")
                sortQuery.timeCreated = 1;
            else
                sortQuery[sortBy] = sortType;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;
            ObjQuery.activeStatus = 1;
            if (searchValue) {
                var itemCode = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                ObjQuery.itemCode = itemCode;
            }

            var flowController = new EventEmitter();
            var showConsole = 1;

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var itemMasterArr = [];

                if (sortBy == "itemQuantity" || sortBy == "totalPriceCheck") {

                    itemMasterModel.find(ObjQuery).sort(sortQuery).exec(function (err, itemMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow.length == 0) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                        } else {

                            async.eachSeries(itemMasterRow, function (elementItemRow, callback) {

                                itemMasterArr.push(elementItemRow);
                                setImmediate(callback);
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('1', itemMasterArr);
                                }
                            });
                        }
                    });
                } else {

                    itemMasterModel.find(ObjQuery).skip(limit * page).limit(limit).sort(sortQuery).exec(function (err, itemMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow.length == 0) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                        } else {

                            async.eachSeries(itemMasterRow, function (elementItemRow, callback) {

                                itemMasterArr.push(elementItemRow);
                                setImmediate(callback);
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('1', itemMasterArr);
                                }
                            });
                        }
                    });
                }
            });
            // Get item master data
            flowController.on('1', function (itemMasterData) {

                var itemMasterArray = [];
                async.eachSeries(itemMasterData, function (elementItemMaster, callbackItemMaster) {

                    async.waterfall([

                        function (waterfallcallback) {

                            itemStoreModel.count({'itemMasterId': elementItemMaster._id, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemQuantity) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    waterfallcallback(null, itemQuantity);
                                }
                            });
                        },
                        // holdingType
                        function (itemQuantity, waterfallcallback) {

                            if (elementItemMaster.holdingType) {

                                holdingTypesModel.findOne({'_id': elementItemMaster.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback(null, itemQuantity, '');
                                    } else {

                                        holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                        waterfallcallback(null, itemQuantity, holdingType);
                                    }
                                });
                            } else {
                                waterfallcallback(null, itemQuantity, '');
                            }
                        },
                        //dispatchRulesModel
                        function (itemQuantity, holdingType, waterfallcallback) {

                            if (elementItemMaster.dispatchRule) {

                                dispatchRulesModel.findOne({'_id': elementItemMaster.dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (dispatchRuleRow == null) {

                                        waterfallcallback(null, itemQuantity, holdingType, '');
                                    } else {

                                        dispatchRule = (dispatchRuleRow.name) ? dispatchRuleRow.name : '';
                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, '');
                            }
                        },
                        //measurementUnit
                        function (itemQuantity, holdingType, dispatchRule, waterfallcallback) {

                            if (elementItemMaster.measurementUnit) {

                                measurementUnitsModel.findOne({'_id': elementItemMaster.measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (measurementUnitRow == null) {

                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, '');
                                    } else {

                                        measurementUnit = (measurementUnitRow.name) ? measurementUnitRow.name : '';
                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, dispatchRule, '');
                            }
                        },
                        //category
                        function (itemQuantity, holdingType, dispatchRule, measurementUnit, waterfallcallback) {

                            if (elementItemMaster.category) {

                                itemCategoryModel.findOne({'_id': elementItemMaster.category, 'activeStatus': 1}, function (err, categoryRow) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (categoryRow == null) {

                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, '');
                                    } else {
                                        categoryName = (categoryRow.name) ? categoryRow.name : '';
                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, '');
                            }
                        },
                        //subCategory
                        function (itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, waterfallcallback) {

                            if (elementItemMaster.subCategory.length !== 0) {

                                var subCategoryArr = [];
                                async.eachSeries(elementItemMaster.subCategory, function (elementSubCategory, callbackSubCategory) {

                                    itemSubCategorysModel.findOne({_id: elementSubCategory, activeStatus: 1}, function (err, subCategoryRow) {
                                        if (err) {
                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (subCategoryRow == null) {

                                            callbackSubCategory();
                                        } else {

                                            subCategoryName = (subCategoryRow.name) ? subCategoryRow.name : '';
                                            subCategoryArr.push(subCategoryName);
                                            callbackSubCategory();
                                        }
                                    });
                                }, function (err) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr);
                            }
                        },
                        //handlingUnit
                        function (itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, waterfallcallback) {

                            var MHUArray = [];
                            if (elementItemMaster.handlingUnit.length !== 0) {


                                async.eachSeries(elementItemMaster.handlingUnit, function (elementMHU, callbackMHU) {

                                    materialHandlingMasterModel.findOne({'_id': elementMHU, 'activeStatus': 1}, function (err, MHURow) {
                                        if (err) {

                                            console.log(err);
                                        } else if (MHURow == null) {

                                            callbackMHU();
                                        } else {

                                            MHUName = (MHURow.name) ? MHURow.name : '';
                                            MHUArray.push(MHUName);
                                            callbackMHU();
                                        }
                                    });
                                }, function (err) {
                                    if (err) {
                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                            }
                        },
                        function (itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray, waterfallcallback) {

                            var dataArea = {
                                itemMasterId: elementItemMaster._id,
                                itemCode: elementItemMaster.itemCode,
                                itemCateogy: categoryName,
                                itemSubCategory: subCategoryArr,
                                itemDescription: elementItemMaster.itemDescription,
                                itemStoreQuantity: itemQuantity,
                                totalPrice: parseInt(elementItemMaster.priceValue) * parseInt(itemQuantity),
                                priceValue: elementItemMaster.priceValue,
                                priceCurrency: elementItemMaster.priceCurrency,
                                materialHandlingUnitId: MHUArray,
                                manufacturingDate: elementItemMaster.manufacturingDate,
                                expiryDate: elementItemMaster.expiryDate,
                                alertDate: elementItemMaster.alertDate,
                                dispatchRule: dispatchRule,
                                timeCreated: moment.unix(elementItemMaster.timeCreated).format("DD/MMM/YYYY HH:mm:ss"),
                                holdingType: holdingType,
                                exclusiveStorage: elementItemMaster.exclusiveStorage,
                                overflowAutoAssign: elementItemMaster.overflowAutoAssign,
                                measurementUnit: measurementUnit,
                                itemStatus: (elementItemMaster.itemSystemSpecification[0].itemStatus) ? elementItemMaster.itemSystemSpecification[0].itemStatus : '',
                            };
                            waterfallcallback(null, dataArea);
                        }
                    ], function (err, result) {

                        if (err) {

                            callbackItemMaster({message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '500'});
                        } else {
                            itemMasterArray.push(result);
                            setImmediate(callbackItemMaster);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        if (sortBy == "itemQuantity" || sortBy == "totalPriceCheck") {

                            if (sortType == 1) {

                                if (sortBy == "itemQuantity") {

                                    itemMasterArray.sort(function (a, b) {
                                        return a.itemStoreQuantity - b.itemStoreQuantity;
                                    });

                                    var itemMasterArr = itemMasterArray.slice(parseInt(limit * page), itemMasterArray.length);
                                    var itemMasterArr1 = itemMasterArr.slice(0, limit);
                                    flowController.emit('end', itemMasterArr1);

                                } else {

                                    itemMasterArray.sort(function (a, b) {
                                        return a.totalPrice - b.totalPrice;
                                    });

                                    var itemMasterArr = itemMasterArray.slice(parseInt(limit * page), itemMasterArray.length);
                                    var itemMasterArr1 = itemMasterArr.slice(0, limit);

                                    flowController.emit('end', itemMasterArr1);
                                }
                            } else {
                                if (sortBy == "itemQuantity") {

                                    itemMasterArray.sort(function (a, b) {
                                        return b.itemStoreQuantity - a.itemStoreQuantity;
                                    });

                                    var itemMasterArr = itemMasterArray.slice(parseInt(limit * page), itemMasterArray.length);
                                    var itemMasterArr1 = itemMasterArr.slice(0, limit);

                                    flowController.emit('end', itemMasterArr1);
                                } else {

                                    itemMasterArray.sort(function (a, b) {
                                        return b.totalPrice - a.totalPrice;
                                    });

                                    var itemMasterArr = itemMasterArray.slice(parseInt(limit * page), itemMasterArray.length);
                                    var itemMasterArr1 = itemMasterArr.slice(0, limit);

                                    flowController.emit('end', itemMasterArr1);
                                }
                            }
                        } else {

                            flowController.emit('end', itemMasterArray);
                        }
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                var dataObject = {
                    MODULE: 'INVENTORY-BY-ITEMCODE-READ',
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
            flowController.on('end', function (itemMasterArray) {

                (showConsole) ? console.log('end') : '';
                itemMasterModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemMasterCount) {
                    if (err) {

                        res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else {

                        itemMasterModel.count(ObjQuery, function (err, searchCount) {
                            if (err) {

                                res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                            } else {

                                res.json({data: itemMasterArray, "recordsTotal": itemMasterCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 304});
                            }
                        });
                    }
                });
            });
            //
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details by SERIAL NUMBER
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/serial-number/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var limit = parseInt(req.query.limit);
            var page = parseInt(req.query.page);
            var searchValue = req.query.searchValue;
            var byLocationItemMasterId = req.query.byLocationItemMasterId;

            var sortBy = req.query.sortBy;
            var sortType = (req.query.sortType == "asc") ? 1 : -1;

            var columnFilter = '';

            var sortQuery = {};
            var randomFieldsColumnArray = ["tareWeightInLbs", "grossWeightInLbs", "specificLotNo", "purchaseOrderNumber",
                "name1", "grossWeight", "pieces", "netWeight", "palletType", "palletSize", "boxNo", "batch", "salesDocument"];

            if (randomFieldsColumnArray.indexOf(sortBy) > -1) {

                var prop = "randomFields." + sortBy;
                sortQuery[prop] = sortType;
            } else {

                sortQuery[sortBy] = sortType;
            }
            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;
            ObjQuery.activeStatus = 1;
            ObjQuery.itemSerialNumber = {'$exists': true};

            var newQuery = {};
            newQuery.warehouseId = warehouseId;
            newQuery.activeStatus = 1;

            if (searchValue) {

                var selectedColumnFilter = req.query.selectedColumnFilter;

                var randomFieldsColumnArray = ["palletType", "palletSize", "boxNo", "batch", "salesDocument"];
                var valueToSearch = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");

                if (randomFieldsColumnArray.indexOf(selectedColumnFilter) > -1) {

                    var prop = "randomFields." + selectedColumnFilter;
                    ObjQuery[prop] = valueToSearch;

                } else if (selectedColumnFilter == "itemCode" || selectedColumnFilter == "customerAddress") {

                    columnFilter = selectedColumnFilter;

                    if (selectedColumnFilter == "customerAddress") {

                        newQuery[selectedColumnFilter] = req.query.searchValue.toUpperCase();

                    } else {

                        newQuery[selectedColumnFilter] = req.query.searchValue.toUpperCase();
                    }
                } else {

                    ObjQuery[selectedColumnFilter] = valueToSearch;
                }
            }

            if (byLocationItemMasterId) {

                ObjQuery.itemMasterId = byLocationItemMasterId;
            }

            var serialNumberArray = [];
            var flowController = new EventEmitter();

            flowController.on('START1', function () {

                (showConsole) ? console.log('START1') : '';

                if (columnFilter == "customerAddress") {

                    locationStoresModel.findOne(newQuery, function (err, locationRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationRow == null) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.locationStoreId = String(locationRow._id);
                            flowController.emit('START');
                        }
                    });
                } else {

                    itemMasterModel.findOne(newQuery, function (err, itemMasterRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow == null) {

                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                        } else {

                            ObjQuery.itemMasterId = String(itemMasterRow._id);
                            flowController.emit('START');
                        }
                    });
                }
            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemStoreModel.find(ObjQuery).sort(sortQuery).skip(limit * page).limit(limit).exec(function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow.length == 0) {

                        flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', itemStoreRow);
                    }
                });
            });
            // Generate date
            flowController.on('1', function (itemStoreArray) {

                (showConsole) ? console.log('1') : '';
                var count = 0;
                async.eachSeries(itemStoreArray, function (elementItemStore, callback) {

                    var customPalletNumber = (elementItemStore.customPalletNumber) ? elementItemStore.customPalletNumber : '';

                    console.log('Item ' + count);
                    async.waterfall([
                        //
                        function (waterfallcallback) {

                            locationStoresModel.findOne({'_id': elementItemStore.locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {
                                    `                           `
                                    waterfallcallback(null, '');
                                } else {

                                    var data = {
                                        areaId: locationStoreRow.areaId,
                                        zoneId: locationStoreRow.zoneId,
                                        lineId: locationStoreRow.lineId,
                                        levelId: locationStoreRow.levelId,
                                        systemAddress: locationStoreRow.systemAddress,
                                        customerAddress: locationStoreRow.customerAddress
                                    };
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        //areaName
                        function (data, waterfallcallback) {

                            async.waterfall([

                                function (waterfallcallbackLocation) {

                                    areaMastersModel.findOne({'_id': data.areaId, 'activeStatus': 1}, function (err, areaRow) {
                                        if (err) {

                                            waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (areaRow == null) {

                                            waterfallcallbackLocation(null, '');
                                        } else {

                                            areaName = (areaRow.area) ? areaRow.area : '';
                                            waterfallcallbackLocation(null, areaName);
                                        }
                                    });
                                },
                                function (areaName, waterfallcallbackLocation) {

                                    zoneMastersModel.findOne({'_id': data.zoneId, 'activeStatus': 1}, function (err, zoneRow) {
                                        if (err) {

                                            waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (zoneRow == null) {

                                            waterfallcallbackLocation(null, areaName, '');
                                        } else {

                                            zoneName = (zoneRow.zone) ? zoneRow.zone : '';
                                            waterfallcallbackLocation(null, areaName, zoneName);
                                        }
                                    });
                                },
                                function (areaName, zoneName, waterfallcallbackLocation) {

                                    lineMastersModel.findOne({'_id': data.lineId, 'activeStatus': 1}, function (err, lineRow) {
                                        if (err) {

                                            waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (lineRow == null) {

                                            waterfallcallbackLocation(null, areaName, zoneName, '');
                                        } else {

                                            lineName = (lineRow.line) ? lineRow.line : '';
                                            waterfallcallbackLocation(null, areaName, zoneName, lineName);
                                        }
                                    });
                                },
                                function (areaName, zoneName, lineName, waterfallcallbackLocation) {

                                    levelMastersModel.findOne({'_id': data.levelId, 'activeStatus': 1}, function (err, levelRow) {
                                        if (err) {

                                            waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (levelRow == null) {

                                            waterfallcallbackLocation(null, areaName, zoneName, lineName, '');
                                        } else {

                                            levelName = (levelRow.level) ? levelRow.level : '';
                                            waterfallcallbackLocation(null, areaName, zoneName, lineName, levelName);
                                        }
                                    });
                                },
                                function (areaName, zoneName, lineName, levelName, waterfallcallbackLocation) {

                                    if (data.function) {

                                        functionAreaModel.findOne({'_id': data.function, 'activeStatus': 1}, function (err, functionRow) {
                                            if (err) {

                                            } else if (functionRow == null) {

                                                waterfallcallbackLocation(null, areaName, zoneName, lineName, levelName, '');
                                            } else {

                                                functionName = (functionRow.name) ? functionRow.name : '';
                                                waterfallcallbackLocation(null, areaName, zoneName, lineName, levelName, functionName);
                                            }
                                        });
                                    } else {

                                        waterfallcallbackLocation(null, areaName, zoneName, lineName, levelName, '');
                                    }
                                }
                            ], function (err, areaName, zoneName, lineName, levelName, functionName) {
                                if (err) {

                                } else {
                                    customerAddress = data.customerAddress;
                                    waterfallcallback(null, areaName, zoneName, lineName, levelName, functionName, customerAddress);
                                }
                            });
                        },
                        //
                        function (areaName, zoneName, lineName, levelName, functionName, customerAddress, waterfallcallback) {

                            itemMasterModel.findOne({_id: elementItemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                } else if (itemMasterRow == null) {

                                    waterfallcallback(null, areaName, zoneName, lineName, levelName, functionName, customerAddress, '', '', '', '', '');
                                } else {

                                    async.waterfall([

                                        function (waterfallcallbackItemMaster) {

                                            if (itemMasterRow.measurementUnit) {

                                                measurementUnitsModel.findOne({'_id': itemMasterRow.measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {
                                                    if (err) {

                                                    } else if (measurementUnitRow == null) {

                                                        waterfallcallbackItemMaster(null, '');
                                                    } else {

                                                        measurementUnit = (measurementUnitRow.name) ? measurementUnitRow.name : '';
                                                        waterfallcallbackItemMaster(null, measurementUnit);
                                                    }
                                                });
                                            } else {

                                                waterfallcallbackItemMaster(null, '');
                                            }
                                        }
                                    ], function (err, measurementUnit) {
                                        if (err) {

                                        } else {

                                            itemCode = itemMasterRow.itemCode;
                                            itemDescription = itemMasterRow.itemDescription;
                                            priceValue = itemMasterRow.priceValue;
                                            priceCurrency = itemMasterRow.priceCurrency;
                                            waterfallcallback(null, areaName, zoneName, lineName, levelName, functionName, customerAddress, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit);
                                        }
                                    });
                                }
                            });
                        },
                        //
                        function (areaName, zoneName, lineName, levelName, functionName, customerAddress, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, waterfallcallback) {

                            dataSerialNumber = {
                                itemCode: itemCode,
                                customPalletNumber: customPalletNumber,
                                currentActivityStatus:elementItemStore.currentActivityStatus,
                                itemMasterId: elementItemStore.itemMasterId,
                                locationStoreId: elementItemStore.locationStoreId,
                                itemDescription: itemDescription,
                                priceValue: priceValue,
                                priceCurrency: priceCurrency,
                                measurementUnit: measurementUnit,
                                areaName: areaName,
                                zoneName: zoneName,
                                lineName: lineName,
                                levelName: levelName,
                                functionName: functionName,
                                customerAddress: customerAddress,
                                itemSerialNumber: elementItemStore.itemSerialNumber,
                                date: elementItemStore.date,
                                exclusiveStorage: elementItemStore.exclusiveStorage,
                                overflowAutoAssign: elementItemStore.overflowAutoAssign,
                                alertDate: elementItemStore.alertDate,
                                expiryDate: elementItemStore.expiryDate,
                                manufacturingDate: elementItemStore.manufacturingDate,
                                palletNumber: elementItemStore.palletNumber,
                                randomFields: elementItemStore.randomFields,
                                flags: elementItemStore.flags,
                                itemStoreId: elementItemStore._id,
                                timeModified: (elementItemStore.timeModified) ? elementItemStore.timeModified : ''
                            };
                            waterfallcallback(null, dataSerialNumber);
                        }
                        //
                    ], function (err, dataSerialNumber) {
                        if (err) {

                        } else {
                            count++;
                            serialNumberArray.push(dataSerialNumber);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {
                        flowController.emit('END', serialNumberArray);
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                var dataObject = {
                    MODULE: 'INVENTORY-BY-SERIAL-NUMBER-READ',
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
            // END
            flowController.on('END', function (serialNumberArray) {

                (showConsole) ? console.log('END') : '';
                itemStoreModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemStoreCount) {
                    if (err) {

                        res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else {

                        itemStoreModel.count(ObjQuery, function (err, searchCount) {
                            if (err) {

                            } else {

                                res.json({data: serialNumberArray, "recordsTotal": itemStoreCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 304});
                            }
                        });
                    }
                });
            });
            // START
            if (columnFilter == "itemCode" || columnFilter == "customerAddress") {

                flowController.emit('START1');
            } else {
                flowController.emit('START');
            }
        });
//
//                
//------------------------------------------------------------------------------------------------------------------------------------------------------
//Get details by LOCATION
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/location-store/:warehouseId/:call/')

        .get(function (req, res) {

            var showConsole = 1;

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var call = req.params.call.trim();

            if (call == 'EXTERNAL') {

                var limit = req.query.limit;
                var page = req.query.page;
                var searchValue = req.query.searchValue;

                var sortBy = req.query.sortBy;
                var sortType = (req.query.sortType == "asc") ? 1 : -1;

                var sortQuery = {};
                if (sortBy == "palletNumbers" || sortBy == "materialHandlingUnitId")
                    sortQuery[sortBy] = sortType;
                else if (sortBy == "locationQuantity")
                    sortQuery.timeCreated = 1;
                else
                    sortQuery[sortBy] = sortType;

                var ObjQuery = {};
                ObjQuery.warehouseId = warehouseId;
                ObjQuery.activeStatus = 1;
                var prop = 'assignedItemStoreId.0';
                ObjQuery[prop] = {'$exists': true};
                if (searchValue) {
                    var customerAddress = new RegExp('.' + searchValue + '.|^' + searchValue + '|' + searchValue + '$', "i");
                    ObjQuery.customerAddress = customerAddress;
                }
            }

            var flowController = new EventEmitter();
            // Get all unremoved locations having assignedItemStoreId values
            flowController.on('START1', function () {

                (showConsole) ? console.log('START1') : '';

                if (sortBy == "locationQuantity") {

                    locationStoresModel.find(ObjQuery).sort(sortQuery).exec(function (err, locationStoreRow) {
                        if (err) {
                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow.length == 0) {
                            `                           `
                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: 'No locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('1', locationStoreRow);
                        }
                    });
                } else {

                    locationStoresModel.find(ObjQuery).sort(sortQuery).skip(parseInt(page) * parseInt(limit)).limit(parseInt(limit)).exec(function (err, locationStoreRow) {
                        if (err) {
                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow.length == 0) {
                            `                           `
                            flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: 'No locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('1', locationStoreRow);
                        }
                    });
                }
            });
            //
            // For warehouse inventory comparison purpose only
            flowController.on('START2', function () {

                (showConsole) ? console.log('START2') : '';
                locationStoresModel.find({'warehouseId': warehouseId, 'assignedItemStoreId': {'$exists': true}, 'activeStatus': 1}).lean().sort({'sequenceId': 1}).exec(function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {
                        `                           `
                        flowController.emit('ERROR', {data: [], "recordsTotal": 0, "recordsFiltered": 0, message: 'No locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', locationStoreRow);
                    }
                });
            });
            // Get location parent details with MHU in waterfall model
            flowController.on('1', function (locationStoreRow) {

                (showConsole) ? console.log('1') : '';
                locationDetailsArray = [];
                async.eachSeries(locationStoreRow, function (element, callbackDone) {

                    var object = {};
                    async.waterfall([
                        // Area
                        function (waterfallcallbackLocation) {

                            areaMastersModel.findOne({'_id': element.areaId, 'activeStatus': 1}, function (err, areaRow) {
                                if (err) {

                                    waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (areaRow == null) {

                                    waterfallcallbackLocation(null, object);
                                } else {

                                    areaName = (areaRow.area) ? areaRow.area : '';
                                    object.areaName = areaName;
                                    waterfallcallbackLocation(null, object);
                                }
                            });
                        },
                        // Zone
                        function (object, waterfallcallbackLocation) {

                            zoneMastersModel.findOne({'_id': element.zoneId, 'activeStatus': 1}, function (err, zoneRow) {
                                if (err) {

                                    waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (zoneRow == null) {

                                    waterfallcallbackLocation(null, object);
                                } else {

                                    zoneName = (zoneRow.zone) ? zoneRow.zone : '';
                                    object.zoneName = zoneName;
                                    waterfallcallbackLocation(null, object);
                                }
                            });
                        },
                        // Line
                        function (object, waterfallcallbackLocation) {

                            lineMastersModel.findOne({'_id': element.lineId, 'activeStatus': 1}, function (err, lineRow) {
                                if (err) {

                                    waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (lineRow == null) {

                                    waterfallcallbackLocation(null, object);
                                } else {

                                    lineName = (lineRow.line) ? lineRow.line : '';
                                    object.lineName = lineName;
                                    waterfallcallbackLocation(null, object);
                                }
                            });
                        },
                        // Level
                        function (object, waterfallcallbackLocation) {

                            levelMastersModel.findOne({'_id': element.levelId, 'activeStatus': 1}, function (err, levelRow) {
                                if (err) {

                                    waterfallcallbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (levelRow == null) {

                                    waterfallcallbackLocation(null, object);
                                } else {

                                    levelName = (levelRow.level) ? levelRow.level : '';
                                    object.levelName = levelName;
                                    waterfallcallbackLocation(null, object);
                                }
                            });
                        },
                        // Location details
                        function (object, waterfallcallbackLocation) {

                            object.customerAddress = (element.customerAddress) ? element.customerAddress : '';
                            object.isBlocked = (element.availability == 'A') ? 'NO' : 'YES';
                            object.assignedItemStoreId = element.assignedItemStoreId;
                            object.availableCapacity = element.availableCapacity;
                            object.locationCapacity = (element.locationProperties[0].userDefinedCapacity) ? element.locationProperties[0].userDefinedCapacity : '';
                            object.locationMHE = [];
                            object.locationStoreId = element._id;
                            waterfallcallbackLocation(null, object);
                        }
                        // Final 
                    ], function (err, result) {
                        // Add location with customer address to 
                        if (err) {

                            callbackDone(err);
                        } else {

                            locationDetailsArray.push(result);
                            setImmediate(callbackDone);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', locationDetailsArray);
                    }
                });
            });
            // Get Item Store details with assignedItemStoreId stored in array passing to next iteration
            flowController.on('2', function (locationDetailsArray) {

                (showConsole) ? console.log('2') : '';
                locationItemStoreDetailsArray = [];
                async.eachSeries(locationDetailsArray, function (element, callbackDone) {

                    palletNumberArray = [];
                    palletTypeArray = [];
                    palletSizeArray = [];
                    itemMasterArray = []; //unique
                    itemMasterQuantityArray = []; //repetitive item master MongoId in it

                    async.eachSeries(element.assignedItemStoreId, function (element2, callbackDone2) {

                        // Find item store and 
                        itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}).sort({'lotAddress': 1}).exec(function (err, itemStoreRow) {
                            if (err) {

                                callbackDone2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                callbackDone2();
                            } else {

                                async.waterfall([
                                    // Unique pallet numbers
                                    function (waterfallcallbackItemStore) {

                                        if (palletNumberArray.indexOf(itemStoreRow.palletNumber) == -1) {

                                            palletNumberArray.push(itemStoreRow.palletNumber);
                                        }
                                        waterfallcallbackItemStore(null);
                                    },
                                    // Pallet type  
                                    function (waterfallcallbackItemStore) {

                                        if (palletTypeArray.indexOf(itemStoreRow.randomFields[0].palletType) == -1) {

                                            palletTypeArray.push(itemStoreRow.randomFields[0].palletType);
                                        }
                                        waterfallcallbackItemStore(null);
                                    },
                                    // Pallet size
                                    function (waterfallcallbackItemStore) {

                                        if (palletSizeArray.indexOf(itemStoreRow.randomFields[0].palletSize) == -1) {

                                            palletSizeArray.push(itemStoreRow.randomFields[0].palletSize);
                                        }
                                        waterfallcallbackItemStore(null);
                                    },
                                    // Item master
                                    function (waterfallcallbackItemStore) {

                                        if (itemMasterArray.indexOf(itemStoreRow.itemMasterId) == -1) {

                                            itemMasterArray.push(itemStoreRow.itemMasterId);
                                        }
                                        waterfallcallbackItemStore(null);
                                    },
                                    // Item masters ID repetitive
                                    function (waterfallcallbackItemStore) {

                                        itemMasterQuantityArray.push(itemStoreRow.itemMasterId);
                                        waterfallcallbackItemStore(null);
                                    }

                                ], function (err) {
                                    if (err) {

                                        callbackDone2(err);
                                    } else {

                                        setImmediate(callbackDone2);
                                    }
                                });
                            }
                        });
                    }, function (err) {
                        if (err) {

                            callbackDone(err);
                        } else {

                            element.palletNumber = palletNumberArray;
                            element.palletType = palletTypeArray;
                            element.palletSize = palletSizeArray;
                            element.itemMaster = itemMasterArray;
                            element.itemMasterQuantity = itemMasterQuantityArray;
                            locationItemStoreDetailsArray.push(element);
                            setImmediate(callbackDone);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('3', locationItemStoreDetailsArray);
                    }
                });
            });
            // Find quantity of each item at location by comparing against
            flowController.on('3', function (locationItemStoreDetailsArray) {

                (showConsole) ? console.log('3') : '';
                finalArray = [];
                async.eachSeries(locationItemStoreDetailsArray, function (element, callbackDone) {

                    var itemMasterQuantity = element.itemMasterQuantity;
                    if (itemMasterQuantity.length == 0) {

                        setImmediate(callbackDone);
                    } else {

                        async.eachSeries(element.itemMaster, function (element2, callbackDone2) {

                            var qty = 0;
                            async.eachSeries(itemMasterQuantity, function (element3, callbackDone3) {

                                if (element2 == element3) {
                                    qty = qty + 1;
                                }
                                setImmediate(callbackDone3);
                            }, function (err) {

                                if (err) {

                                    callbackDone2(err);
                                } else {

                                    var newObject = {};
                                    newObject.areaName = element.areaName;
                                    newObject.zoneName = element.zoneName;
                                    newObject.lineName = element.lineName;
                                    newObject.levelName = element.levelName;
                                    newObject.customerAddress = element.customerAddress;
                                    newObject.isBlocked = element.isBlocked;
                                    newObject.availableCapacity = element.availableCapacity;
                                    newObject.locationCapacity = element.locationCapacity;
                                    newObject.locationMHE = element.locationMHE;
                                    newObject.palletType = element.palletType;
                                    newObject.palletNumber = element.palletNumber;
                                    newObject.palletSize = element.palletSize;
                                    newObject.locationMHE = element.locationMHE;
                                    newObject.itemMasterId = element2;
                                    newObject.quantity = qty;
                                    newObject.locationStoreId = element.locationStoreId;
                                    finalArray.push(newObject);
                                    setImmediate(callbackDone2);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                callbackDone(err);
                            } else {

                                setImmediate(callbackDone);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('4', finalArray);
                    }
                });
            });
            //
            flowController.on('4', function (finalArray) {

                (showConsole) ? console.log('4') : '';
                nextArray = [];
                async.eachSeries(finalArray, function (element, callback) {

                    itemMasterModel.findOne({'_id': element.itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {
                        //console.log('itemCode: '+itemMasterRow.itemCode+' address: '+element.customerAddress);
                        if (err) {

                            callbackDone2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow == null) {
                            `                           `
                            callbackDone2({message: 'No locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                        } else {

                            itemCategoryModel.findOne({_id: itemMasterRow.category, activeStatus: 1}, function (err, categoryRow) {

                                element.itemCode = itemMasterRow.itemCode;
                                element.itemDescription = itemMasterRow.itemDescription;
                                element.category = categoryRow.name;
                                element.itemMHE = itemMasterRow.handlingUnit;
                                nextArray.push(element);
                                setImmediate(callback);
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('5', nextArray);
                    }
                });
            });
            // Get item MHE data & location MHE data
            flowController.on('5', function (finalArray) {

                (showConsole) ? console.log('5') : '';
                var resultArray = [];
                async.eachSeries(finalArray, function (element, callbackDone) {

                    if (element.itemMHE.length == 0 && element.locationMHE.length == 0) {

                        resultArray.push(element);
                        setImmediate(callbackDone);
                    } else {

                        var itemMHE = element.itemMHE;
                        var locationMHE = element.locationMHE;
                        var commonMHE = itemMHE.concat(locationMHE).unique();
                        var itemMaterialHandlingUnit = [];
                        var locationMaterialHandlingUnit = [];
                        async.eachSeries(commonMHE, function (elementMHU, callbackMHU) {

                            materialHandlingMasterModel.findOne({'_id': elementMHU, activeStatus: 1}, function (err, materialHandlingMasterRow) {
                                if (err) {

                                    callbackMHU();
                                } else if (materialHandlingMasterRow == null) {

                                    callbackMHU();
                                } else {

                                    if (itemMHE.indexOf(elementMHU) != -1) {

                                        itemMaterialHandlingUnit.push(materialHandlingMasterRow.name);
                                    }

                                    if (locationMHE.indexOf(elementMHU) != -1) {

                                        locationMaterialHandlingUnit.push(materialHandlingMasterRow.name);
                                    }

                                    setImmediate(callbackMHU);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                element.itemMHE = itemMaterialHandlingUnit;
                                element.locationMHE = locationMaterialHandlingUnit;
                                resultArray.push(element);
                                setImmediate(callbackDone);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('6', resultArray);
                    }
                });
            });
            // Separate objects locationwise with required data
            flowController.on('6', function (resultArray) {

                (showConsole) ? console.log('6') : '';
                locationInventoryArray = [];
                async.eachSeries(resultArray, function (element, callbackDone) {

                    var object = {
                        locationStoreId: element.locationStoreId,
                        itemMasterId: element.itemMasterId,
                        customerAddress: element.customerAddress,
                        areaName: element.areaName,
                        zoneName: element.zoneName,
                        lineName: element.lineName,
                        levelName: element.levelName,
                        isBlocked: element.isBlocked,
                        availableCapacity: element.availableCapacity,
                        locationCapacity: parseInt(element.locationCapacity),
                        locationMaterialHandlingUnit: element.locationMHE,
                        palletNumber: element.palletNumber,
                        palletType: element.palletType,
                        palletSize: element.palletSize,
                        itemCode: element.itemCode,
                        itemDescription: element.itemDescription,
                        quantity: element.quantity,
                        category: element.category,
                        flags: [],
                        itemMaterialHandlingUnit: element.itemMHE
                    };
                    locationInventoryArray.push(object);
                    setImmediate(callbackDone);
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        if (sortBy == "locationQuantity") {

                            if (sortType == 1) {

                                locationInventoryArray.sort(function (a, b) {
                                    return a.quantity - b.quantity;
                                });

                                var locationInventoryArr = locationInventoryArray.slice(parseInt(limit * page), locationInventoryArray.length);
                                var locationInventoryArr1 = locationInventoryArr.slice(0, limit);

                                flowController.emit('END', locationInventoryArr1);

                            } else {

                                locationInventoryArray.sort(function (a, b) {
                                    return b.quantity - a.quantity;
                                });

                                var locationInventoryArr = locationInventoryArray.slice(parseInt(limit * page), locationInventoryArray.length);
                                var locationInventoryArr1 = locationInventoryArr.slice(0, limit);

                                flowController.emit('END', locationInventoryArr1);
                            }
                        } else {

                            flowController.emit('END', locationInventoryArray);
                        }
                    }
                });
            });
            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                locationStoresModel.count({'warehouseId': warehouseId, activeStatus: 1}, function (err, locationStoreCount) {
                    if (err) {

                        res.json({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "No locations found! Contact customer-support!", status: 'error', statusCode: '404'});
                    } else {

                        locationStoresModel.count(ObjQuery, function (err, searchCount) {
                            if (err) {

                            } else {

                                res.json({data: result, "recordsTotal": locationStoreCount, "recordsFiltered": searchCount, message: "Operation Successful.", status: 'success', statusCode: 304});
                            }
                        });
                    }
                });
            });
            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                var dataObject = {
                    MODULE: 'INVENTORY-BY-LOCATION-STORE-READ',
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
            if (call == 'INTERNAL') {
                flowController.emit('START2');
            } else {
                flowController.emit('START1');
            }
        });
//
//            
//------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details of single item
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/:itemMasterId/:itemStoreId/:locationStoreId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var itemMasterId = req.params.itemMasterId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreId = req.params.itemStoreId.trim();

            var locationStoreId = req.params.locationStoreId.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemMasterModel.findOne({'_id': itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                    itemStoreModel.findOne({'_id': itemStoreId, 'locationStoreId': locationStoreId, 'activeStatus': 1}, function (err, itemStoreRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR ", status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            flowController.emit('ERROR', {message: "Item's Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                        } else {
                            if (itemStoreRow != null) {

                                var arrItemStore = [];
                                itemStoreModel.count({'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemCount) {
                                    if (err) {

                                    } else {

                                        var data = {
                                            itemCode: itemMasterRow.itemCode,
                                            id: itemMasterRow._id,
                                            locationStoreId: itemStoreRow.locationStoreId,
                                            itemQuantity: itemCount,
                                            customPalletNumber: itemStoreRow.customPalletNumber,
                                            flags: itemStoreRow.flags,
                                            currentActivityStatus: itemStoreRow.currentActivityStatus,
                                            itemSerialNumber: itemStoreRow.itemSerialNumber,
                                            manufacturingDate: itemStoreRow.manufacturingDate,
                                            expiryDate: itemStoreRow.expiryDate,
                                            alertDate: itemStoreRow.alertDate,
                                            randomFields: itemStoreRow.randomFields,
                                            palletNumber: itemStoreRow.palletNumber

                                        };
                                        arrItemStore.push(data);
                                        flowController.emit('END', {data: arrItemStore, message: "Operation Successful.", status: 'success', statusCode: '304'});
                                    }
                                });
                            }
                        }
                    });
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
                    MODULE: 'READ-INVENTORY',
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
//                                
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/location/pallet-number/:locationStoreId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var locationStoreId = req.params.locationStoreId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreArr = [];
            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                locationStoresModel.findOne({_id: locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {data: [], message: "Location Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoreRow.assignedItemStoreId, function (element, callbackDone) {

                            itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStore) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemStore == null) {

                                    setImmediate(callbackDone);
                                } else {

                                    if (itemStore.palletNumber) {

                                        itemStoreArr.push(itemStore.palletNumber);
                                        setImmediate(callbackDone);
                                    } else
                                        setImmediate(callbackDone);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                if (itemStoreArr.length == 0) {

                                    uniqueArray = [];
                                } else {

                                    uniqueArray = itemStoreArr.filter(function (elem, pos) {
                                        return itemStoreArr.indexOf(elem) == pos;
                                    });
                                }
                                flowController.emit('END', {data: uniqueArray, message: "Operation Successful.", status: 'success', statusCode: '304'});
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
                    MODULE: 'READ-PALLETNUMBER',
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/update/item-store/')

        .post(function (req, res) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (showConsole) ? console.log(req.body) : '';

            var itemStoreId = req.body.itemStoreId.trim();
            var timeModified = req.body.timeModified.trim();

            var flowController = new EventEmitter();
            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                itemStoreModel.findOne({'_id': itemStoreId, 'activeStatus': 1}, function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow == null) {

                        flowController.emit('ERROR', {message: "Item's Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        var arrData = [];

                        if (itemStoreRow.hasOwnProperty('timeModified')) {

                            if (itemStoreRow.timeModified == parseInt(timeModified)) {

                                data = {
                                    locationStoreId: itemStoreRow.locationStoreId,
                                    itemMasterId: itemStoreRow.itemMasterId,
                                    palletNumber: (itemStoreRow.palletNumber) ? itemStoreRow.palletNumber : '',
                                    itemSerialNumber: (itemStoreRow.itemSerialNumber) ? itemStoreRow.itemSerialNumber : '',
                                    expiryDate: (itemStoreRow.expiryDate) ? itemStoreRow.expiryDate : '',
                                    manufacturingDate: (itemStoreRow.manufacturingDate) ? itemStoreRow.manufacturingDate : '',
                                    randomFields: itemStoreRow.randomFields
                                };
                                arrData.push(data);
                                flowController.emit('END', {data: arrData, message: " Operation Successful.", status: 'success', statusCode: '304'});

                            } else {

                                flowController.emit('END', {data: [], message: "item has been updated .", status: 'error', statusCode: '304'});
                            }
                        } else {

                            data = {
                                locationStoreId: itemStoreRow.locationStoreId,
                                itemMasterId: itemStoreRow.itemMasterId,
                                palletNumber: (itemStoreRow.palletNumber) ? itemStoreRow.palletNumber : '',
                                itemSerialNumber: (itemStoreRow.itemSerialNumber) ? itemStoreRow.itemSerialNumber : '',
                                expiryDate: (itemStoreRow.expiryDate) ? itemStoreRow.expiryDate : '',
                                manufacturingDate: (itemStoreRow.manufacturingDate) ? itemStoreRow.manufacturingDate : '',
                                randomFields: itemStoreRow.randomFields
                            };
                            arrData.push(data);
                            flowController.emit('END', {data: arrData, message: " Operation Successful.", status: 'success', statusCode: '304'});
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
                    MODULE: 'UPDATE-INVENTORY',
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
// Modify Inventory
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/update/inventory/')
        // Business logic starts
        .put(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreId = req.body.itemStoreId.trim();
            var itemMasterId = req.body.itemMasterId.trim();
            var locationStoreId = req.body.locationStoreId.trim();
            var checkNewPallet = req.body.checkNewPallet.trim();
            var palletNumber = req.body.palletNumber.trim();
            var itemSerialNumber = req.body.itemSerialNumber.trim();
            var manufacturingDate = req.body.manufacturingDate.trim();
            var expiryDate = req.body.expiryDate.trim();
            var randomFields = req.body.randomFields;
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                itemMasterModel.findOne({'_id': itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'itemMaster data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        var itemMasterId = String(itemMasterRow._id);

                        itemStoreModel.findOne({'_id': itemStoreId, 'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                flowController.emit('ERROR', {message: "Item's Store data Can not update/Edit !! Try again after some time.", status: 'error', statusCode: '404'});
                            } else {

                                if (itemSerialNumber == itemStoreRow.itemSerialNumber) {

                                    flowController.emit('1', itemMasterRow, itemStoreRow);
                                } else {

                                    if (itemSerialNumber) {

                                        itemStoreModel.find({'itemSerialNumber': itemSerialNumber, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowD) {
                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (itemStoreRowD.length !== 0) {

                                                flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Already in system.", status: 'error', statusCode: '304'});
                                            } else {

                                                //check locationStoreId old and new
                                                flowController.emit('1', itemMasterRow, itemStoreRow);
                                            }
                                        });
                                    } else {

                                        flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Blank.", status: 'error', statusCode: '304'});
                                    }
                                }
                            }
                        });
                    }
                });
            });

            //locationStore
            flowController.on('1', function (itemMasterRow, itemStoreRow) {

                (showConsole) ? console.log('1') : '';

                locationStoresModel.findOne({'_id': locationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'locationStore data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        holdingTypesModel.findOne({'_id': locationStoreRow.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypeRow == null) {

                                flowController.emit('ERROR', {message: 'holdingType data tampered/removed from system!', status: 'error', statusCode: '404'});
                            } else {

                                holdingType = holdingTypeRow.name;

                                flowController.emit('2', itemMasterRow, itemStoreRow, locationStoreRow, holdingType);
                            }
                        });
                    }
                });
            });

            //palletNumber
            flowController.on('2', function (itemMasterRow, itemStoreRow, locationStoreRow, holdingType) {

                (showConsole) ? console.log('2') : '';

                if (holdingType == 'PALLET') {

                    if (palletNumber) {

                        if (palletNumber == itemStoreRow.palletNumber) {

                            flowController.emit('3', itemMasterRow, itemStoreRow, locationStoreRow, 'NOTCHANGEPALLET');
                        } else {

                            flowController.emit('3', itemMasterRow, itemStoreRow, locationStoreRow, 'CHANGEPALLET');
                        }
                    } else {
                        //console.log('pallet number want for this location');
                        flowController.emit('ERROR', {message: 'Pallet Number want for this location system!', status: 'error', statusCode: '304'});
                        //error
                    }
                } else {

                    if (palletNumber) {

                        flowController.emit('ERROR', {message: 'location not defiend for pallet number to change location!', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('CAPACITY', itemMasterRow, itemStoreRow, locationStoreRow, 'CHANGEBOX');
                    }
                }
            });

            //check for new palletNumber condtion new location 
            flowController.on('3', function (itemMasterRow, itemStoreRow, locationStoreRow, checkPallet) {

                (showConsole) ? console.log('3') : '';

                itemStoreModel.find({'palletNumber': palletNumber, '_id': {'$ne': locationStoreId}, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowChk) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRowChk.length !== 0) {

                        //already pallet
                        flowController.emit('PALLET', itemMasterRow, itemStoreRow, locationStoreRow, checkPallet);
                    } else {

                        flowController.emit('CAPACITY', itemMasterRow, itemStoreRow, locationStoreRow, checkPallet);
                    }
                });
            });

            // Check AvailableCapacity
            flowController.on('CAPACITY', function (itemMasterRow, itemStoreRow, locationStoreRow, checkPallet) {

                (showConsole) ? console.log('CAPACITY') : '';

                if (locationStoreRow.availableCapacity > 0) {

                    flowController.emit('LOCATION', itemMasterRow, itemStoreRow, locationStoreRow, checkPallet, 'NEWPALLETADD');
                } else {

                    flowController.emit('ERROR', {message: 'Available Capacity Full for this location ', status: 'error', statusCode: '304'});
                }
            });

            //chek new pallet yes or no
            flowController.on('PALLET', function (itemMasterRow, itemStoreRow, locationStoreRow, checkPallet) {

                var itemStoreArr = [];

                if (checkNewPallet == 'FALSE') {

                    flowController.emit('LOCATION', itemMasterRow, itemStoreRow, locationStoreRow, checkPallet, 'ALREADYPALLET');
                } else {

                    async.eachSeries(locationStoreRow.assignedItemStoreId, function (element, callbackDone) {

                        itemStoreModel.findOne({'_id': element, 'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStore) {
                            if (err) {

                                callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStore == null) {

                                callbackDone();
                            } else {

                                itemStoreArr.push({proess: 'demo'});
                                callbackDone();
                            }
                        });
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            if (itemStoreArr.length >= 1) {

                                flowController.emit('ERROR', {message: 'This Pallet Number Already in this location ', status: 'error', statusCode: '304'});
                            } else {

                                if (locationStoreRow.availableCapacity > 0) {

                                    flowController.emit('LOCATION', itemMasterRow, itemStoreRow, locationStoreRow, checkPallet, 'NEWPALLETADD');
                                } else {

                                    flowController.emit('ERROR', {message: 'Available Capacity Full for this location ', status: 'error', statusCode: '304'});
                                }
                            }
                        }
                    });
                }
            });

            //locationStore
            flowController.on('LOCATION', function (itemMasterRow, itemStoreRow, locationStoreRow, checkPallet, checkPalletAndBOX) {

                (showConsole) ? console.log('LOCATION') : '';

                if (locationStoreId == itemStoreRow.locationStoreId) {

                    if (checkPalletAndBOX == 'ALREADYPALLET') {

                        flowController.emit('FINAL', itemMasterRow, locationStoreRow, checkPallet, 'NOTCHANGELOCATION');
                    } else {
                        //other
                        flowController.emit('FINAL2', itemMasterRow, locationStoreRow, checkPallet, 'NOTCHANGELOCATION');
                    }

                } else {

                    if (checkPalletAndBOX == 'ALREADYPALLET') {

                        flowController.emit('LOC1', itemMasterRow, locationStoreRow, checkPallet, 'LOC2', 'CHANGELOCATION');
                    } else {

                        flowController.emit('LOC1', itemMasterRow, locationStoreRow, checkPallet, 'LOC3', 'CHANGELOCATION');
                    }
                }
            });

            //locationStore validation
            flowController.on('LOC1', function (itemMasterRow, locationStoreRow, checkPallet, checkFinal, checkLocation) {

                (showConsole) ? console.log('LOC1') : '';

                var itemMasterId = String(itemMasterRow._id);

                if (locationStoreRow.isReservedForItem === 'YES') {

                    if (locationStoreRow.assignedItemStoreId.indexOf(itemMasterId) == -1) {

                        flowController.emit('ERROR', {message: 'Location is reserved for different item! This item is not allowed to be put.', status: 'error', statusCode: '404'});
                    } else {
                        if (checkFinal == 'LOC2') {
                            flowController.emit('FINAL', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                        } else {
                            flowController.emit('FINAL2', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                        }
                    }
                } else {

                    var sameItemObject = [];
                    var otherItemObject = [];
                    var exclusiveItem = [];
                    if (locationStoreRow.assignedItemStoreId.length !== 0) {

                        async.eachSeries(locationStoreRow.assignedItemStoreId, function (element, callback) {

                            itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow == null) {
                                    otherItemObject.push(element);
                                    setImmediate(callback);
                                } else {
                                    if (itemStoreRow.itemMasterId == itemMasterId) {

                                        sameItemObject.push(element);
                                        setImmediate(callback);
                                    } else {

                                        if (itemStoreRow.exclusiveStorage === 'YES') {
                                            exclusiveItem.push(element);
                                        }

                                        otherItemObject.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err) {

                                console.log('Error at mid-interval execution!!!');
                            } else {

                                if (sameItemObject.length === locationStoreRow.assignedItemStoreId.length) {
                                    // Item present at location
                                    if (checkFinal == 'LOC2') {
                                        flowController.emit('FINAL', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                                    } else {
                                        flowController.emit('FINAL2', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                                    }
                                } else if (exclusiveItem.length != 0) {
                                    // Exclusive storage available
                                    flowController.emit('ERROR', {message: 'Location already having exclusive storage enabled items! This item not allowed.', status: 'error', statusCode: '404'});
                                } else if (otherItemObject.length != 0 && itemMasterRow.exclusiveStorage == 'YES') {
                                    // Item is self exclusive
                                    flowController.emit('ERROR', {message: 'This item is exclusive so not allowed to be put at shared location!', status: 'error', statusCode: '404'});
                                } else {
                                    // empty location
                                    if (checkFinal == 'LOC2') {
                                        flowController.emit('FINAL', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                                    } else {
                                        flowController.emit('FINAL2', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                                    }
                                }
                            }
                        });
                    } else {

                        if (checkFinal == 'LOC2') {

                            flowController.emit('FINAL', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                        } else {

                            flowController.emit('FINAL2', itemMasterRow, locationStoreRow, checkPallet, checkLocation);
                        }
                    }
                }
            });

            //final save and update
            flowController.on('FINAL', function (itemMasterRow, locationStoreRow, locationStoreRow, checkPallet, checkLocation) {

                (showConsole) ? console.log('FINAL') : '';

                var itemMasterId = String(itemMasterRow._id);

                itemStoreModel.findOne({'_id': itemStoreId, 'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRowData) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRowData == null) {

                        flowController.emit('ERROR', {message: "Item's Store data Can not update/Edit !! Try again after some time.", status: 'error', statusCode: '404'});
                    } else {

                        var oldLocationStoreId = itemStoreRowData.locationStoreId;
                        var oldAvailableCapacity = itemStoreRowData.availableCapacity + 1;

                        itemStoreRowData.locationStoreId = locationStoreId;
                        itemStoreRowData.palletNumber = (palletNumber) ? palletNumber : itemStoreRowData.palletNumber;
                        itemStoreRowData.itemSerialNumber = (itemSerialNumber) ? itemSerialNumber : itemStoreRowData.itemSerialNumber;
                        itemStoreRowData.manufacturingDate = (manufacturingDate) ? manufacturingDate : itemStoreRowData.manufacturingDate;
                        itemStoreRowData.expiryDate = (expiryDate) ? expiryDate : itemStoreRowData.expiryDate;
                        itemStoreRowData.randomFields = (randomFields) ? randomFields : itemStoreRowData.randomFields;
                        itemStoreRowData.modifiedBy = modifiedBy;
                        itemStoreRowData.timeModified = timeInInteger;

                        itemStoreRowData.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                if (checkPallet == 'NOTCHANGEPALLET' && checkLocation == 'CHANGELOCATION') {

                                    flowController.emit('UPDATE', oldAvailableCapacity, oldLocationStoreId, locationStoreRow);
                                } else if (checkPallet == 'CHANGEPALLET' && checkLocation == 'CHANGELOCATION') {

                                    flowController.emit('UPDATE', oldAvailableCapacity, oldLocationStoreId, locationStoreRow);
                                } else {

                                    flowController.emit('END');
                                }
                            }
                        });
                    }
                });
            });

            //final2 save and update
            flowController.on('FINAL2', function (itemMasterRow, locationStoreRow, checkPallet, checkLocation) {

                (showConsole) ? console.log('FINAL2') : '';

                var itemMasterId = String(itemMasterRow._id);

                itemStoreModel.findOne({'_id': itemStoreId, 'itemMasterId': itemMasterId, 'activeStatus': 1}, function (err, itemStoreRowData) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRowData == null) {

                        flowController.emit('ERROR', {message: "Item's Store data Can not update/Edit !! Try again after some time.", status: 'error', statusCode: '404'});
                    } else {

                        var oldLocationStoreId = itemStoreRowData.locationStoreId;

                        itemStoreRowData.locationStoreId = locationStoreId;
                        itemStoreRowData.palletNumber = (palletNumber) ? palletNumber : itemStoreRowData.palletNumber;
                        itemStoreRowData.itemSerialNumber = (itemSerialNumber) ? itemSerialNumber : itemStoreRowData.itemSerialNumber;
                        itemStoreRowData.manufacturingDate = (manufacturingDate) ? manufacturingDate : itemStoreRowData.manufacturingDate;
                        itemStoreRowData.expiryDate = (expiryDate) ? expiryDate : itemStoreRowData.expiryDate;
                        itemStoreRowData.randomFields = (randomFields) ? randomFields : itemStoreRowData.randomFields;
                        itemStoreRowData.modifiedBy = modifiedBy;
                        itemStoreRowData.timeModified = timeInInteger;

                        itemStoreRowData.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                if (checkPallet == 'NOTCHANGEPALLET' && checkLocation == 'CHANGELOCATION') {

                                    locationStoresModel.findOne({_id: oldLocationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (locationStoreRow == null) {

                                            flowController.emit('ERROR', {message: 'Location Store data tampered/removed from system!', status: 'error', statusCode: '404'});
                                        } else {
                                            oldAvailableCapacity = locationStoreRow.availableCapacity + 1;
                                            flowController.emit('UPDATE', oldAvailableCapacity, oldLocationStoreId, locationStoreRow);
                                        }
                                    });

                                } else if (checkPallet == 'CHANGEPALLET' && checkLocation == 'CHANGELOCATION') {

                                    locationStoresModel.findOne({_id: oldLocationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (locationStoreRow == null) {

                                            flowController.emit('ERROR', {message: 'Location Store data tampered/removed from system!', status: 'error', statusCode: '404'});
                                        } else {

                                            oldAvailableCapacity = locationStoreRow.availableCapacity + 1;
                                            flowController.emit('UPDATE', oldAvailableCapacity, oldLocationStoreId, locationStoreRow);
                                        }
                                    });
                                } else if (checkPallet == 'CHANGEPALLET' && checkLocation == 'NOTCHANGELOCATION') {

                                    flowController.emit('UPDATE1', locationStoreRow);
                                } else {

                                    console.log('err');
                                }
                            }
                        });
                    }
                });
            });

            //update data
            flowController.on('UPDATE', function (oldAvailableCapacity, oldLocationStoreId, locationStoreRow) {

                (showConsole) ? console.log('UPDATE') : '';

                newAvailableCapacity = parseInt(locationStoreRow.availableCapacity) - 1;

                locationStoresModel.update({'_id': oldLocationStoreId}, {
                    '$pull': {'assignedItemStoreId': itemStoreId},
                    "$set": {
                        "availableCapacity": parseInt(oldAvailableCapacity)
                    }
                }, {safe: true},
                        function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                locationStoresModel.update({"_id": locationStoreId}, {
                                    "$addToSet": {"assignedItemStoreId": itemStoreId},
                                    "$set": {
                                        "availableCapacity": parseInt(newAvailableCapacity)
                                    }
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END');
                                    }
                                });
                            }
                        });
            });

            //update1 data
            flowController.on('UPDATE1', function (locationStoreRow) {

                (showConsole) ? console.log('UPDATE1') : '';

                newAvailableCapacity = parseInt(locationStoreRow.availableCapacity) - 1;

                locationStoresModel.update({"_id": locationStoreId}, {
                    "$addToSet": {"assignedItemStoreId": itemStoreId},
                    "$set": {
                        "availableCapacity": parseInt(newAvailableCapacity)
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        flowController.emit('END');

                    }
                });
            });

            //END 
            flowController.on('END', function () {

                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                result = {message: 'Inventory Update into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'INVENTORY-UPDATE',
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
// Add Inventory
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/create/inventory/')

        .post(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var locationStoreId = req.body.locationStoreId.trim();
            var checkNewPallet = req.body.checkNewPallet.trim();
            var itemCode = req.body.itemCode.trim().toUpperCase();
            var palletNumber = req.body.palletNumber.trim();
            var itemSerialNumber = req.body.itemSerialNumber.trim();
            var quantity = req.body.itemQuantity.trim();
            var manufacturingDate = req.body.manufacturingDate.trim();
            var expiryDate = req.body.expiryDate.trim();
            var randomFields = req.body.hasOwnProperty('randomFields') ? req.body.randomFields : []; //Array
            var createdBy = req.body.createdBy.trim();
            var loggedInUserRole = req.body.loggedInUserRole;
            var module = req.body.module;

            var flowController = new EventEmitter();

            //check itemQuantity and itemSerialNumber And availableCapacity for location
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                itemMasterModel.findOne({'itemCode': itemCode, activeStatus: 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'itemMaster data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', itemMasterRow);
                    }
                });
            });
            //locationStore
            flowController.on('1', function (itemMasterRow) {

                (showConsole) ? console.log('1') : '';
                locationStoresModel.findOne({'_id': locationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'locationStore data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', itemMasterRow, locationStoreRow);
                    }
                });
            });
            //exclusiveStorage and 
            flowController.on('2', function (itemMasterRow, locationStoreRow) {

                (showConsole) ? console.log('2') : '';
                var itemMasterId = String(itemMasterRow._id);
                if (locationStoreRow.isReservedForItem === 'YES') {

                    if (locationStoreRow.assignedItemStoreId.indexOf(itemMasterId) == -1) {

                        flowController.emit('ERROR', {message: 'Location is reserved for different item! This item is not allowed to be put.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3', itemMasterRow, locationStoreRow);
                    }
                } else {

                    var sameItemObject = [];
                    var otherItemObject = [];
                    var exclusiveItem = [];
                    if (locationStoreRow.assignedItemStoreId.length !== 0) {

                        async.eachSeries(locationStoreRow.assignedItemStoreId, function (element, callback) {

                            itemStoreModel.findOne({'_id': element, 'activeStatus': 1}, function (err, itemStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow == null) {
                                    otherItemObject.push(element);
                                    setImmediate(callback);
                                } else {
                                    if (itemStoreRow.itemMasterId == itemMasterId) {

                                        sameItemObject.push(element);
                                        setImmediate(callback);
                                    } else {

                                        if (itemStoreRow.exclusiveStorage === 'YES') {
                                            exclusiveItem.push(element);
                                        }

                                        otherItemObject.push(element);
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }, function (err) {

                            if (err) {

                                console.log('Error at mid-interval execution!!!');
                            } else {

                                if (sameItemObject.length === locationStoreRow.assignedItemStoreId.length) {
                                    // Item present at location
                                    flowController.emit('3', itemMasterRow, locationStoreRow);
                                } else if (exclusiveItem.length != 0) {
                                    // Exclusive storage available
                                    flowController.emit('ERROR', {message: 'Location already having exclusive storage enabled items! This item not allowed.', status: 'error', statusCode: '404'});
                                } else if (otherItemObject.length != 0 && itemMasterRow.exclusiveStorage == 'YES') {
                                    // Item is self exclusive
                                    flowController.emit('ERROR', {message: 'This item is exclusive so not allowed to be put at shared location!', status: 'error', statusCode: '404'});
                                } else {
                                    // empty location
                                    flowController.emit('3', itemMasterRow, locationStoreRow);
                                }
                            }
                        });
                    } else {

                        flowController.emit('3', itemMasterRow, locationStoreRow);
                    }
                }
            });
            //holdingType
            flowController.on('3', function (itemMasterRow, locationStoreRow) {

                (showConsole) ? console.log('3') : '';
                holdingType = locationStoreRow.holdingType;

                if (itemSerialNumber) {

                    itemStoreModel.find({'itemSerialNumber': itemSerialNumber, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowD) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRowD.length !== 0) {

                            flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Already exist in system.", status: 'error', statusCode: '304'});
                        } else {

                            holdingTypesModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (holdingTypeRow == null) {

                                    flowController.emit('ERROR', {message: 'holdingType data tampered/removed from system!', status: 'error', statusCode: '404'});
                                } else {

                                    holdingTypeName = holdingTypeRow.name;
                                    if (holdingTypeName == 'PALLET') {

                                        flowController.emit('PALLET', itemMasterRow, locationStoreRow);
                                    } else {

                                        flowController.emit('OTHERS', itemMasterRow, locationStoreRow);
                                    }

                                }
                            });
                        }
                    });
                } else {

                    holdingTypesModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            flowController.emit('ERROR', {message: 'holdingType data tampered/removed from system!', status: 'error', statusCode: '404'});
                        } else {

                            holdingTypeName = holdingTypeRow.name;
                            if (holdingTypeName == 'PALLET') {

                                flowController.emit('PALLET', itemMasterRow, locationStoreRow);
                            } else {

                                flowController.emit('OTHERS', itemMasterRow, locationStoreRow);
                            }

                        }
                    });
                }
            });
            //PALLET
            flowController.on('PALLET', function (itemMasterRow, locationStoreRow) {

                (showConsole) ? console.log('PALLET') : '';
                var palletArr = [];

                itemStoreModel.find({'palletNumber': palletNumber, 'locationStoreId': {'$ne': locationStoreId}, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowChk) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRowChk.length !== 0) {

                        flowController.emit('ERROR', {message: 'palletNumber Already another location in system!', status: 'error', statusCode: '304'});
                    } else {

                        if (palletNumber) {

                            if (locationStoreRow.assignedItemStoreId.length) {

                                async.eachSeries(locationStoreRow.assignedItemStoreId, function (element, callbackDone) {

                                    itemStoreModel.count({'_id': element, 'activeStatus': 1}, function (err, itemStoreCount) {
                                        if (err) {

                                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {
                                            if (itemStoreCount !== 0) {

                                                palletArr.push(element);
                                                callbackDone();
                                            } else {

                                                callbackDone();
                                            }
                                        }
                                    });
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {
                                        //check if palletNumber present at location or not
                                        if (palletArr.length !== 0) {

                                            if (checkNewPallet == 'TRUE') {

                                                //check location availableCapacity>0
                                                availableCapacity = locationStoreRow.availableCapacity;

                                                if (availableCapacity > 0) {
                                                    //  check SR.NO palletNumber yes or no
                                                    if (itemMasterRow.itemSerialNumber == 'YES') {
                                                        //Add Inventory 1 QTY
                                                        flowController.emit('1QTY', checkNewPallet);
                                                    } else {
                                                        //Add Inventory Per QTY//PERQTY
                                                        flowController.emit('PERQTY', checkNewPallet);
                                                    }
                                                } else {

                                                    flowController.emit('ERROR', {message: 'availableCapacity full in location!', status: 'error', statusCode: '304'});
                                                }
                                            } else {
                                                //  check SR.NO palletNumber yes or no
                                                if (itemMasterRow.itemSerialNumber == 'YES') {
                                                    //Add Inventory 1 QTY
                                                    flowController.emit('1QTY', checkNewPallet);
                                                } else {
                                                    //Add Inventory Per QTY//PERQTY
                                                    flowController.emit('PERQTY', checkNewPallet);
                                                }
                                            }

                                        } else {

                                            if (checkNewPallet == 'TRUE') {
                                                //check location availableCapacity>0
                                                availableCapacity = locationStoreRow.availableCapacity;

                                                if (availableCapacity > 0) {
                                                    //check SR.NO palletNumber not in system
                                                    if (itemMasterRow.itemSerialNumber == 'YES') {
                                                        //Add Inventory 1 QTY update capacity
                                                        flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);
                                                    } else {
                                                        //Add Inventory Per QTY update capacity
                                                        if (quantity) {

                                                            flowController.emit('PERQTYUDPATECAPCITY', 'PALLET');

                                                        } else {

                                                            flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);
                                                        }
                                                    }
                                                } else {

                                                    flowController.emit('ERROR', {message: 'availableCapacity full in location!', status: 'error', statusCode: '304'});
                                                }
                                            } else {

                                                //Add Inventory Per QTY update capacity
                                                if (quantity) {

                                                    flowController.emit('PERQTYUDPATECAPCITY', 'PALLET');

                                                } else {

                                                    flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);
                                                }
                                            }
                                        }
                                    }
                                });
                            } else {
                                //check location availableCapacity>0
                                availableCapacity = locationStoreRow.availableCapacity;

                                if (availableCapacity > 0) {

                                    //check SR.NO palletNumber not in system
                                    if (itemMasterRow.itemSerialNumber == 'YES') {
                                        //Add Inventory 1 QTY update capacity
                                        flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);
                                    } else {
                                        //Add Inventory Per QTY update capacity
                                        if (quantity) {

                                            flowController.emit('PERQTYUDPATECAPCITY', 'PALLET');

                                        } else {

                                            flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);

                                        }
                                    }
                                } else {

                                    flowController.emit('ERROR', {message: 'availableCapacity full in location!', status: 'error', statusCode: '304'});
                                }
                            }
                        } else {

                            flowController.emit('ERROR', {message: 'Pallet Required for this Location!', status: 'error', statusCode: '304'});
                        }
                    }
                });
            });
            //OTHERS
            flowController.on('OTHERS', function (itemMasterRow, locationStoreRow) {
                (showConsole) ? console.log('OTHERS') : '';
                availableCapacity = locationStoreRow.availableCapacity;
                if (availableCapacity >= quantity) {

                    if (palletNumber) {

                        flowController.emit('ERROR', {message: 'Please send ItemQuantity for this Operation!', status: 'error', statusCode: '304'});
                    } else {

                        if (itemMasterRow.itemSerialNumber == 'YES') {

                            itemStoreModel.find({'itemSerialNumber': itemSerialNumber, activeStatus: 1}).lean().exec(function (err, itemStoreRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow.length !== 0) {

                                    flowController.emit('ERROR', {message: 'itemSerialNumber Already in System!', status: 'error', statusCode: '304'});
                                } else {
                                    // 1QTYUDPATECAPCITY
                                    flowController.emit('1QTYUDPATECAPCITY', checkNewPallet);
                                }
                            });
                        } else {
                            //PERQTYUDPATECAPCITY
                            flowController.emit('PERQTYUDPATECAPCITY', 'OTHER');
                        }
                    }
                } else {

                    flowController.emit('ERROR', {message: 'availableCapacity full in location!', status: 'error', statusCode: '304'});
                }
            });
            //update itemStore 1 QTY  
            flowController.on('1QTY', function (isNewPallet) {

                (showConsole) ? console.log('1QTY') : '';

                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);

                lotAddressArray = [];
                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                    itemStoreModel.findOne({'lotAddress': {$regex: rgx}}).sort({'lotAddress': -1}).exec(function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {
                            if (itemStoreRow == null) {

                                newLotAddress = dateNew + 'AA00000';
                            } else {

                                lotAddress = itemStoreRow.lotAddress.slice(0, -2); // remove last 2 digits

                                newLotAddress = MagicIncrement.inc(lotAddress) + '00';
                            }

                            lotAddressArray.push(newLotAddress);

                            var newItemStore = new itemStoreModel();

                            newItemStore.warehouseId = warehouseId;
                            newItemStore.itemMasterId = itemMasterRow._id;
                            newItemStore.itemSerialNumber = itemSerialNumber;
                            newItemStore.palletNumber = palletNumber;
                            newItemStore.lotAddress = newLotAddress;
                            newItemStore.manufacturingDate = manufacturingDate;
                            newItemStore.expiryDate = expiryDate;
                            newItemStore.locationStoreId = locationStoreId;
                            newItemStore.overflowAutoAssign = itemMasterRow.overflowAutoAssign;
                            newItemStore.exclusiveStorage = itemMasterRow.exclusiveStorage;
                            newItemStore.randomFields = randomFields;
                            newItemStore.createdBy = createdBy;
                            newItemStore.date = moment(new Date()).format('DD/MM/YY');
                            newItemStore.timeCreated = timeInInteger;

                            newItemStore.save(function (err, returnData) {
                                if (err) {

                                } else {
                                    var insertedRecordId = returnData._id;

                                    flowController.emit('itemStoreId', String(insertedRecordId), isNewPallet);

                                }
                            });
                        }
                    });
                });
            });
            //create lotAddress
            flowController.on('PERQTY', function (isNewPallet) {

                (showConsole) ? console.log('PERQTY') : '';
                var date = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + date);
                var lotAddressArray = [];
                var lotAddress;

                itemMasterModel.findOne({'warehouseId': warehouseId, 'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        itemMasterId = itemMasterRow._id;
                        itemStoreModel.findOne({'lotAddress': {$regex: rgx}}).sort({'lotAddress': -1}).exec(function (err, itemStoreRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                var promise_createLotAddresses = new Promises(function (resolve, reject) {

                                    lotAddressArray = [];
                                    for (var i = 1; i <= quantity; i++) {

                                        var temp = {};
                                        if (lotAddressArray.length != 0) {

                                            previousLotAddress = lotAddressArray[i - 2].lotAddress.slice(0, -2);
                                            newLotAddress = MagicIncrement.inc(previousLotAddress) + '00';
                                        } else {

                                            newLotAddress = date + 'AA00000';
                                        }

                                        temp.lotAddress = newLotAddress;
                                        lotAddressArray.push(temp);
                                    }
                                    resolve(lotAddressArray);
                                });
                            } else {

                                if (itemStoreRow != null) {

                                    lotAddress = itemStoreRow.lotAddress.slice(0, -2); // remove last 2 digits

                                    var promise_createLotAddresses = new Promises(function (resolve, reject) {

                                        for (var j = 1; j <= quantity; j++) {

                                            var temp = {};
                                            if (lotAddressArray.length != 0) {

                                                currentLotAddress = lotAddressArray[j - 2].lotAddress.slice(0, -2);
                                                newLotAddress = MagicIncrement.inc(currentLotAddress) + '00';
                                            } else {

                                                newLotAddress = MagicIncrement.inc(lotAddress) + '00';
                                            }

                                            temp.lotAddress = newLotAddress;
                                            lotAddressArray.push(temp);
                                        }
                                        resolve(lotAddressArray);
                                    });
                                }
                            }
                            promise_createLotAddresses.then(function (promise_resolvedData) {

                                flowController.emit('PERQTYB', promise_resolvedData, isNewPallet);
                            }, function (reject) { // After 1st promise completes, if promise rejected (REJECTED PART)

                                flowController.emit('ERROR', reject);
                            }).catch(function (exception) {
                                /* error :( */
                                console.log(exception);
                                flowController.emit('ERROR', {message: 'EXCEPTION WHILE ADDING ', status: 'error', statusCode: '500'});
                            });
                        });
                    }
                });
            });
            //itemStore insert itemQuantity 
            flowController.on('PERQTYB', function (getLotAddress, isNewPallet) {

                (showConsole) ? console.log('PERQTYB') : '';

                var itemStoreArray = [];

                async.eachSeries(getLotAddress, function (element, callbackDone) {

                    lotAddress = element.lotAddress;
                    itemStoreModel.find({'warehouseId': warehouseId, 'itemCode': itemCode, 'lotAddress': lotAddress, 'activeStatus': 1}).lean().exec(function (err, itemStoresRow) {

                        if (err) {
                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoresRow.length != 0) {

                            callbackDone({message: 'Records with this lot address already found! Error while configuring location store.', status: 'error', statusCode: '404'});
                        } else {

                            var newItemStore = new itemStoreModel();
                            newItemStore.warehouseId = warehouseId;
                            newItemStore.itemMasterId = itemMasterId;
                            newItemStore.lotAddress = element.lotAddress;
                            newItemStore.itemCode = itemCode;
                            (palletNumber != "") ? newItemStore.palletNumber = palletNumber : '';
                            (itemSerialNumber != "") ? newItemStore.itemSerialNumber = itemSerialNumber : '';
                            newItemStore.manufacturingDate = manufacturingDate;
                            newItemStore.expiryDate = expiryDate;
                            newItemStore.randomFields = randomFields;
                            newItemStore.locationStoreId = locationStoreId;
                            newItemStore.createdBy = createdBy;
                            newItemStore.date = moment(new Date()).format('DD/MM/YY');
                            newItemStore.timeCreated = timeInInteger;
                            newItemStore.save(function (err, returnData) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    var insertedRecordId = returnData._id;
                                    itemStoreArray.push(String(insertedRecordId));
                                    setTimeout(function () {
                                        callbackDone();
                                    }, 10);
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('itemStoreIdUDPATECAPCITY', itemStoreArray, 'PALLET');
                    }
                });
            });
            //update 1QTYUDPATECAPCITY 1 QTY  
            flowController.on('1QTYUDPATECAPCITY', function (isNewPallet) {

                (showConsole) ? console.log('1QTYUDPATECAPCITY') : '';
                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);
                lotAddressArray = [];
                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                    itemStoreModel.findOne({'lotAddress': {$regex: rgx}}).sort({'lotAddress': -1}).exec(function (err, itemStoreRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {
                            if (itemStoreRow == null) {

                                newLotAddress = dateNew + 'AA00000';
                            } else {

                                lotAddress = itemStoreRow.lotAddress.slice(0, -2); // remove last 2 digits

                                newLotAddress = MagicIncrement.inc(lotAddress) + '00';
                            }

                            lotAddressArray.push(newLotAddress);
                            var newItemStore = new itemStoreModel();
                            newItemStore.warehouseId = warehouseId;
                            newItemStore.itemMasterId = itemMasterRow._id;
                            (palletNumber != "") ? newItemStore.palletNumber = palletNumber : '';
                            (itemSerialNumber != "") ? newItemStore.itemSerialNumber = itemSerialNumber : '';
                            newItemStore.lotAddress = newLotAddress;
                            newItemStore.manufacturingDate = manufacturingDate;
                            newItemStore.expiryDate = expiryDate;
                            newItemStore.locationStoreId = locationStoreId;
                            newItemStore.overflowAutoAssign = itemMasterRow.overflowAutoAssign;
                            newItemStore.exclusiveStorage = itemMasterRow.exclusiveStorage;
                            newItemStore.randomFields = randomFields;
                            newItemStore.createdBy = createdBy;
                            newItemStore.date = moment(new Date()).format('DD/MM/YY');
                            newItemStore.timeCreated = timeInInteger;
                            newItemStore.save(function (err, returnData) {
                                if (err) {

                                } else {

                                    var insertedRecordId = returnData._id;
                                    flowController.emit('itemStoreId', String(insertedRecordId), isNewPallet);
                                }
                            });
                        }
                    });
                });
            });
            //itemStoreId insert in locationStore collection
            flowController.on('itemStoreId', function (itemStoreId, isNewPallet) {

                (showConsole) ? console.log('itemStoreId') : '';
                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {


                        if (isNewPallet == 'TRUE') {

                            newAvailableCapacity = locationStoreRow.availableCapacity - 1;

                            locationStoresModel.update({"_id": locationStoreId}, {
                                "$addToSet": {"assignedItemStoreId": itemStoreId},
                                "$set": {
                                    "availableCapacity": newAvailableCapacity
                                }
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('END');
                                }
                            });
                        } else {
                            locationStoresModel.update({_id: locationStoreId}, {
                                $addToSet: {
                                    assignedItemStoreId: itemStoreId
                                }
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('ALERT');
                                    flowController.emit('END');
                                }
                            });
                        }
                    }
                });
            });
            //create PERQTYUDPATECAPCITY
            flowController.on('PERQTYUDPATECAPCITY', function (checkQty) {

                (showConsole) ? console.log('PERQTYUDPATECAPCITY') : '';
                var date = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + date);
                var lotAddressArray = [];
                var lotAddress = '';
                itemMasterModel.findOne({'warehouseId': warehouseId, 'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Item master data deleted/modified!!!!!', status: 'error', statusCode: '404'});
                    } else {

                        itemMasterId = itemMasterRow._id;
                        itemStoreModel.findOne({'lotAddress': {$regex: rgx}}).sort({'lotAddress': -1}).exec(function (err, itemStoreRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                var promise_createLotAddresses = new Promises(function (resolve, reject) {

                                    for (var i = 1; i <= quantity; i++) {

                                        var temp = {};
                                        if (lotAddressArray.length != 0) {

                                            previousLotAddress = lotAddressArray[i - 2].lotAddress.slice(0, -2);
                                            newLotAddress = MagicIncrement.inc(previousLotAddress) + '00';
                                        } else {

                                            newLotAddress = date + 'AA00000';
                                        }
                                        temp.lotAddress = newLotAddress;
                                        lotAddressArray.push(temp);
                                    }
                                    resolve(lotAddressArray);
                                });
                            } else {

                                if (itemStoreRow != null) {

                                    lotAddress = itemStoreRow.lotAddress.slice(0, -2); // remove last 2 digits

                                    var promise_createLotAddresses = new Promises(function (resolve, reject) {

                                        for (var j = 1; j <= quantity; j++) {

                                            var temp = {};
                                            if (lotAddressArray.length != 0) {

                                                currentLotAddress = lotAddressArray[j - 2].lotAddress.slice(0, -2);
                                                newLotAddress = MagicIncrement.inc(currentLotAddress) + '00';
                                            } else {

                                                newLotAddress = MagicIncrement.inc(lotAddress) + '00';
                                            }

                                            temp.lotAddress = newLotAddress;
                                            lotAddressArray.push(temp);
                                        }
                                        resolve(lotAddressArray);
                                    });
                                }
                            }
                            promise_createLotAddresses.then(function (promise_resolvedData) {

                                flowController.emit('BPERQTYUDPATECAPCITY', promise_resolvedData, checkQty);
                            }, function (reject) { // After 1st promise completes, if promise rejected (REJECTED PART)

                                flowController.emit('ERROR', reject);
                            }).catch(function (exception) {
                                /* error :( */
                                console.log(exception);
                                flowController.emit('ERROR', {message: 'EXCEPTION WHILE ADDING ' + exception, status: 'error', statusCode: '500'});
                            });
                        });
                    }
                });
            });
            //itemStore insert PERQTYUDPATECAPCITY 
            flowController.on('BPERQTYUDPATECAPCITY', function (getLotAddress, checkQty) {

                (showConsole) ? console.log('BPERQTYUDPATECAPCITY') : '';

                var itemStoreArray = [];

                async.eachSeries(getLotAddress, function (element, callbackDone) {

                    itemStoreModel.find({'warehouseId': warehouseId, 'itemCode': itemCode, 'lotAddress': element.lotAddress, 'activeStatus': 1}).lean().exec(function (err, itemStoresRow) {

                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoresRow.length != 0) {

                            callbackDone({message: 'Records with this lot address already found! Error while configuring location store.', status: 'error', statusCode: '404'});
                        } else {

                            var newItemStore = new itemStoreModel();
                            newItemStore.warehouseId = warehouseId;
                            newItemStore.itemMasterId = itemMasterId;
                            newItemStore.lotAddress = element.lotAddress;
                            newItemStore.itemCode = itemCode;
                            (palletNumber != "") ? newItemStore.palletNumber = palletNumber : '';
                            (itemSerialNumber != "") ? newItemStore.itemSerialNumber = itemSerialNumber : '';
                            newItemStore.manufacturingDate = manufacturingDate;
                            newItemStore.expiryDate = expiryDate;
                            newItemStore.randomFields = randomFields;
                            newItemStore.locationStoreId = locationStoreId;
                            newItemStore.createdBy = createdBy;
                            newItemStore.date = moment(new Date()).format('DD/MM/YY');
                            newItemStore.timeCreated = timeInInteger;

                            newItemStore.save(function (err, returnData) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    var insertedRecordId = returnData._id;
                                    itemStoreArray.push(String(insertedRecordId));
                                    callbackDone();

                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('itemStoreIdUDPATECAPCITY', itemStoreArray, checkQty);
                    }
                });
            });
            //itemStoreIdUDPATECAPCITY insert in locationStore collection
            flowController.on('itemStoreIdUDPATECAPCITY', function (itemStoreArray, checkQty) {

                (showConsole) ? console.log('itemStoreIdUDPATECAPCITY') : '';

                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        if (checkQty == 'PALLET' && checkNewPallet == 'TRUE') {

                            newAvailableCapacity = parseInt(locationStoreRow.availableCapacity) - 1;
                        } else if (checkQty == 'PALLET' && checkNewPallet == 'FALSE') {

                            newAvailableCapacity = locationStoreRow.availableCapacity;

                        } else {

                            if (locationStoreRow.availableCapacity >= quantity) {

                                newAvailableCapacity = parseInt(locationStoreRow.availableCapacity) - quantity;
                            } else {

                                flowController.emit('ERROR', {message: 'Quantity greater then AvailableCapacity  in location!', status: 'error', statusCode: '304'});
                            }

                        }
                        async.eachSeries(itemStoreArray, function (element, callbackDone) {

                            locationStoresModel.update({"_id": locationStoreId}, {
                                "$addToSet": {"assignedItemStoreId": element},
                                "$set": {
                                    "availableCapacity": newAvailableCapacity
                                }
                            }, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    callbackDone();
                                }
                            });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('ALERT');
                                flowController.emit('END');
                            }
                        });
                    }
                });
            });
            //ALERT 
            flowController.on('ALERT', function () {

                (showConsole) ? console.log('ALERT') : '';
                itemMasterModel.findOne({'itemCode': itemCode, activeStatus: 1}, function (err, itemMasterRow) {
                    if (err) {

                        console.log('err');
                    } else if (itemMasterRow == null) {

                        console.log('itemMaster null');
                    } else {

                        itemStoreModel.count({'itemMasterId': itemMasterRow._id, activeStatus: 1}, function (err, itemCount) {
                            if (err) {

                            } else {

                                maxInventory = (itemMasterRow.itemSystemSpecification[0].maxInventoryAlert) ? itemMasterRow.itemSystemSpecification[0].maxInventoryAlert : '';

                                if (maxInventory) {

                                    if (itemCount > parseInt(maxInventory)) {

                                        dataObject = {

                                            warehouseId: warehouseId,
                                            textName: 'Current Inventory of ItemCode ' + itemMasterRow.itemCode + ' Has Reached To Maximum Inventory (Max. Count : ' + parseInt(maxInventory) + '  && Current Inventory  ' + itemCount + '  ).',
                                            module: 'INVENTORY',
                                            name: 'ITEM CODE : ' + itemMasterRow.itemCode,
                                            id: itemMasterRow._id
                                        };

                                        alertService.createAlert(dataObject, function (err, response) {
                                            if (err) {

                                                console.log('err');
                                            } else {

                                                console.log('success' + response);
                                            }
                                        });

                                    } else {

                                        console.log('maxInventory null');
                                    }
                                } else {

                                    console.log('maxInventory null');
                                }
                            }
                        });
                    }
                });
            });
            //END 
            flowController.on('END', function () {

                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                result = {message: 'New Inventory added into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'INVENTORY-CREATE',
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
//warehuseInvontroy/delete
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/delete/inventory/')

        .post(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var virtualLocationStoreId = req.body.virtualLocationStoreId.trim();
            var itemStoreArray = req.body.itemStoreArray;
            var modifiedBy = req.body.modifiedBy.trim();


            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                pickSublistArr = [];

                pickSubListModel.find({'status': {$in: [1, 5, 11, 21, 25, 27, 41]}, 'activeStatus': 1}).lean().exec(function (err, picSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (picSubListRow.length == 0) {

                        flowController.emit('1.1', pickSublistArr);
                    } else {

                        async.eachSeries(picSubListRow, function (pickelement, callbackpick) {

                            if (pickelement.itemStoreId.length == 0) {

                                setImmediate(callbackpick);
                            } else {

                                async.eachSeries(pickelement.itemStoreId, function (elementItem, callbackItem) {

                                    pickSublistArr.push(elementItem);
                                    setImmediate(callbackItem);

                                }, function (err) {
                                    if (err) {

                                        callbackpick(err);
                                    } else {

                                        setImmediate(callbackpick);
                                    }
                                });
                            }
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                pickSublistArray = underscore.uniq(pickSublistArr);
                                flowController.emit('1.1', pickSublistArray);
                            }
                        });
                    }
                });
            });
            // pickListSub compare
            flowController.on('1.1', function (pickSublistArray) {

                (showConsole) ? console.log('1.1') : '';

                pickDeleteArr = [];
                pickPendingArr = [];

                if (pickSublistArray.length == 0) {

                    async.eachSeries(itemStoreArray, function (elementItem, callbackItem) {

                        pickDeleteArr.push(elementItem);
                        setImmediate(callbackItem);
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('1.2', pickDeleteArr, pickPendingArr);
                        }
                    });
                } else {

                    async.eachSeries(itemStoreArray, function (element, callback) {

                        async.eachSeries(pickSublistArray, function (elementItem, callbackItem) {

                            if (element == elementItem) {

                                pickPendingArr.push(element);
                                setImmediate(callbackItem);
                            } else {

                                pickDeleteArr.push(element);
                                setImmediate(callbackItem);
                            }
                        }, function (err) {
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

                            pickDeleteArray = underscore.uniq(pickDeleteArr);
                            pickPendingArray = underscore.uniq(pickPendingArr);
                            flowController.emit('1.2', pickDeleteArray, pickPendingArray);
                        }
                    });
                }
            });
            //check
            flowController.on('1.2', function (pickDeleteArray, pickPendingArray) {

                (showConsole) ? console.log('1.2') : '';

                putSublistArr = [];

                putSubListModel.find({'status': {$in: [1, 5, 11, 21, 25, 27, 41]}, 'activeStatus': 1}).lean().exec(function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putSubListRow.length == 0) {

                        flowController.emit('1', pickDeleteArray, pickPendingArray, putSublistArr);
                    } else {

                        async.eachSeries(putSubListRow, function (putelement, callbackPut) {

                            if (putelement.itemStoreId.length == 0) {

                                setImmediate(callbackPut);
                            } else {

                                async.eachSeries(putelement.itemStoreId, function (elementItem, callbackItem) {

                                    putSublistArr.push(elementItem);
                                    setImmediate(callbackItem);

                                }, function (err) {
                                    if (err) {

                                        callbackPut(err);
                                    } else {

                                        setImmediate(callbackPut);
                                    }
                                });
                            }
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                putSublistArray = underscore.uniq(putSublistArr);
                                flowController.emit('1', pickDeleteArray, pickPendingArray, putSublistArray);
                            }
                        });
                    }
                });
            });
            //putSubList check
            flowController.on('1', function (pickDeleteArr, pickPendingArr, putSublistArr) {

                (showConsole) ? console.log('1') : '';

                putDeleteArr = [];
                putPendingArr = [];

                if (putSublistArr.length == 0) {

                    async.eachSeries(itemStoreArray, function (elementItemStore, callbackItemMaster) {

                        putDeleteArr.push(elementItemStore);
                        setImmediate(callbackItemMaster);

                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var finalDeleteArr = underscore.union(pickDeleteArr, putDeleteArr);//pickDeleteArr.concat(putDeleteArr);
                            var finalPendingArr = underscore.union(pickPendingArr, putPendingArr);//pickPendingArr.concat(putPendingArr);

                            flowController.emit('2', finalDeleteArr, finalPendingArr);
                        }
                    });
                } else {

                    async.eachSeries(itemStoreArray, function (element, callback) {

                        async.eachSeries(putSublistArr, function (elementItemStore, callbackItemMaster) {

                            if (elementItemStore == element) {

                                putPendingArr.push(element);
                                setImmediate(callbackItemMaster);
                            } else {

                                putDeleteArr.push(element);
                                setImmediate(callbackItemMaster);
                            }
                        }, function (err) {
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

                            var putDeleteArray = underscore.uniq(putDeleteArr);
                            var putPendingArray = underscore.uniq(putPendingArr);

                            var finalDeleteArr = underscore.union(pickDeleteArr, putDeleteArray);//pickDeleteArr.concat(putDeleteArr);
                            var finalPendingArr = underscore.union(pickPendingArr, putPendingArray);
                            flowController.emit('2.1', finalDeleteArr, finalPendingArr);
                        }
                    });
                }
            });
            //uniq compare
            flowController.on('2.1', function (finalDeleteArr, finalPendingArr) {
                (showConsole) ? console.log('2.1') : '';

                deleteArr = underscore.uniq(finalDeleteArr);
                comPendingArray = underscore.uniq(finalPendingArr);

                comDeleteArray = underscore.difference(deleteArr, comPendingArray);

                flowController.emit('2', comDeleteArray, comPendingArray);

            });
            //itemStoreModel
            flowController.on('2', function (comDeleteArray, comPendingArray) {
                (showConsole) ? console.log('2') : '';

                uniqDelete = underscore.uniq(comDeleteArray);
                uniqPending = underscore.uniq(comPendingArray);

                var itemStoreArr = [];

                if (uniqDelete.length == 0) {
                    //PENDING
                    flowController.emit('PENDING', uniqPending);
                } else {

                    async.eachSeries(uniqDelete, function (elementItemStore, callbackItemStore) {

                        itemStoreModel.findOne({'_id': elementItemStore, 'activeStatus': 1}, function (err, itemStoreRow) {
                            if (err) {

                                callbackItemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                setImmediate(callbackItemStore);
                            } else {

                                data = {
                                    itemStoreId: elementItemStore,
                                    itemMasterId: itemStoreRow.itemMasterId,
                                    palletNumber: itemStoreRow.palletNumber,
                                    locationStoreId: itemStoreRow.locationStoreId
                                };
                                itemStoreArr.push(data);
                                setImmediate(callbackItemStore);
                            }
                        });
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('3', itemStoreArr, uniqPending);
                        }
                    });
                }
            });
            //locationStoresModel
            flowController.on('3', function (itemStoreArr, uniqPending) {
                (showConsole) ? console.log('3') : '';

                var locationArr = [];

                async.eachSeries(itemStoreArr, function (elementLocation, callbackLocation) {
                    //'availability': 'A'
                    locationStoresModel.findOne({'_id': elementLocation.locationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                        if (err) {

                            callbackLocation({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow == null) {

                            setImmediate(callbackLocation);
                        } else {

                            data = {
                                holdingType: locationStoreRow.holdingType,
                                itemStoreId: elementLocation.itemStoreId,
                                itemMasterId: elementLocation.itemMasterId,
                                palletNumber: elementLocation.palletNumber,
                                locationStoreId: elementLocation.locationStoreId
                            };
                            locationArr.push(data);
                            setImmediate(callbackLocation);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        if (locationArr.length == 0) {

                            flowController.emit('NOTLOCATION', itemStoreArr, uniqPending);
                        } else {

                            flowController.emit('4', locationArr, uniqPending);
                        }
                    }
                });
            });
            //holdingTypesModel
            flowController.on('4', function (locationArr, uniqPending) {
                (showConsole) ? console.log('4') : '';

                var holdingArr = [];
                async.eachSeries(locationArr, function (element, callbackHolding) {

                    holdingTypesModel.findOne({_id: element.holdingType, activeStatus: 1}, function (err, holdingTypeRow) {
                        if (err) {

                            callbackHolding({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            setImmediate(callbackHolding);
                        } else {

                            data = {
                                holdingType: holdingTypeRow.name,
                                itemStoreId: element.itemStoreId,
                                itemMasterId: element.itemMasterId,
                                palletNumber: element.palletNumber,
                                locationStoreId: element.locationStoreId

                            };
                            holdingArr.push(data);
                            setImmediate(callbackHolding);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('5.1', holdingArr, uniqPending);
                    }
                });
            });
            //pallet itemCount
            flowController.on('5.1', function (holdingArr, uniqPending) {
                (showConsole) ? console.log('5.1') : '';
                var itemPalletCount = 0;
                var palletNumberArr = {};

                async.eachSeries(holdingArr, function (element, callback) {

                    itemStoreModel.find({'palletNumber': element.palletNumber, activeStatus: 1}).lean().exec(function (err, itemStoreRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow.length == 0) {

                            setImmediate(callback);
                        } else {

                            async.eachSeries(itemStoreRow, function (elementItem, callbackItem) {

                                itemStoreId = String(elementItem._id);

                                if (element.itemStoreId == itemStoreId) {

                                    palletNumberArr = element.palletNumber;
                                    itemPalletCount++;

                                    setImmediate(callbackItem);
                                } else {

                                    setImmediate(callbackItem);
                                }
                            }, function (err) {
                                if (err) {

                                    callback(err);
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

                        flowController.emit('5', holdingArr, uniqPending, itemPalletCount, palletNumberArr);
                    }
                });

            });
            //condition check
            flowController.on('5', function (holdingArr, uniqPending, itemPalletCount, palletNumberArr) {
                (showConsole) ? console.log('5') : '';

                var palletCountArr = [];
                var palletArr = [];
                var notPalletArr = [];

                async.eachSeries(holdingArr, function (element, callback) {

                    if (element.holdingType == 'PALLET') {

                        itemStoreModel.count({'palletNumber': element.palletNumber, activeStatus: 1}, function (err, totalCount) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                if (totalCount == itemPalletCount && element.palletNumber == palletNumberArr) {
                                    //capacity-1
                                    data = {

                                        itemStoreId: element.itemStoreId,
                                        itemMasterId: element.itemMasterId,
                                        palletNumber: element.palletNumber,
                                        locationStoreId: element.locationStoreId
                                    };
                                    palletCountArr.push(data);
                                    setImmediate(callback);
                                } else {

                                    data = {

                                        itemStoreId: element.itemStoreId,
                                        itemMasterId: element.itemMasterId,
                                        palletNumber: element.palletNumber,
                                        locationStoreId: element.locationStoreId
                                    };

                                    palletArr.push(data);
                                    setImmediate(callback);
                                }
                            }
                        });
                    } else {
                        //capacity-1
                        data = {

                            itemStoreId: element.itemStoreId,
                            itemMasterId: element.itemMasterId,
                            palletNumber: element.palletNumber,
                            locationStoreId: element.locationStoreId
                        };
                        notPalletArr.push(data);
                        setImmediate(callback);
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        //console.log('palletCountArr' + palletCountArr.length + 'palletArr' + palletArr.length + 'notPalletArr' + notPalletArr.length)
                        flowController.emit('6', palletCountArr, palletArr, notPalletArr, uniqPending);
                    }
                });
            });
            //CountPallet
            flowController.on('6', function (palletCountArr, palletArr, notPalletArr, uniqPending) {
                (showConsole) ? console.log('6') : '';

                var locationArr = [];
                if (palletCountArr.length == 0) {

                    flowController.emit('7', palletArr, notPalletArr, uniqPending);
                } else {

                    async.eachSeries(palletCountArr, function (element, callback) {

                        locationArr.push(element.locationStoreId);

                        locationStoresModel.update({'_id': element.locationStoreId}, {'$pull': {'assignedItemStoreId': element.itemStoreId}}, {safe: true},
                                function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        itemStoreModel.update({'_id': element.itemStoreId}, {'$set': {'previousLocationStoreId': element.locationStoreId, 'virtualLocationStoreId': virtualLocationStoreId, 'activeStatus': 3, 'modifiedBy': modifiedBy, 'timemodified': timeInInteger}},
                                                function (err) {
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

                            flowController.emit('6.1', locationArr, palletArr, notPalletArr, uniqPending);
                        }
                    });
                }
            });
            //update location availableCapacity 
            flowController.on('6.1', function (locationArr, palletArr, notPalletArr, uniqPending) {
                (showConsole) ? console.log('6.1') : '';

                locationArray = underscore.uniq(locationArr);

                async.eachSeries(locationArray, function (element, callback) {

                    locationStoresModel.findOne({_id: element, activeStatus: 1}, function (err, locationStoreRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationStoreRow == null) {

                            setImmediate(callback);
                        } else {

                            newAvailableCapacity = locationStoreRow.availableCapacity + 1;

                            locationStoresModel.update({'_id': element}, {'$set': {"availableCapacity": parseInt(newAvailableCapacity)}},
                                    function (err) {
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

                        flowController.emit('7', palletArr, notPalletArr, uniqPending);
                    }
                });
            });
            //pallet
            flowController.on('7', function (palletArr, notPalletArr, uniqPending) {
                (showConsole) ? console.log('7') : '';

                if (palletArr.length == 0) {

                    flowController.emit('8', notPalletArr, uniqPending);
                } else {
                    async.eachSeries(palletArr, function (element, callback) {

                        locationStoresModel.update({'_id': element.locationStoreId}, {'$pull': {'assignedItemStoreId': element.itemStoreId}}, {safe: true},
                                function (err) {
                                    if (err) {

                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        itemStoreModel.update({'_id': element.itemStoreId}, {'$set': {'previousLocationStoreId': element.locationStoreId, 'virtualLocationStoreId': virtualLocationStoreId, 'activeStatus': 3, 'modifiedBy': modifiedBy, 'timemodified': timeInInteger}},
                                                function (err) {
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

                            flowController.emit('8', notPalletArr, uniqPending);
                        }
                    });
                }
            });
            //loseBox
            flowController.on('8', function (notPalletArr, uniqPending) {
                (showConsole) ? console.log('8') : '';

                if (notPalletArr.length == 0) {

                    flowController.emit('PENDING', uniqPending);
                } else {

                    async.eachSeries(notPalletArr, function (element, callback) {

                        locationStoresModel.findOne({_id: element.locationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (locationStoreRow == null) {

                                setImmediate(callback);
                            } else {

                                newAvailableCapacity = locationStoreRow.availableCapacity + 1;

                                locationStoresModel.update({'_id': element.locationStoreId}, {
                                    '$pull': {'assignedItemStoreId': element.itemStoreId},
                                    "$set": {
                                        "availableCapacity": parseInt(newAvailableCapacity)
                                    }
                                }, {safe: true},
                                        function (err) {
                                            if (err) {

                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                itemStoreModel.update({'_id': element.itemStoreId}, {'$set': {'previousLocationStoreId': element.locationStoreId, 'virtualLocationStoreId': virtualLocationStoreId, 'activeStatus': 3, 'modifiedBy': modifiedBy, 'timemodified': timeInInteger}},
                                                        function (err) {
                                                            if (err) {

                                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                            } else {

                                                                setImmediate(callback);
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

                            flowController.emit('PENDING', uniqPending);
                        }
                    });
                }
            });
            //NotLocation
            flowController.on('NOTLOCATION', function (itemStoreArr, uniqPending) {

                (showConsole) ? console.log('NOTLOCATION') : '';

                async.eachSeries(itemStoreArr, function (element, callback) {

                    itemStoreModel.update({'_id': element.itemStoreId}, {'$set': {'previousLocationStoreId': '', 'virtualLocationStoreId': virtualLocationStoreId, 'activeStatus': 3, 'modifiedBy': modifiedBy, 'timemodified': timeInInteger}},
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

                        flowController.emit('PENDING', uniqPending);
                    }
                });
            });
            //pending
            flowController.on('PENDING', function (uniqPending) {
                (showConsole) ? console.log('PENDING') : '';

                pendingArr = [];

                if (uniqPending.length == 0) {

                    flowController.emit('END', pendingArr);
                } else {

                    async.eachSeries(uniqPending, function (element, callback) {

                        itemStoreModel.findOne({_id: element, activeStatus: 1}, function (err, itemStoreRow) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemStoreRow == null) {

                                setImmediate(callback);
                            } else {

                                data = {
                                    itemSerialNumber: itemStoreRow.itemSerialNumber,
                                    palletNumber: itemStoreRow.palletNumber
                                };
                                pendingArr.push(data);
                                setImmediate(callback);
                            }
                        });
                    }, function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('END', pendingArr);
                        }
                    });
                }
            });
            //END 
            flowController.on('END', function (pendingArr) {
                //ArrayKey = JSON.stringify(pendingArr)
                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                if (pendingArr.length == 0)
                    msg = 'Inventory remove into the system.';
                else
                    msg = 'Some item removed in inventory and some pallet and serial numbers cannot deleted because they are in use. Please check CSV File.';

                result = {validationErrors: pendingArr, message: msg, status: 'success', statusCode: '200'};
                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'INVENTORY-DELETE',
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
            flowController.emit('START');
        });
//
//              
//------------------------------------------------------------------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/inventory/barcode/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            // Get all unremoved locations having assignedItemStoreId values
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var itemStoreArr = [];

                itemStoreModel.find({'warehouseId': warehouseId, activeStatus: 1}).lean().exec(function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: 'No active inventory available in warehouse!', status: 'error', statusCode: '404'});
                    } else {
                        async.eachSeries(itemStoreRow, function (elementItemStore, callbackItemStore) {

                            itemStoreArr.push(elementItemStore.palletNumber);

                            setImmediate(callbackItemStore);

                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', itemStoreArr);
                            }
                        });
                    }
                });
            });
            //
            //itemMasterId
            flowController.on('1', function (itemStoreArr) {

                (showConsole) ? console.log('1') : '';

                uniqueArray = itemStoreArr.filter(function (elem, pos) {

                    return itemStoreArr.indexOf(elem) == pos;
                });

                var itemStoreArray = [];

                async.eachSeries(uniqueArray, function (elementpalletNumber, callbackItemStore) {

                    itemStoreModel.findOne({'warehouseId': warehouseId, activeStatus: 1}, function (err, itemStoreRow) {
                        if (err) {

                            callbackItemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            callbackItemStore();
                        } else {

                            data = {
                                palletNumber: elementpalletNumber,
                                itemMasterId: itemStoreRow.itemMasterId
                            };
                            itemStoreArray.push(data);

                            setImmediate(callbackItemStore);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', itemStoreArray);
                    }
                });
            });
            //
            //itemCode
            flowController.on('2', function (itemStoreArray) {

                (showConsole) ? console.log('2') : '';

                var itemCodeArr = [];

                async.eachSeries(itemStoreArray, function (element, callbackItemMaster) {

                    itemMasterModel.findOne({_id: element.itemMasterId, 'warehouseId': warehouseId, activeStatus: 1}, function (err, itemMasterRow) {
                        if (err) {

                            callbackItemMaster({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemMasterRow == null) {

                            callbackItemMaster();
                        } else {

                            data = {
                                palletNumber: element.palletNumber,
                                itemCode: itemMasterRow.itemCode
                            };
                            itemCodeArr.push(data);

                            setImmediate(callbackItemMaster);

                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {data: itemCodeArr, message: "Operation Successful.", status: 'success', statusCode: '200'});
                    }
                });
            });
            //
            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';

                res.json(result);
            });
            //
            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'INVENTORY-READ-BARCODE',
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
            // Initialize
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
//Virtual-Invontroy/delete
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualItemStore/action/update-remove/virtual-itemStore/')

        .put(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreArray = req.body.itemStoreArray;
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                async.eachSeries(itemStoreArray, function (elementItemStore, callbackItemStore) {

                    itemStoreModel.findOne({'_id': elementItemStore, 'activeStatus': 3}, function (err, itemStoreRow) {
                        if (err) {

                            callbackItemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            callbackItemStore();
                        } else {

                            itemStoreModel.update(
                                    {'_id': elementItemStore},
                                    {'$set': {"activeStatus": 2, 'modifiedBy': modifiedBy, 'timemodified': timeInInteger}},
                                    function (err) {
                                        if (err) {

                                            callbackItemStore({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            callbackItemStore();
                                        }
                                    });
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }
                });
            });
            //END 
            flowController.on('END', function () {
                //ArrayKey = JSON.stringify(pendingArr)
                dashboardService.createAlert();
                (showConsole) ? console.log('END') : '';
                result = {message: ' Virtual Inventory remove into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'VIRTUAL-INVENTORY-DELETE',
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