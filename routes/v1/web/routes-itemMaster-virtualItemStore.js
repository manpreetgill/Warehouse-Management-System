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
var mongoose = require('mongoose');
//---------------------------------------------------------------------------------------------------------------------------
var virtualItemStoreModel = require('../../../models/mongodb/itemMaster-virtualItemStore/collection-virtualItemStore.js');
var virtualLocationsModel = require('../../../models/mongodb/locationMaster-virtualLocationStore/collection-virtualLocationStore.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
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
//----------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details by ITEM CODE
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItem/inventory/action/read/item/item-code/:warehouseId/')

        .get(function (req, res) {

            var warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            var showConsole = 1;
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                var itemMasterArr = [];
                itemMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404', data: []});
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
            });
            // Get item master data
            flowController.on('1', function (itemMasterData) {
                (showConsole) ? console.log('1') : '';
                var itemMasterArray = [];
                async.eachSeries(itemMasterData, function (elementItemMaster, callbackItemMaster) {

                    itemStoreModel.findOne({'itemMasterId': elementItemMaster._id, 'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemStoreRowM) {
                        if (err) {

                            callbackItemMaster(err);
                        } else if (itemStoreRowM == null) {

                            callbackItemMaster();
                        } else {

                            async.waterfall([

                                function (waterfallcallback) {

                                    itemStoreModel.count({'itemMasterId': elementItemMaster._id, 'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemQuantity) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {
                                            if (itemQuantity == 0) {

                                                callbackItemMaster();
                                            } else {
//                                                if(){
//                                                    waterfallcallback(null, itemQuantity);
//                                                }else{
//                                                    waterfallcallback(null, itemQuantity);
//                                                }
                                                waterfallcallback(null, itemQuantity);
                                            }
                                        }
                                    });
                                },
                                //virtualLocationStoreId
                                function (itemQuantity, waterfallcallback) {

                                    itemStoreModel.findOne({'itemMasterId': elementItemMaster._id, 'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemStoreRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (itemStoreRow == null) {

                                            waterfallcallback(null, itemQuantity, '');
                                        } else {

                                            virtualLocationStoreName = (itemStoreRow.virtualLocationStoreId == 1) ? 'INVENTORY LOSS' : 'INVENTORY DATA ERROR';
                                            waterfallcallback(null, itemQuantity, virtualLocationStoreName);
                                        }
                                    });
                                },
                                // holdingType
                                function (itemQuantity, virtualLocationStoreName, waterfallcallback) {

                                    if (elementItemMaster.holdingType) {

                                        holdingTypesModel.findOne({'_id': elementItemMaster.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                            if (err) {

                                            } else if (holdingTypeRow == null) {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, '');
                                            } else {

                                                holdingType = (holdingTypeRow.name) ? holdingTypeRow.name : '';
                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, itemQuantity, virtualLocationStoreName, '');
                                    }
                                },
                                //dispatchRulesModel
                                function (itemQuantity, virtualLocationStoreName, holdingType, waterfallcallback) {

                                    if (elementItemMaster.dispatchRule) {

                                        dispatchRulesModel.findOne({'_id': elementItemMaster.dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {
                                            if (err) {

                                            } else if (dispatchRuleRow == null) {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, '');
                                            } else {

                                                dispatchRule = (dispatchRuleRow.name) ? dispatchRuleRow.name : '';
                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, itemQuantity, holdingType, virtualLocationStoreName, '');
                                    }
                                },
                                //measurementUnit
                                function (itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, waterfallcallback) {

                                    if (elementItemMaster.measurementUnit) {

                                        measurementUnitsModel.findOne({'_id': elementItemMaster.measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {
                                            if (err) {

                                            } else if (measurementUnitRow == null) {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, '');
                                            } else {

                                                measurementUnit = (measurementUnitRow.name) ? measurementUnitRow.name : '';
                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, '');
                                    }
                                },
                                //category
                                function (itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, waterfallcallback) {

                                    if (elementItemMaster.category) {

                                        itemCategoryModel.findOne({'_id': elementItemMaster.category, 'activeStatus': 1}, function (err, categoryRow) {
                                            if (err) {

                                            } else if (categoryRow == null) {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, '');
                                            } else {
                                                categoryName = (categoryRow.name) ? categoryRow.name : '';
                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, '');
                                    }
                                },
                                //subCategory
                                function (itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, waterfallcallback) {

                                    if (elementItemMaster.subCategory.length !== 0) {

                                        var subCategoryArr = [];
                                        async.eachSeries(elementItemMaster.subCategory, function (elementSubCategory, callbackSubCategory) {

                                            itemSubCategorysModel.findOne({_id: elementSubCategory, activeStatus: 1}, function (err, subCategoryRow) {
                                                if (err) {

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

                                            } else {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr);
                                    }
                                },
                                //handlingUnit
                                function (itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, waterfallcallback) {

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

                                            } else {

                                                waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                                    }
                                },
                                function (itemQuantity, virtualLocationStoreName, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray, waterfallcallback) {

                                    var dataArea = {
                                        itemMasterId: elementItemMaster._id,
                                        itemCode: elementItemMaster.itemCode,
                                        // virtualLocationStoreName: virtualLocationStoreName,
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
                                    callbackItemMaster({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    itemMasterArray.push(result);
                                    callbackItemMaster();
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('end', itemMasterArray);
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            flowController.on('end', function (itemMasterArray) {

                (showConsole) ? console.log('end') : '';
                res.json({data: itemMasterArray, message: "Operation Successful.", status: 'success', statusCode: 304});
            });
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details by SERIAL NUMBER
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItem/inventory/action/read/item/serial-number/:warehouseId/')

        .get(function (req, res) {


            var warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            var showConsole = 1;
            var serialNumberArray = [];

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';

                var itemStoreArray = [];

                itemStoreModel.find({'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemStoresRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoresRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(itemStoresRow, function (elementItemStore, callback) {

                            itemStoreArray.push(elementItemStore);
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                            } else {
                                flowController.emit('1', itemStoreArray);
                            }
                        });
                    }
                });
            });
            flowController.on('1', function (itemStoreArray) {
                (showConsole) ? console.log('1') : '';

                async.eachSeries(itemStoreArray, function (elementItemStore, callback) {

                    async.waterfall([
                        function (waterfallcallback) {
                            console.log('waterfallcallback=1');
                            itemMasterModel.findOne({_id: elementItemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {
                                } else if (itemMasterRow == null) {
                                    waterfallcallback(null, '', '', '', '', '');
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
                                            itemDescription = (itemMasterRow.itemDescription) ? itemMasterRow.itemDescription : "";
                                            priceValue = itemMasterRow.priceValue ? itemMasterRow.priceValue : "";
                                            priceCurrency = itemMasterRow.priceCurrency ? itemMasterRow.priceCurrency : "";
                                            //console.log("itemCode"+itemCode+"==itemDescription"+itemDescription+"====priceValue"+priceValue+"===priceCurrency"+priceCurrency+"===measurementUnit"+measurementUnit)
                                            waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit);
                                        }
                                    });
                                }
                            });
                        },
                        function (itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, waterfallcallback) {
                            console.log('waterfallcallback=4');

                            console.log(elementItemStore.virtualLocationStoreId);
                            virtualLocationsModel.findOne({_id: elementItemStore.virtualLocationStoreId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, virtualLocationRow) {

                                if (err) {// Serverside error

                                    console.log(err);
                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (virtualLocationRow == null) {
                                    console.log("null");
                                    waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, '');
                                } else {

                                    console.log(virtualLocationRow.name);

                                    var virtualLocationStoreName = virtualLocationRow.name ? virtualLocationRow.name : '';
                                    waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName);
                                }
                            });
                        },
                        //
                        //
                        function (itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName, waterfallcallback) {
                            console.log('waterfallcallback=5');

                            if (elementItemStore.previousLocationStoreId) {

                                locationStoreModel.findOne({'_id': elementItemStore.previousLocationStoreId, activeStatus: 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else if (locationStoreRow == null) {

                                        waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName, "");
                                    } else {
                                        var customerAddress = locationStoreRow.customerAddress ? locationStoreRow.customerAddress : "";
                                        waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName, customerAddress);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName, "");
                            }
                        },
                        function (itemCode, itemDescription, priceValue, priceCurrency, measurementUnit, virtualLocationStoreName, customerAddress, waterfallcallback) {
                            console.log('waterfallcallback=result');

                            dataSerialNumber = {
                                itemCode: itemCode,
                                itemMasterId: elementItemStore.itemMasterId,
                                previousLocationStoreId: elementItemStore.previousLocationStoreId,
                                previousLocationStoreName: customerAddress,
                                virtualLocationStoreId: elementItemStore.virtualLocationStoreId,
                                virtualLocationStoreName: virtualLocationStoreName,
                                itemDescription: itemDescription,
                                priceValue: priceValue,
                                priceCurrency: priceCurrency,
                                measurementUnit: measurementUnit,
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
                    ], function (err, dataSerialNumber) {
                        if (err) {

                        } else {

                            serialNumberArray.push(dataSerialNumber);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {
                        flowController.emit('end', serialNumberArray);
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            flowController.on('end', function (serialNumberArray) {

                (showConsole) ? console.log('end') : '';
                res.json({data: serialNumberArray, message: "Operation Successful.", status: 'success', statusCode: 304});
            });
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
//Get details by LOCATION
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItem/inventory/action/read/item/location-store/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();
            //itemStore data
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var uniquevirtualLocationStore = [];

                virtualLocationsModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, virtualItemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualItemStoreRow.length == 0) {
                        `                           `
                        flowController.emit('ERROR', {data: [], message: 'No virtualItemStore locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(virtualItemStoreRow, function (element, callbackDone) {

                            uniquevirtualLocationStore.push({virtualLocationStoreId: String(element._id), name: element.name});
                            setImmediate(callbackDone);
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', uniquevirtualLocationStore);
                            }
                        });
                    }
                });
            });
            //itemStore Qty
            flowController.on('1', function (uniquevirtualLocationStoreArray) {

                (showConsole) ? console.log('1') : '';
                var itemStoreQty = [];

                async.eachSeries(uniquevirtualLocationStoreArray, function (element, callbackDone) {

                    itemStoreModel.aggregate(
                            [{'$match': {'virtualLocationStoreId': element.virtualLocationStoreId, 'activeStatus': 3}}, {'$group': {'_id': '$itemMasterId', quantity: {'$sum': 1}}}
                            ], function (err, result) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {
                            data = {
                                array: result,
                                virtualLocationStoreId: element.virtualLocationStoreId,
                                virtualLocationStoreName: element.name
                            };
                            itemStoreQty.push(data);
                            setImmediate(callbackDone);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', itemStoreQty);
                    }
                });
            });
            flowController.on('2', function (itemStoreQty) {
                (showConsole) ? console.log('2') : '';

                detailsArr = [];
                async.eachSeries(itemStoreQty, function (element, callbackDone) {

                    async.eachSeries(element.array, function (element1, callbackDone1) {

                        itemMasterModel.findOne({_id: element1._id, activeStatus: 1}, function (err, itemMasterRow) {
                            if (err) {

                                callbackDone1({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow == null) {

                                setImmediate(callbackDone1);
                            } else {

                                itemCategoryModel.findOne({_id: itemMasterRow.category, activeStatus: 1}, function (err, itemCategoryRow) {
                                    if (err) {

                                        callbackDone1(err);
                                    } else if (itemCategoryRow == null) {

                                        setImmediate(callbackDone1);
                                    } else {

                                        data = {
                                            itemCode: itemMasterRow.itemCode,
                                            itemDescription: itemMasterRow.itemDescription,
                                            quantity: element1.quantity,
                                            category: itemCategoryRow.name,
                                            virtualLocationStore: element.virtualLocationStoreName
                                        };
                                        detailsArr.push(data);
                                        setImmediate(callbackDone1);
                                    }
                                });

                            }
                        });

                    }, function (err) {
                        if (err) {

                            callbackDone(err);
                        } else {

                            setImmediate(callbackDone);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', detailsArr);
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: 304});

            });
            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // Initialize
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
//Virtual-Invontroy/delete
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualLocation/action/update-remove/virtual-location/')

        .put(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreArray = req.body.itemStoreArray;
            var modifiedBy = req.body.modifiedBy.trim();
            var loggedInUserRole = req.body.loggedInUserRole;
            var module = req.body.module;

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
                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                result = {message: ' Virtual Inventory remove into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
//MOVE  vitual to actual
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/move/virtualItemStore/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var warehouseId = req.body.warehouseId.trim();
            var itemStoreId = req.body.itemStoreId;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var customerAddress = req.body.customerAddress.toUpperCase().trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';

                itemStoreModel.findOne({_id: itemStoreId, warehouseId: warehouseId, activeStatus: 3}, function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow == null) {

                        flowController.emit('ERROR', {message: 'Item not available in warehouse inventory.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', itemStoreRow);
                    }
                });
            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('1', function (itemStore) {

                (showConsole) ? console.log('1') : '';
                locationStoreModel.findOne({customerAddress: customerAddress, warehouseId: warehouseId, activeStatus: 1}, function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'Details of location ' + customerAddress + ' not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        if (locationStoreRow.availability == "A") {

                            var palletArr = [];

                            if (itemStore.previousLocationStoreId == locationStoreRow._id) {

                                async.eachSeries(locationStoreRow.assignedItemStoreId, function (elementItemStore, callbackItemStore) {

                                    itemStoreModel.findOne({_id: elementItemStore, warehouseId: warehouseId, activeStatus: 1}, function (err, itemStoreRow) {
                                        if (err) {

                                            callbackItemStore(err);
                                        } else if (itemStoreRow == null) {

                                            setImmediate(callbackItemStore);
                                        } else {

                                            if (itemStoreRow.palletNumber == itemStore.palletNumber) {

                                                palletArr.push(itemStoreRow.palletNumber);
                                                setImmediate(callbackItemStore);
                                            } else {

                                                setImmediate(callbackItemStore);
                                            }
                                        }
                                    });
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', err);
                                    } else {

                                        //capacity  check
                                        if (palletArr.length >= 1) {

                                            flowController.emit('FINAL', itemStore, locationStoreRow);
                                        } else {

                                            flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                        }
                                    }
                                });
                            } else {

                                if (itemStore.palletNumber) {

                                    flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                } else {

                                    flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                }
                            }
                        } else {

                            flowController.emit('ERROR', {message: 'This Location ' + locationStoreRow.customerAddress + " Availability Blocked So Change Location.", status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            //
            //
            flowController.on('ITEMMASTER', function (itemStore, locationStoreRow) {

                (showConsole) ? console.log('ITEMMASTER') : '';
                itemMasterModel.findOne({'_id': itemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Item Master details not available in system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', itemStore, locationStoreRow, itemMasterRow);
                    }
                });
            });
            //
            //exclusiveStorage and 
            flowController.on('2', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('2') : '';

                var itemMasterId = String(itemMasterRow._id);

                if (locationStoreRow.isReservedForItem === 'YES') {

                    if (locationStoreRow.assignedItemStoreId.indexOf(itemMasterId) == -1) {

                        flowController.emit('ERROR', {message: 'Location is reserved for different item! This item is not allowed to be put.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
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
                                    flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                                } else if (exclusiveItem.length != 0) {
                                    // Exclusive storage available
                                    flowController.emit('ERROR', {message: 'Location already having exclusive storage enabled items! This item not allowed.', status: 'error', statusCode: '404'});
                                } else if (otherItemObject.length != 0 && itemMasterRow.exclusiveStorage == 'YES') {
                                    // Item is self exclusive
                                    flowController.emit('ERROR', {message: 'This item is exclusive so not allowed to be put at shared location!', status: 'error', statusCode: '404'});
                                } else {
                                    // empty location
                                    flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                                }
                            }
                        });
                    } else {

                        flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                    }
                }
            });

            //holdingType
            flowController.on('3', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('3') : '';
                holdingType = locationStoreRow.holdingType;

                if (itemStore.itemSerialNumber) {

                    itemStoreModel.find({'itemSerialNumber': itemStore.itemSerialNumber, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowD) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRowD.length !== 0) {

                            flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Already exist in Actual Inventory.", status: 'error', statusCode: '304'});
                        } else {

                            holdingTypesModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (holdingTypeRow == null) {

                                    flowController.emit('ERROR', {message: 'holdingType data tampered/removed from system!', status: 'error', statusCode: '404'});
                                } else {

                                    holdingTypeName = holdingTypeRow.name;
                                    if (holdingTypeName == 'PALLET') {

                                        flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                                    } else {

                                        flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
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

                                flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                            } else {

                                flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                            }

                        }
                    });
                }
            });
            //
            flowController.on('PALLET', function (itemStore, locationStoreRow, itemMasterRow) {
                (showConsole) ? console.log('PALLET') : '';

                if (locationStoreRow.availableCapacity > 0 || locationStoreRow.availableCapacity == -1) {

                    flowController.emit('1QTY', itemStore, locationStoreRow, itemMasterRow);
                } else {

                    flowController.emit('ERROR', {message: "Available Capacity Full " + locationStoreRow.customerAddress + " In location!", status: 'error', statusCode: '304'});
                }
            });
            //update itemStore 1 QTY  
            flowController.on('1QTY', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('1QTY') : '';

                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);

                lotAddressArray = [];

                itemMasterModel.findOne({'itemCode': itemMasterRow.itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

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

                            var query = {"_id": itemStoreId, warehouseId: warehouseId, activeStatus: 3};
                            var update = {"$set": {lotAddress: newLotAddress, locationStoreId: String(locationStoreRow._id), "previousLocationStoreId": "", virtualLocationStoreId: "", activeStatus: 1}};

                            itemStoreModel.update(query, update, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('itemStoreId', locationStoreRow);
                                }
                            });
                        }
                    });
                });
            });
            //itemStoreId insert in locationStore collection
            flowController.on('itemStoreId', function (locationStoreRow) {

                (showConsole) ? console.log('itemStoreId') : '';

                if (locationStoreRow.availableCapacity == -1)
                    var newAvailableCapacity = locationStoreRow.availableCapacity;
                else
                    var newAvailableCapacity = locationStoreRow.availableCapacity - 1;

                locationStoreModel.update({"customerAddress": customerAddress}, {
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
            //
            //final itemStore update
            flowController.on('FINAL', function (itemStore, locationStoreRow) {

                (showConsole) ? console.log('FINAL') : '';
                itemStoreModel.find({'itemSerialNumber': itemStore.itemSerialNumber, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowD) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRowD.length !== 0) {

                        flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Already exist in Actual Inventory.", status: 'error', statusCode: '304'});
                    } else {

                        var query = {"_id": itemStoreId, warehouseId: warehouseId, activeStatus: 3};
                        var update = {"$set": {"previousLocationStoreId": "", virtualLocationStoreId: "", locationStoreId: locationStoreRow._id, activeStatus: 1}};

                        itemStoreModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOCATION');
                            }
                        });
                    }
                });

            });
            //
            //LOCATION update
            flowController.on('LOCATION', function () {

                (showConsole) ? console.log('LOCATION') : '';

                var query = {"customerAddress": customerAddress};
                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}};

                locationStoreModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }
                });
            });
            //"$addToSet": {"assignedItemStoreId": itemStoreId},
            //"$set": { "availableCapacity": parseInt(newAvailableCapacity)}
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function () {

                (showConsole) ? console.log('END') : '';
                res.json({message: "Operation Successful.", status: 'success', statusCode: 200});
            });
            flowController.emit('START');
        });
//
//              
//------------------------------------------------------------------------------------------------------------------------------------------------------
// EDIT Virtual Item Store
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/update/virtualItemStore/')

        .patch(function (req, res) {
            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var itemStoreId = req.body.itemStoreId.trim();
            var randomFields = req.body.randomFields;
            var manufacturingDate = req.body.manufacturingDate;
            var virtualLocationStoreId = req.body.virtualLocationStoreId;
            var palletNumber = req.body.palletNumber;
            var expiryDate = req.body.expiryDate;
            var flowController = new EventEmitter();
            // START
            flowController.on('START', function () {

                itemStoreModel.findOne({_id: itemStoreId, 'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow == null) {

                        flowController.emit('ERROR', {message: "Virtual Item's Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        itemStoreRow.palletNumber = (palletNumber) ? palletNumber : itemStoreRow.palletNumber;
                        itemStoreRow.virtualLocationStoreId = (virtualLocationStoreId) ? virtualLocationStoreId : itemStoreRow.virtualLocationStoreId;
                        itemStoreRow.randomFields = (randomFields) ? randomFields : itemStoreRow.randomFields;
                        itemStoreRow.manufacturingDate = manufacturingDate ? manufacturingDate : itemStoreRow.manufacturingDate;
                        itemStoreRow.expiryDate = expiryDate ? expiryDate : itemStoreRow.expiryDate;

                        itemStoreRow.save(function (err, returnData) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", status: 'success', statusCode: 200});
                            }
                        });

                    }
                });
            });
            flowController.on('END', function (result) {
                dashboardService.createAlert();
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
//------------------------------------------------------------------------------------------------------------------------------------------------------
//MOVE  vitual to actual
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/move/virtualItemStore/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var warehouseId = req.body.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var itemStoreId = req.body.itemStoreId;
            var locationStoreId = req.body.locationStoreId;

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';

                itemStoreModel.findOne({_id: itemStoreId, warehouseId: warehouseId, activeStatus: 3}, function (err, itemStoreRow) {
                    if (err) {

                    } else if (itemStoreRow == null) {

                    } else {

                        flowController.emit('1', itemStoreRow);
                    }
                });
            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('1', function (itemStore) {

                (showConsole) ? console.log('1') : '';
                locationStoreModel.findOne({_id: locationStoreId, warehouseId: warehouseId, activeStatus: 1}, function (err, locationStoreRow) {
                    if (err) {

                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'LocationMaster data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        if (locationStoreRow.availability == "A") {

                            var palletArr = [];

                            if (itemStore.previousLocationStoreId == locationStoreId) {

                                async.eachSeries(locationStoreRow.assignedItemStoreId, function (elementItemStore, callbackItemStore) {

                                    itemStoreModel.findOne({_id: elementItemStore, warehouseId: warehouseId, activeStatus: 1}, function (err, itemStoreRow) {
                                        if (err) {

                                            callbackItemStore(err);
                                        } else if (itemStoreRow == null) {

                                            setImmediate(callbackItemStore);
                                        } else {

                                            if (itemStoreRow.palletNumber == itemStore.palletNumber) {

                                                palletArr.push(itemStoreRow.palletNumber);
                                                setImmediate(callbackItemStore);
                                            } else {

                                                setImmediate(callbackItemStore);
                                            }
                                        }
                                    });
                                }, function (err) {
                                    if (err) {

                                    } else {

                                        //capacity  check
                                        if (palletArr.length >= 1) {

                                            flowController.emit('FINAL', itemStore);
                                        } else {

                                            flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                        }
                                    }
                                });
                            } else {

                                if (itemStore.palletNumber) {

                                    flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                } else {

                                    flowController.emit('ITEMMASTER', itemStore, locationStoreRow);
                                }
                            }
                        } else {

                            flowController.emit('ERROR', {message: 'This Location ' + locationStoreRow.customerAddress + " Availability Blocked So Change Location.", status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            //
            //
            flowController.on('ITEMMASTER', function (itemStore, locationStoreRow) {

                (showConsole) ? console.log('ITEMMASTER') : '';
                itemMasterModel.findOne({'_id': itemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow == null) {

                        flowController.emit('ERROR', {message: 'itemMaster data tampered/removed from system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', itemStore, locationStoreRow, itemMasterRow);
                    }
                });
            });
            //
            //exclusiveStorage and 
            flowController.on('2', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('2') : '';

                var itemMasterId = String(itemMasterRow._id);

                if (locationStoreRow.isReservedForItem === 'YES') {

                    if (locationStoreRow.assignedItemStoreId.indexOf(itemMasterId) == -1) {

                        flowController.emit('ERROR', {message: 'Location is reserved for different item! This item is not allowed to be put.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
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
                                    flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                                } else if (exclusiveItem.length != 0) {
                                    // Exclusive storage available
                                    flowController.emit('ERROR', {message: 'Location already having exclusive storage enabled items! This item not allowed.', status: 'error', statusCode: '404'});
                                } else if (otherItemObject.length != 0 && itemMasterRow.exclusiveStorage == 'YES') {
                                    // Item is self exclusive
                                    flowController.emit('ERROR', {message: 'This item is exclusive so not allowed to be put at shared location!', status: 'error', statusCode: '404'});
                                } else {
                                    // empty location
                                    flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                                }
                            }
                        });
                    } else {

                        flowController.emit('3', itemStore, locationStoreRow, itemMasterRow);
                    }
                }
            });

            //holdingType
            flowController.on('3', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('3') : '';
                holdingType = locationStoreRow.holdingType;

                if (itemStore.itemSerialNumber) {

                    itemStoreModel.find({'itemSerialNumber': itemStore.itemSerialNumber, 'activeStatus': 1}).lean().exec(function (err, itemStoreRowD) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRowD.length !== 0) {

                            flowController.emit('ERROR', {message: "Item's Store itemSerialNumber Already exist in Actual Inventory.", status: 'error', statusCode: '304'});
                        } else {

                            holdingTypesModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (holdingTypeRow == null) {

                                    flowController.emit('ERROR', {message: 'holdingType data tampered/removed from system!', status: 'error', statusCode: '404'});
                                } else {

                                    holdingTypeName = holdingTypeRow.name;
                                    if (holdingTypeName == 'PALLET') {

                                        flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                                    } else {

                                        flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
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

                                flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                            } else {

                                flowController.emit('PALLET', itemStore, locationStoreRow, itemMasterRow);
                            }

                        }
                    });
                }
            });
            //
            flowController.on('PALLET', function (itemStore, locationStoreRow, itemMasterRow) {
                (showConsole) ? console.log('PALLET') : '';

                if (locationStoreRow.availableCapacity > 0) {

                    flowController.emit('1QTY', itemStore, locationStoreRow, itemMasterRow);
                } else {

                    flowController.emit('ERROR', {message: "Available Capacity Full " + locationStoreRow.customerAddress + " In location!", status: 'error', statusCode: '304'});
                }
            });
            //update itemStore 1 QTY  
            flowController.on('1QTY', function (itemStore, locationStoreRow, itemMasterRow) {

                (showConsole) ? console.log('1QTY') : '';

                var dateNew = moment(new Date()).format('DDMMYY');
                var rgx = new RegExp("^" + dateNew);

                lotAddressArray = [];

                itemMasterModel.findOne({'itemCode': itemMasterRow.itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

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

                            var query = {"_id": itemStoreId, warehouseId: warehouseId, activeStatus: 3};
                            var update = {"$set": {lotAddress: newLotAddress, locationStoreId: locationStoreRow._id, "previousLocationStoreId": "", virtualLocationStoreId: "", activeStatus: 1}};

                            itemStoreModel.update(query, update, function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('itemStoreId', locationStoreRow);
                                }
                            });
                        }
                    });
                });
            });
            //itemStoreId insert in locationStore collection
            flowController.on('itemStoreId', function (locationStoreRow) {

                (showConsole) ? console.log('itemStoreId') : '';

                newAvailableCapacity = locationStoreRow.availableCapacity - 1;
                locationStoreModel.update({"_id": locationStoreId}, {
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
            //
            //final itemStore update
            flowController.on('FINAL', function () {

                (showConsole) ? console.log('FINAL') : '';

                var query = {"_id": itemStoreId, warehouseId: warehouseId, activeStatus: 3};
                var update = {"$set": {"previousLocationStoreId": "", virtualLocationStoreId: "", activeStatus: 1}};

                itemStoreModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('LOCATION');
                    }
                });
            });
            //
            //LOCATION update
            flowController.on('LOCATION', function () {

                (showConsole) ? console.log('LOCATION') : '';

                var query = {"_id": locationStoreId};
                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}};

                locationStoreModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }
                });
            });
            //"$addToSet": {"assignedItemStoreId": itemStoreId},
            //"$set": { "availableCapacity": parseInt(newAvailableCapacity)}
            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function () {
                dashboardService.createAlert();
                (showConsole) ? console.log('END') : '';
                res.json({message: "Operation Successful.", status: 'success', statusCode: 200});
            });
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------
//GET API
//-------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/read/virtualItemStore/:warehouseId/:itemStoreId')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var itemStoreId = req.params.itemStoreId.trim();

            var flowController = new EventEmitter();

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log("START") : '';

                itemStoreModel.findOne({'_id': itemStoreId, 'warehouseId': warehouseId, 'activeStatus': 3}, function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow == null) {

                        flowController.emit('ERROR', {message: "Item's Store data missing! Data tampered/removed from system.", data: [], status: 'error', statusCode: 304});
                    } else {

                        var data = {
                            warehouseId: itemStoreRow.warehouseId,
                            itemMasterId: itemStoreRow.itemMasterId,
                            previousLocationStoreId: itemStoreRow.previousLocationStoreId,
                            virtualLocationStoreId: itemStoreRow.virtualLocationStoreId,
                            lotAddress: itemStoreRow.lotAddress,
                            palletNumber: itemStoreRow.palletNumber,
                            itemQuantity: itemStoreRow.itemQuantity,
                            itemSerialNumber: itemStoreRow.itemSerialNumber,
                            randomFields: itemStoreRow.randomFields,
                            manufacturingDate: itemStoreRow.manufacturingDate,
                            expiryDate: itemStoreRow.expiryDate,
                            exclusiveStorage: itemStoreRow.exclusiveStorage,
                            locationStoreId: itemStoreRow.locationStoreId

                        };
                        flowController.emit('END', data);
                    }
                });
            });

            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            flowController.on('END', function (virtualItemStore) {

                (showConsole) ? console.log('end') : '';
                res.json({data: virtualItemStore, message: "Operation Successful.", status: 'success', statusCode: 200});
            });
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------------------------------------
// Get details of single item
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/read/Update/virtualItemStore/:itemMasterId/:itemStoreId/:virtualLocationStoreId/')

        .get(function (req, res) {

            var itemMasterId = req.params.itemMasterId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreId = req.params.itemStoreId.trim();

            var virtualLocationStoreId = req.params.virtualLocationStoreId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemMasterModel.findOne({'_id': itemMasterId, 'activeStatus': 1}, function (err, itemMasterRow) {

                    itemStoreModel.findOne({'_id': itemStoreId, 'virtualLocationStoreId': virtualLocationStoreId, 'activeStatus': 3}, function (err, itemStoreRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (itemStoreRow == null) {

                            flowController.emit('ERROR', {message: "Item's Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                        } else {

                            var arrItemStore = [];
                            itemStoreModel.count({'itemMasterId': itemMasterId, 'activeStatus': 3}, function (err, itemCount) {
                                if (err) {

                                    flowController.emit('ERROR', err);
                                } else {

                                    var data = {
                                        itemCode: itemMasterRow.itemCode,
                                        id: itemMasterRow._id,
                                        virtualLocationStoreId: itemStoreRow.virtualLocationStoreId,
                                        itemQuantity: itemCount,
                                        customPalletNumber: (itemStoreRow.customPalletNumber) ? itemStoreRow.customPalletNumber : "",
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
                    });
                });
            });
            flowController.on('END', function (result) {
                dashboardService.createAlert();
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
// virtual Location Store pallet-number get                            
//------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/virtualItemStore/action/read/virtual/virtualItemStore/pallet-number/:virtualLocationStoreId/')

        .get(function (req, res) {

            var virtualLocationStoreId = req.params.virtualLocationStoreId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var itemStoreArr = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemStoreModel.find({virtualLocationStoreId: virtualLocationStoreId, 'activeStatus': 3}, function (err, itemStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "virtual Location Store data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(itemStoreRow, function (element, callbackDone) {

                            itemStoreArr.push(element.palletNumber);
                            setImmediate(callbackDone);
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
module.exports = router;