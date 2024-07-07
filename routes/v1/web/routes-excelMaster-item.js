var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var mongoXlsx = require('mongo-xlsx');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var async = require('async');
var multer = require('multer');
var os = require('os');
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var measurementUnitModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
//ITEM MASTER : Import
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/manual-import/')

        .post(function (req, res, next) {
            // Multar based file upload in Binary chunks
            multer({
                dest: os.tmpdir() + '/',
                limits: {files: 1}
            }, next());
            // Multar based file upload in Binary chunks
        }, function (req, res) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var fileXLS = req.files.fileXLS;

            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();

            var path = "./public/files/master/IM_" + moment(new Date()).format('DDMMYYYYHHMMSS') + '.xlsx';

            var directory = "./public/files/master/";
            (!fs.existsSync(directory)) ? fs.mkdirSync(directory) : '';

            // Store file to master folder
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                require("fs").writeFile(path, fileXLS.data, 'binary', function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        var model = null;

                        mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {

                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('0', mongoData);
                            }
                        });
                    }
                });
            });
            //
            // Initial validation
            flowController.on('0', function (mongoData) {

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(path, function () {
                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'error', statusCode: '403'});
                    });
                } else {

                    flowController.emit('1', mongoData);
                }
            });

            // Update header keys and store file into it
            flowController.on('1', function (mongoData) {

                (consoleLog) ? console.log('1') : '';

                var updatedDesktopFile = [];

                async.eachSeries(mongoData, function (jsonObject, callback) {

                    var obj = JSON.stringify(jsonObject);

                    obj = obj.replace(/Item Code/g, 'itemCode');
                    obj = obj.replace(/Item Description/g, 'itemDescription');
                    obj = obj.replace(/Category/g, 'category');
                    obj = obj.replace(/Sub Category-1/g, 'subCategory1');
                    obj = obj.replace(/Sub Category-2/g, 'subCategory2');
                    obj = obj.replace(/Sub Category-3/g, 'subCategory3');
                    obj = obj.replace(/Dispatch Rule/g, 'dispatchRule');
                    obj = obj.replace(/Item Sr No/g, 'itemSerialNumber');
                    obj = obj.replace(/Auto Assign Open Location/g, 'overflowAutoAssign');
                    obj = obj.replace(/Exclusive Storage/g, 'exclusiveStorage');
                    obj = obj.replace(/Price/g, 'price');
                    obj = obj.replace(/Currency/g, 'currency');
                    obj = obj.replace(/Manufacturing Date/g, 'manufacturingDate');
                    obj = obj.replace(/Expiry Date/g, 'expiryDate');
                    obj = obj.replace(/Alert Date/g, 'alertDate');
                    obj = obj.replace(/Measurement Unit/g, 'measurementUnit');
                    obj = obj.replace(/Holding Type/g, 'holdingType');
                    obj = obj.replace(/Material Handling Unit-1/g, 'materialHandlingUnit1');
                    obj = obj.replace(/Material Handling Unit-2/g, 'materialHandlingUnit2');
                    obj = obj.replace(/Material Handling Unit-3/g, 'materialHandlingUnit3');
                    obj = obj.replace(/Alert Days/g, 'alertDays');
                    obj = obj.replace(/Alert From/g, 'alertFrom');
                    obj = obj.replace(/Height/g, 'height');
                    obj = obj.replace(/Width/g, 'width');
                    obj = obj.replace(/Length/g, 'length');
                    obj = obj.replace(/Diameter/g, 'diameter');
                    obj = obj.replace(/Volume/g, 'volume');
                    obj = obj.replace(/Weight/g, 'weight');

                    var newObject = JSON.parse(obj);

                    updatedDesktopFile.push(newObject);

                    setImmediate(callback);

                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '404'});
                    else
                        flowController.emit('2', updatedDesktopFile);
                });
            });

            // Check if item already exist
            flowController.on('2', function (excelData) {

                (consoleLog) ? console.log('2') : '';

                var validationErrorArray = [];

                async.eachSeries(excelData, function (element, callback) {

                    itemMasterModel.findOne({'itemCode': element.itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {
                        if (err) {

                            validationErrorArray.push(err);
                            setImmediate(callback);
                        } else if (itemMasterRow != null) {

                            validationErrorArray.push({message: 'Item master for Material ' + element.itemCode + ' already exist!', status: 'error', statusCode: 304});
                            setImmediate(callback);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('3', excelData);
                    }
                });
            });

            // Get/Add category & set to respective item
            flowController.on('3', function (excelData) {

                (consoleLog) ? console.log('3') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var category = element.category.toUpperCase();

                    itemCategorysModel.findOne({'name': category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                        if (err) {

                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (itemCategoryRow == null) {

                            var itemCategorys = new itemCategorysModel();

                            itemCategorys.warehouseId = warehouseId;
                            itemCategorys.name = category;
                            itemCategorys.timeCreated = timeInInteger;

                            itemCategorys.save(function (err, itemCategoryDetails) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    element.category = String(itemCategoryDetails._id);
                                    updatedExcelData.push(element);
                                    setImmediate(callback);
                                }
                            });
                        } else {

                            element.category = String(itemCategoryRow._id);
                            updatedExcelData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('4', updatedExcelData);

                });
            });

            // Get/Add sub-category & set to respective item 
            flowController.on('4', function (excelData) {

                (consoleLog) ? console.log('4') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var subCategory = [];

                    var array = [];

                    (element.subCategory1) ? array.push(element.subCategory1.toUpperCase()) : '';
                    (element.subCategory2) ? array.push(element.subCategory2.toUpperCase()) : '';
                    (element.subCategory3) ? array.push(element.subCategory3.toUpperCase()) : '';

                    if (array.length === 0) {

                        element.subCategory = [];
                        updatedExcelData.push(element);
                        setImmediate(callback);
                    } else {

                        async.eachSeries(array, function (element2, callback2) {

                            itemSubCategorysModel.findOne({'name': element2, 'activeStatus': 1}, function (err, itemSubCategorysRow) {

                                if (err) {

                                    callback2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (itemSubCategorysRow == null) {

                                    var itemSubCategorys = new itemSubCategorysModel();

                                    itemSubCategorys.itemCategoryId = element.category;
                                    itemSubCategorys.name = element2;
                                    itemSubCategorys.timeCreated = timeInInteger;

                                    itemSubCategorys.save(function (err, itemSubCategoryDetails) {

                                        if (err) {

                                            callback({message: "Unable to configure! Try again after some time.", status: 'error', statusCode: '500'});
                                        } else {

                                            subCategory.push(String(itemSubCategoryDetails._id));
                                            setImmediate(callback2);
                                        }
                                    });
                                } else {

                                    subCategory.push(String(itemSubCategorysRow._id));
                                    setImmediate(callback2);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                callback(err);
                            } else {

                                element.subCategory = subCategory;
                                updatedExcelData.push(element);
                                setImmediate(callback);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('5', updatedExcelData);
                    }
                });
            });

            // Get/Add dispatch-rule & set to respective item
            flowController.on('5', function (excelData) {

                (consoleLog) ? console.log('5') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var dispatchRule = element.dispatchRule.toUpperCase();

                    dispatchRuleModel.findOne({'name': dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (dispatchRuleRow == null) {

                            var dispatchRules = new dispatchRuleModel();

                            dispatchRules.warehouseId = warehouseId;
                            dispatchRules.name = dispatchRule;
                            dispatchRules.timeCreated = timeInInteger;

                            dispatchRules.save(function (err, dispatchRulesDetails) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    element.dispatchRule = String(dispatchRulesDetails._id);
                                    updatedExcelData.push(element);
                                    setImmediate(callback);
                                }
                            });
                        } else {

                            element.dispatchRule = String(dispatchRuleRow._id);
                            updatedExcelData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('6', updatedExcelData);
                    }
                });
            });

            // Get/Add measurement-unit & set to respective item
            flowController.on('6', function (excelData) {

                (consoleLog) ? console.log('6') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var measurementUnit = element.measurementUnit.toUpperCase();

                    measurementUnitModel.findOne({'name': measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (measurementUnitRow == null) {

                            var measurementUnits = new measurementUnitModel(); // Storing instance of measurementUnits collection

                            measurementUnits.warehouseId = warehouseId; // Setting data to model
                            measurementUnits.name = measurementUnit; // Setting data to model
                            measurementUnits.timeCreated = timeInInteger;

                            measurementUnits.save(function (err, measurementUnitDetails) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    element.measurementUnit = String(measurementUnitDetails._id);
                                    updatedExcelData.push(element);
                                    setImmediate(callback);
                                }
                            });
                        } else {

                            element.measurementUnit = String(measurementUnitRow._id);
                            updatedExcelData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('7', updatedExcelData);
                    }
                });
            });

            // Get/Add holding-type & set to respective item
            flowController.on('7', function (excelData) {

                (consoleLog) ? console.log('7') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var holdingType = element.holdingType.toUpperCase();

                    holdingTypeModel.findOne({'name': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (holdingTypeRow == null) {

                            var holdingTypes = new holdingTypeModel();

                            holdingTypes.warehouseId = warehouseId;
                            holdingTypes.name = holdingType;
                            holdingTypes.timeCreated = timeInInteger;

                            holdingTypes.save(function (err, holdingTypeDetails) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    element.holdingType = String(holdingTypeDetails._id);
                                    updatedExcelData.push(element);
                                    setImmediate(callback);
                                }
                            });
                        } else {

                            element.holdingType = String(holdingTypeRow._id);
                            updatedExcelData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('8', updatedExcelData);
                    }
                });
            });

            // Get/Add material-handling-unit & set to respective item
            flowController.on('8', function (excelData) {

                (consoleLog) ? console.log('8') : '';

                updatedExcelData = [];

                async.eachSeries(excelData, function (element, callback) {

                    var materialHandlingUnit = [];

                    var array = [];

                    (element.materialHandlingUnit1) ? array.push(element.materialHandlingUnit1.toUpperCase()) : '';
                    (element.materialHandlingUnit2) ? array.push(element.materialHandlingUnit2.toUpperCase()) : '';
                    (element.materialHandlingUnit3) ? array.push(element.materialHandlingUnit3.toUpperCase()) : '';

                    if (array.length === 0) {

                        element.materialHandlingUnit = [];
                        updatedExcelData.push(element);
                        setImmediate(callback);
                    } else {

                        async.eachSeries(array, function (element2, callback2) {

                            materialHandlingMasterModel.findOne({'name': element2, 'activeStatus': 1}, function (err, materialHandlingMasterRow) {

                                if (err) {

                                    callback2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (materialHandlingMasterRow == null) {

                                    var newMaterialHandlingMaster = new materialHandlingMasterModel();

                                    newMaterialHandlingMaster.warehouseId = warehouseId;
                                    newMaterialHandlingMaster.name = element2; // Name of material handling unit
                                    newMaterialHandlingMaster.quantity = 1; // Available quantity of material handling unit
                                    newMaterialHandlingMaster.availableQuantity = 1; // Once assigned to areas/zone the quantity will get decreased
                                    newMaterialHandlingMaster.timeCreated = timeInInteger;
                                    newMaterialHandlingMaster.createdBy = createdBy;

                                    newMaterialHandlingMaster.save(function (err, materialHandlingMasterDetails) {

                                        if (err) {

                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            materialHandlingUnit.push(String(materialHandlingMasterDetails._id));
                                            setImmediate(callback2);
                                        }
                                    });
                                } else {

                                    materialHandlingUnit.push(String(materialHandlingMasterRow._id));
                                    setImmediate(callback2);
                                }
                            });
                        }, function (err) {
                            if (err) {

                                callback(err);
                            } else {

                                element.materialHandlingUnit = materialHandlingUnit;
                                updatedExcelData.push(element);
                                setImmediate(callback);
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('9', updatedExcelData);
                    }
                });
            });

            // Insert item into item master first
            flowController.on('9', function (excelData) {

                (consoleLog) ? console.log('9') : '';

                async.eachSeries(excelData, function (element, callback) {

                    var itemMasterRow = new itemMasterModel();

                    var itemSystemSpecification = [];

                    var itemSpecification = {
                        itemStatus: "ACTIVE",
                        type: "Box",
                        stockCountFrequency: "",
                        stockCountQuantity: "",
                        autoStockCount: "NO",
                        maxInventoryAlert: "",
                        minInventoryAlert: "",
                        supersededItemNumber: "",
                        diameter: "",
                        volume: "",
                        Width: "",
                        height: "",
                        length: "",
                        weight: ""
                    };

                    itemSystemSpecification.push(itemSpecification);

                    itemMasterRow.warehouseId = warehouseId;
                    itemMasterRow.itemCode = element.itemCode;
                    itemMasterRow.itemSerialNumber = 'YES';
                    itemMasterRow.itemDescription = element.itemDescription;
                    itemMasterRow.category = element.category;
                    itemMasterRow.subCategory = element.subCategory;
                    itemMasterRow.dispatchRule = element.dispatchRule;
                    itemMasterRow.measurementUnit = element.measurementUnit;
                    itemMasterRow.itemSerialNumber = element.itemSerialNumber;
                    itemMasterRow.overflowAutoAssign = element.overflowAutoAssign;
                    itemMasterRow.exclusiveStorage = element.exclusiveStorage;
                    itemMasterRow.image = "/images/item/default.jpg";
                    itemMasterRow.priceValue = (element.price) ? element.price : 0;
                    itemMasterRow.priceCurrency = element.currency;
                    itemMasterRow.holdingType = element.holdingType;
                    itemMasterRow.manufacturingDate = element.manufacturingDate;
                    itemMasterRow.handlingUnit = element.materialHandlingUnit;
                    itemMasterRow.expiryDate = element.expiryDate;
                    itemMasterRow.alertDate = element.alertDate;
                    itemMasterRow.alertDays = element.alertDays;
                    itemMasterRow.from = element.alertFrom;
                    itemMasterRow.itemSystemSpecification = itemSystemSpecification;
                    itemMasterRow.createdBy = createdBy;
                    itemMasterRow.timeCreated = timeInInteger;

                    itemMasterRow.save(function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            setImmediate(callback);
                        }
                    });

                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'ERROR', statusCode: '404'});
                    } else {

                        flowController.emit('END', {message: 'File imported! Item master is ready for use.', status: 'success', statusCode: '200'});
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
                    MODULE: 'IMPORT-ITEM MASTER-ADD',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });

                require("fs").unlink(path, function () {
                    console.log('Item master import file removed');
                });
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;