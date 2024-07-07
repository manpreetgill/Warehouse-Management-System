var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var mongoXlsx = require('mongo-xlsx');
var MagicIncrement = require('magic-increment');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var async = require('async');
var multer = require('multer');
var os = require('os');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/aider';
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var measurementUnitModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMasterModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
//IMPORT EXPORT INVENTORY : Import
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/inventory/manual-import/')

        .post(function (req, res, next) {
            // Multar based file upload in Binary chunks
            multer({
                dest: os.tmpdir() + '/',
                limits: {files: 1}
            }, next());
            // Multar based file upload in Binary chunks
        }, function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var fileXLS = req.files.fileXLS;

            var createdBy = req.body.createdBy.trim();

            var date = moment(new Date()).format('DDMMYYYYHHMMSS');

            var path = "./public/files/inventory/upload/IN_" + date + ".xlsx";

            var directories = ["./public/files/inventory/", "./public/files/inventory/upload/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();
            //
            // Change the 
            flowController.on('START', function () {

                (showConsole) ? console.log('INVENTORY-START') : '';

                require("fs").writeFile(path, fileXLS.data, 'binary', function (err) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var model = null;

                        mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', mongoData);
                            }
                        });
                    }
                });
            });
            //
            // Initial validation
            flowController.on('1', function (mongoData) {

                (showConsole) ? console.log('INVENTORY-1') : '';

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(path, function () {
                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});
                    });
                } else {

                    flowController.emit('2', mongoData);
                }
            });
            //
            // Replace the keys from excel object with server side keys
            flowController.on('2', function (mongoData) {

                (showConsole) ? console.log('INVENTORY-2') : '';

                var updatedExcelKeysArray = [];

                async.eachSeries(mongoData, function (element, callback) {

                    var obj = JSON.stringify(element);

                    obj = obj.replace(/Batch/g, 'batch');
                    obj = obj.replace(/BoxType/g, 'boxType');
                    obj = obj.replace(/BoxNo/g, 'boxNo');
                    obj = obj.replace(/NetWeight/g, 'netWeight');
                    obj = obj.replace(/Pieces/g, 'pieces');
                    obj = obj.replace(/PalletType/g, 'palletType');
                    obj = obj.replace(/PalletSize/g, 'palletSize');
                    obj = obj.replace(/PalletNo/g, 'palletNo');
                    obj = obj.replace(/CustomPalletNumber/g, 'customPalletNumber');
                    obj = obj.replace(/Material/g, 'material');
                    obj = obj.replace(/Rack/g, 'rack');
                    obj = obj.replace(/SalesDocument/g, 'salesDocument');
                    obj = obj.replace(/NetWeightinLBS/g, 'netWeightinLBS'); // NO CHANGE ITS CORRECT
                    obj = obj.replace(/GrossWeight/g, 'grossWeight');
                    obj = obj.replace(/CreatedOn/g, 'createdOn');
                    obj = obj.replace(/Name1/g, 'name1');
                    obj = obj.replace(/MaterialDescription/g, 'materialDescription');
                    obj = obj.replace(/PurchaseOrderNumber/g, 'purchaseOrderNumber');
                    obj = obj.replace(/CustomerMaterialNumber/g, 'customerMaterialNumber');
                    obj = obj.replace(/SpecificLotno/g, 'specificLotNo');
                    obj = obj.replace(/GrossWeightInLbs/g, 'grossWeightInLbs');
                    obj = obj.replace(/TareWeightinLBs/g, 'tareWeightInLbs');

                    var newObject = JSON.parse(obj);
                    // Non compulsary
                    newObject.hasOwnProperty('salesDocument') ? '' : newObject.salesDocument = '';
                    newObject.hasOwnProperty('name1') ? '' : newObject.name1 = '';
                    newObject.hasOwnProperty('materialDescription') ? '' : newObject.materialDescription = '';
                    newObject.hasOwnProperty('purchaseOrderNumber') ? '' : newObject.purchaseOrderNumber = '';
                    newObject.hasOwnProperty('customerMaterialNumber') ? '' : newObject.customerMaterialNumber = '';
                    newObject.hasOwnProperty('specificLotNo') ? '' : newObject.specificLotNo = '';

                    //Compulsary for further processing
                    newObject.hasOwnProperty('palletNo') ? '' : newObject.palletNo = '';
                    newObject.hasOwnProperty('customPalletNumber') ? '' : newObject.customPalletNumber = '';

                    updatedExcelKeysArray.push(newObject);

                    setImmediate(callback);
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', updatedExcelKeysArray);
                    }
                });
            });
            //
            // Get all pallet/box/any holding type details
            flowController.on('3', function (updatedExcelKeysArray) {

                (showConsole) ? console.log('INVENTORY-3') : '';

                holdingTypeModel.findOne({'name': 'PALLET', 'activeStatus': 1}, function (err, holdingTypePalletRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR! ' + err, status: 'error', statusCode: '500'});
                    } else if (holdingTypePalletRow == null) {

                        flowController.emit('ERROR', {message: 'Holding type details for PALLET not available! Add required holding types first.', status: 'error', statusCode: '500'});
                    } else {

                        holdingTypeModel.findOne({'name': 'BOX', 'activeStatus': 1}, function (err, holdingTypeBoxRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR! ' + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypeBoxRow == null) {

                                flowController.emit('ERROR', {message: 'Holding type details for BOX not available! Add required holding types first.', status: 'error', statusCode: '500'});
                            } else {

                                holdingTypeModel.findOne({'name': 'ANY', 'activeStatus': 1}, function (err, holdingTypeAnyRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR! ' + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypePalletRow == null) {

                                        flowController.emit('ERROR', {message: 'Holding type details for ANY not available! Add required holding types first.', status: 'error', statusCode: '500'});
                                    } else {

                                        holdingType = {};
                                        holdingType.palletId = holdingTypePalletRow._id;
                                        holdingType.boxId = holdingTypeBoxRow._id;
                                        holdingType.anyId = holdingTypeAnyRow._id;

                                        flowController.emit('4', holdingType, updatedExcelKeysArray);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Prerequisite Validation
            flowController.on('4', function (holdingTypeObject, updatedExcelKeysArray) {

                (showConsole) ? console.log('INVENTORY-4') : '';

                customerAddressArray = [];
                palletNumberArray = [];
                customPalletNumberArray = [];
                itemCodeArray = [];

                allowedPalletTypes = ['F', 'L', 'H', 'O'];
                allowedPalletSizes = ['A', 'B', 'C'];

                var locations = {};

                var validationErrorArray = [];

                var count = 1;

                async.eachSeries(updatedExcelKeysArray, function (element, callback) {

                    count++;
                    console.log('line No: ' + count);

                    if (!element.batch) {

                        validationErrorArray.push({message: "Batch can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.boxNo) {

                        validationErrorArray.push({message: "Box No. can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (customerAddressArray.indexOf(element.boxNo) > -1) {

                        validationErrorArray.push({message: "Box No. " + element.boxNo + " exists more than once in file, duplication not allowed! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.boxType) {

                        validationErrorArray.push({message: "Box Type can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.netWeight) {

                        validationErrorArray.push({message: "Net Weight can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (element.pieces == null) {

                        validationErrorArray.push({message: "Pieces can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.material) {

                        validationErrorArray.push({message: "Material can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.rack) {

                        validationErrorArray.push({message: "Rack field can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (element.grossWeight == null) {

                        validationErrorArray.push({message: "Gross Weight can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (element.netWeightinLBS == null) {

                        validationErrorArray.push({message: "Net Weight in Lbs can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.createdOn) {

                        validationErrorArray.push({message: "Created on can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (element.grossWeightInLbs == null) {

                        validationErrorArray.push({message: "Gross Weight in Lbs can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (element.tareWeightInLbs == null) {

                        validationErrorArray.push({message: "Tare weight in LBs can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else {

                        var timeStamp = ((parseInt(element.createdOn) - 25569) * 86400) * 1000;
                        var newCreatedOn = moment(timeStamp).format('DD/MM/YY');
                        element.createdOn = newCreatedOn;
                        var itemCode = element.material;

                        locationStoreModel.findOne({'customerAddress': element.rack, activeStatus: 1}, function (err, locationStoreRow) {
                            if (err) {

                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR WHILE GETTING DETAILS OF LOCATION ' + element.rack + '! Error: ' + err});
                                setImmediate(callback);
                            } else if (locationStoreRow == null) {

                                validationErrorArray.push({message: 'Location ' + element.rack + ' not found in warehouse!'});
                                setImmediate(callback);
                            } else {

                                itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMasterRow) {
                                    if (err) {

                                        validationErrorArray.push({message: 'ERROR OCCURRED WHILE GETTING DETAILS OF ITEM MASTER ' + err});
                                        setImmediate(callback);
                                    } else if (itemMasterRow == null) {

                                        validationErrorArray.push({message: 'Details of Item code ' + itemCode + ' not available in Item Master.'});
                                        setImmediate(callback);
                                    } else {
                                        var serialNumber = element.boxNo;
                                        var palletNumber = element.palletNo;

                                        itemStoreModel.findOne({'itemSerialNumber': serialNumber, 'activeStatus': 1}, function (err, itemStoreRow) {
                                            if (err) {

                                                validationErrorArray.push({message: 'ERROR OCCURRED WHILE GETTING DETAILS OF ITEM STORE ' + err});
                                                setImmediate(callback);
                                            } else if (itemStoreRow != null) {

                                                validationErrorArray.push({message: 'Box No. ' + serialNumber + ' already present in warehouse!'});
                                                setImmediate(callback);
                                            } else {
                                                if (palletNumber == '') {
                                                    // Check if loose box is going at pallet location
                                                    locationStoreModel.findOne({'customerAddress': element.rack, activeStatus: 1}, function (err, locationStoreRow) {
                                                        if (err) {

                                                            validationErrorArray.push({message: 'ERROR OCCURRED WHILE GETTING DETAILS OF LOCATION ' + element.rack + '! Error: ' + err});
                                                            setImmediate(callback);
                                                        } else if (locationStoreRow == null) {

                                                            validationErrorArray.push({message: 'Location ' + element.rack + ' not available in warehouse!  See Line no. ' + count + ' in Excel file.'});
                                                            setImmediate(callback);
                                                        } else {

                                                            var holdingType = locationStoreRow.holdingType;

                                                            if (holdingType == null) {

                                                                validationErrorArray.push({message: 'Holding type for location ' + element.rack + ' not available! Holding type should be defined!'});
                                                                setImmediate(callback);
                                                            } else if (holdingType == holdingTypeObject.palletId) {

                                                                validationErrorArray.push({message: 'Location ' + element.rack + ' hold PALLETS Only! Loose box not allowed here, However you can update the holding type of location & related Capacity via Location Master.'});
                                                                setImmediate(callback);
                                                            } else {

                                                                customerAddressArray.push(serialNumber);

                                                                var key = element.rack;

                                                                if (locations[key] == undefined) {

                                                                    locations[key] = [];
                                                                    locations[key].push(key);
                                                                    itemCodeArray.push(element);
                                                                    setImmediate(callback);
                                                                } else {

                                                                    locations[key].push(key);
                                                                    itemCodeArray.push(element);
                                                                    setImmediate(callback);
                                                                }
                                                            }
                                                        }
                                                    });
                                                } else {

                                                    if (!element.palletType || !element.palletSize) {

                                                        validationErrorArray.push({message: 'Pallet Type and Pallet Size both must be reqired! See line no. ' + count + ' in the excel file.'});
                                                        setImmediate(callback);
                                                    } else if ((allowedPalletTypes.indexOf(element.palletType) == -1) || (allowedPalletSizes.indexOf(element.palletSize) == -1)) {

                                                        validationErrorArray.push({message: 'Values of Pallet Type and Pallet Size must belongs to allowed List of Values! See line no. ' + count + ' in the excel file.'});
                                                        setImmediate(callback);
                                                    } else {

                                                        itemStoreModel.findOne({'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStore2Row) {
                                                            if (err) {

                                                                validationErrorArray.push({message: 'ERROR OCCURRED WHILE GETTING ITEM STORE WITH PALLET ' + err});
                                                                setImmediate(callback);
                                                            } else if (itemStore2Row != null) {

                                                                validationErrorArray.push({message: 'Pallet No. ' + palletNumber + ' already present in warehouse! Duplications not allowed.  See Line no. ' + count + ' in Excel file.'});
                                                                setImmediate(callback);
                                                            } else {

                                                                // Check if loose box is going at pallet location
                                                                locationStoreModel.findOne({'customerAddress': element.rack, activeStatus: 1}, function (err, locationStoreRow) {
                                                                    if (err) {

                                                                        validationErrorArray.push({message: 'ERROR OCCURRED WHILE GETTING DETAILS OF LOCATION ' + element.rack + '! Error: ' + err});
                                                                        setImmediate(callback);
                                                                    } else if (locationStoreRow == null) {

                                                                        validationErrorArray.push({message: 'Location ' + element.rack + ' not available in warehouse!  See Line no. ' + count + ' in Excel file.'});
                                                                        setImmediate(callback);
                                                                    } else {

                                                                        var holdingType = locationStoreRow.holdingType;

                                                                        if (holdingType == null) {

                                                                            validationErrorArray.push({message: 'Holding type for location ' + element.rack + ' not available! Holding type should be defined!'});
                                                                            setImmediate(callback);
                                                                        } else if (holdingType == holdingTypeObject.boxId) {

                                                                            validationErrorArray.push({message: 'Location ' + element.rack + ' hold LOOSE BOX Only! Pallet not allowed. However you can update the holding type of location & related Capacity via Location Master.  See Line no. ' + count + ' in Excel file.'});
                                                                            setImmediate(callback);
                                                                        } else {

                                                                            customerAddressArray.push(serialNumber);

                                                                            var key = element.rack;

                                                                            if (element.customPalletNumber != '') {

                                                                                if (locations[key] == undefined) {

                                                                                    locations[key] = [];
                                                                                    locations[key].push(element.customPalletNumber);
                                                                                    customPalletNumberArray.push(element);
                                                                                    setImmediate(callback);
                                                                                } else {

                                                                                    if ((locations[key].indexOf(element.customPalletNumber)) == -1) {

                                                                                        locations[key].push(element.customPalletNumber);
                                                                                    }

                                                                                    customPalletNumberArray.push(element);
                                                                                    setImmediate(callback);
                                                                                }
                                                                            } else {

                                                                                if (locations[key] === undefined) {

                                                                                    locations[key] = [];
                                                                                    locations[key].push(element.palletNo);
                                                                                    palletNumberArray.push(element);
                                                                                    setImmediate(callback);
                                                                                } else {

                                                                                    if ((locations[key].indexOf(element.palletNo)) === -1) {

                                                                                        locations[key].push(element.palletNo);
                                                                                    }

                                                                                    palletNumberArray.push(element);
                                                                                    setImmediate(callback);
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                }
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

                        var totalObjects = updatedExcelKeysArray.length;
                        console.log('total inventory ' + totalObjects);
                        var currentFilteredObjects = (palletNumberArray.length + customPalletNumberArray.length + itemCodeArray.length);
                        console.log('inventory ' + currentFilteredObjects);

                        if (validationErrorArray.length != 0) {

                            flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                        } else if (currentFilteredObjects == totalObjects) {
                            // Check if all items from inventory are in processsing filters.
                            flowController.emit('5', locations, palletNumberArray, customPalletNumberArray, itemCodeArray);
                        } else {

                            flowController.emit('ERROR', {message: 'Inventory getting missed out! Some components are not according to system requirements.', status: 'error', statusCode: '304'});
                        }
                    }
                });
            });
            //
            // Dynamic capacity validation 1
            flowController.on('5', function (locationsObject, palletNumberArray, customPalletNumberArray, itemCodeArray) {

                (showConsole) ? console.log('INVENTORY-5') : '';

                console.log('PalletNumbers ' + palletNumberArray.length);
                console.log('CustomPlletNumbers ' + customPalletNumberArray.length);
                console.log('itemCode ' + itemCodeArray.length);

                var locationCapacityArray = [];

                for (var key in locationsObject) {

                    var object = {};
                    object.location = key;
                    object.capacity = locationsObject[key].length;
                    locationCapacityArray.push(object);

                }

                flowController.emit('6', locationCapacityArray, palletNumberArray, customPalletNumberArray, itemCodeArray);
            });
            //
            // Dynamic capacity validation 1
            flowController.on('6', function (locationsCapacityArray, palletNumberArray, customPalletNumberArray, itemCodeArray) {

                (showConsole) ? console.log('INVENTORY-6') : '';

                validationErrorArray = [];

                async.eachSeries(locationsCapacityArray, function (element, callback) {

                    console.log(element);

                    locationStoreModel.findOne({customerAddress: element.location, activeStatus: 1}, function (err, locationStoreRow) {
                        if (err) {

                            validationErrorArray.push({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            setImmediate(callback);
                        } else if (locationStoreRow == null) {

                            validationErrorArray.push({message: 'Location ' + element.location + ' not available in warehouse! Contact warehouse administrator.', status: 'error', statusCode: '404'});
                            setImmediate(callback);
                        } else {

                            var availableCapacity = (locationStoreRow.availableCapacity) ? locationStoreRow.availableCapacity : '';

                            if (availableCapacity == '') {

                                validationErrorArray.push({message: 'Capacity at location ' + element.location + ' not defined! Need capacity to be defined in order to import inventory.'});
                                setImmediate(callback);
                            } else if (availableCapacity == -1) {

                                setImmediate(callback);
                            } else if (availableCapacity < element.capacity) {

                                validationErrorArray.push({message: 'Capacity at location ' + element.location + ' not sufficient! Required capacity is ' + element.capacity + ' & currenly available capacity is ' + availableCapacity});
                                setImmediate(callback);
                            } else {

                                setImmediate(callback);
                            }
                        }
                    });

                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        if (validationErrorArray.length != 0) {

                            flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                        } else {
                            // Check if all items from inventory are in processsing filters.
                            flowController.emit('7', palletNumberArray, customPalletNumberArray, itemCodeArray);
                        }
                    }
                });
            });
            //
            // Pallet number array
            flowController.on('7', function (palletNumberArray, customPalletNumberArray, itemCodeArray) {

                (showConsole) ? console.log('INVENTORY-7') : '';

                async.eachSeries(palletNumberArray, function (element, callback) {

                    async.waterfall([
                        // Get item master data
                        function (waterfallcallback) {

                            (showConsole) ? console.log('3.1') : '';

                            data = {};

                            itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    data.itemMasterRow = itemMasterRow;
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Get location data
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('3.2') : '';

                            var locationAddress = element.rack; //.substr(2);

                            locationStoreModel.findOne({'customerAddress': locationAddress, activeStatus: 1}, function (err, locationStoreRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {

                                    waterfallcallback({message: 'Location ' + locationAddress + ' not available in warehouse! Contact warehouse administrator.', status: 'error', statusCode: '404'});
                                } else {

                                    data.locationStoreRow = locationStoreRow;
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Get holding type of location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('3.3') : '';

                            var holdingType = data.locationStoreRow.holdingType;

                            if (holdingType == null) {

                                waterfallcallback({message: 'No holding type for location ' + data.locationStoreRow.customerAddress + '! Holding type of location must be defined.', status: 'error', statusCode: '500'});
                            } else {

                                holdingTypeModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: 'Holding type ' + holdingType + ' not available in warehouse master! Contact warehouse administrator.', status: 'error', statusCode: '404'});
                                    } else {

                                        holdingTypeName = holdingTypeRow.name;
                                        if (holdingTypeName == 'PALLET') {

                                            waterfallcallback(null, data);
                                        } else {

                                            waterfallcallback({message: 'Pallet not allowed in non-pallet location ' + data.locationStoreRow.customerAddress, status: 'error', statusCode: '404'});
                                        }
                                    }
                                });
                            }
                        },
                        // Check if pallet number present at location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('3.4') : '';

                            var palletNumberArray = data.locationStoreRow.palletNumbers;

                            var palletNumber = element.palletNo;

                            if (palletNumberArray.indexOf(palletNumber) == -1) {

                                data.found = 'NO';

                                var availableCapacity = data.locationStoreRow.availableCapacity;

                                if (availableCapacity > 0) {

                                    waterfallcallback(null, data);
                                } else {

                                    waterfallcallback({message: 'Capacity not available at location: ' + element.rack, status: 'error', statusCode: '404'});
                                }
                            } else {

                                data.found = 'YES';
                                waterfallcallback(null, data);
                            }
                        },
                        // Update Item Store with new record
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('3.6') : '';

                            var dateNew = moment(new Date()).format('DDMMYY');
                            var rgx = new RegExp("^" + dateNew);

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

                                    var randomFields = [{
                                            batch: element.batch,
                                            boxType: (element.boxType) ? element.boxType : '',
                                            palletType: (element.palletType) ? element.palletType : '',
                                            palletSize: (element.palletSize) ? element.palletSize : '',
                                            netWeight: element.netWeight,
                                            pieces: element.pieces,
                                            salesDocument: element.salesDocument,
                                            netWeightInLbs: element.netWeightInLbs,
                                            grossWeight: element.grossWeight,
                                            name1: element.name1,
                                            purchaseOrderNumber: element.purchaseOrderNumber,
                                            customerMaterialNumber: element.customerMaterialNumber,
                                            specificLotNo: element.specificLotNo,
                                            grossWeightInLbs: element.grossWeightInLbs,
                                            tareWeightInLbs: element.tareWeightInLbs
                                        }];

                                    var newItemStore = new itemStoreModel();

                                    newItemStore.warehouseId = warehouseId;
                                    newItemStore.itemMasterId = String(data.itemMasterRow._id);
                                    (element.boxNo) ? newItemStore.itemSerialNumber = element.boxNo : '';
                                    newItemStore.palletNumber = element.palletNo;
                                    newItemStore.lotAddress = newLotAddress;
                                    newItemStore.manufacturingDate = element.createdOn;
                                    newItemStore.locationStoreId = String(data.locationStoreRow._id);
                                    newItemStore.overflowAutoAssign = data.itemMasterRow.overflowAutoAssign;
                                    newItemStore.exclusiveStorage = data.itemMasterRow.exclusiveStorage;
                                    newItemStore.randomFields = randomFields;
                                    newItemStore.createdBy = createdBy;
                                    newItemStore.date = moment(new Date()).format('DD/MM/YY');
                                    newItemStore.timeCreated = timeInInteger;

                                    newItemStore.save(function (err, returnData) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else {

                                            waterfallcallback(null, data, String(returnData._id));
                                        }
                                    });
                                }
                            });
                        },
                        // Update location store
                        function (data, itemStoreId, waterfallcallback) {

                            (showConsole) ? console.log('3.7') : '';

                            var query = {"_id": data.locationStoreRow._id};

                            if (data.found == 'NO') {

                                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}, "$inc": {"availableCapacity": -1}};
                            } else {

                                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}};
                            }

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Update available pallets to location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('3.8') : '';

                            if (data.found == 'NO') {

                                var query = {"_id": data.locationStoreRow._id};
                                var update = {"$addToSet": {"palletNumbers": element.palletNo}};

                                locationStoreModel.update(query, update, function (err) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else {

                                        waterfallcallback(null);
                                    }
                                });
                            } else {

                                waterfallcallback(null);
                            }
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            callback(err);
                        } else {
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('8', palletNumberArray, customPalletNumberArray, itemCodeArray);
                    }
                });
            });
            //
            // Custom Pallet number
            flowController.on('8', function (palletNumberArray, customPalletNumberArray, itemCodeArray) {

                (showConsole) ? console.log('INVENTORY-8') : '';

                async.eachSeries(customPalletNumberArray, function (element, callback) {

                    async.waterfall([
                        // Get item master data
                        function (waterfallcallback) {

                            (showConsole) ? console.log('4.1') : '';

                            data = {};

                            itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    data.itemMasterRow = itemMasterRow;
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Get location data
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('4.2 ' + element.rack) : '';

                            var locationAddress = element.rack; //.substr(2);

                            locationStoreModel.findOne({'customerAddress': locationAddress, activeStatus: 1}, function (err, locationStoreRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {

                                    waterfallcallback({message: 'Location ' + locationAddress + ' not available in warehouse! Contact warehouse administrator.', status: 'error', statusCode: '404'});
                                } else {

                                    data.locationStoreRow = locationStoreRow;
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Get holding type of location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('4.3') : '';

                            var holdingType = data.locationStoreRow.holdingType;

                            if (holdingType == null) {

                                waterfallcallback({message: 'No holding type for location ' + data.locationStoreRow.customerAddress + '! Holding type of location must be defined.', status: 'error', statusCode: '500'});
                            } else {

                                holdingTypeModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: 'Holding type ' + holdingType + ' not available in warehouse master! Contact warehouse administrator.', status: 'error', statusCode: '404'});
                                    } else {

                                        holdingTypeName = holdingTypeRow.name;
                                        if (holdingTypeName == 'PALLET') {

                                            waterfallcallback(null, data);
                                        } else {

                                            waterfallcallback({message: 'Pallet not allowed in non-pallet location ' + data.locationStoreRow.customerAddress, status: 'error', statusCode: '404'});
                                        }
                                    }
                                });
                            }
                        },
                        // Check if pallet number opresent at location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('4.4') : '';

                            var customPalletNumberArray = data.locationStoreRow.customPalletNumbers;

                            var customPalletNumber = element.customPalletNumber;

                            if (customPalletNumberArray.indexOf(customPalletNumber) == -1) {

                                data.found = 'NO';

                                var availableCapacity = data.locationStoreRow.availableCapacity;

                                if (availableCapacity > 0) {

                                    waterfallcallback(null, data);
                                } else {

                                    waterfallcallback({message: 'Capacity not available at location : ' + element.rack, status: 'error', statusCode: '404'});
                                }
                            } else {

                                data.found = 'YES';
                                waterfallcallback(null, data);
                            }
                        },
                        // Update Item Store with new record
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('4.5') : '';

                            var dateNew = moment(new Date()).format('DDMMYY');
                            var rgx = new RegExp("^" + dateNew);

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

                                    var randomFields = [{
                                            batch: element.batch,
                                            boxType: (element.boxType) ? element.boxType : '',
                                            palletType: (element.palletType) ? element.palletType : '',
                                            palletSize: (element.palletSize) ? element.palletSize : '',
                                            netWeight: element.netWeight,
                                            pieces: element.pieces,
                                            salesDocument: element.salesDocument,
                                            netWeightInLbs: element.netWeightInLbs,
                                            grossWeight: element.grossWeight,
                                            name1: element.name1,
                                            purchaseOrderNumber: element.purchaseOrderNumber,
                                            customerMaterialNumber: element.customerMaterialNumber,
                                            specificLotNo: element.specificLotNo,
                                            grossWeightInLbs: element.grossWeightInLbs,
                                            tareWeightInLbs: element.tareWeightInLbs
                                        }];

                                    var newItemStore = new itemStoreModel();

                                    newItemStore.warehouseId = warehouseId;
                                    newItemStore.itemMasterId = String(data.itemMasterRow._id);
                                    (element.boxNo) ? newItemStore.itemSerialNumber = element.boxNo : '';
                                    newItemStore.palletNumber = element.palletNo;
                                    newItemStore.customPalletNumber = element.customPalletNumber;
                                    newItemStore.lotAddress = newLotAddress;
                                    newItemStore.manufacturingDate = element.createdOn;
                                    newItemStore.locationStoreId = String(data.locationStoreRow._id);
                                    newItemStore.overflowAutoAssign = data.itemMasterRow.overflowAutoAssign;
                                    newItemStore.exclusiveStorage = data.itemMasterRow.exclusiveStorage;
                                    newItemStore.randomFields = randomFields;
                                    newItemStore.createdBy = createdBy;
                                    newItemStore.date = moment(new Date()).format('DD/MM/YY');
                                    newItemStore.timeCreated = timeInInteger;

                                    newItemStore.save(function (err, returnData) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else {

                                            waterfallcallback(null, data, String(returnData._id));
                                        }
                                    });
                                }
                            });
                        },
                        // Update location store
                        function (data, itemStoreId, waterfallcallback) {

                            (showConsole) ? console.log('4.6') : '';

                            var query = {"_id": data.locationStoreRow._id};

                            if (data.found == 'NO') {

                                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}, "$inc": {"availableCapacity": -1}};
                            } else {

                                var update = {"$addToSet": {"assignedItemStoreId": itemStoreId}};
                            }

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Update available pallets to location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('4.7') : '';

                            var query = {"_id": data.locationStoreRow._id};

                            if (data.found == 'NO') {
                                var update = {"$addToSet": {"outerPalletNumbers": element.palletNo, "customPalletNumbers": element.customPalletNumber}};
                            } else {
                                var update = {"$addToSet": {"outerPalletNumbers": element.palletNo}};
                            }

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null);
                                }
                            });
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            callback(err);
                        } else {
                            //setTimeout(function () {
                            setImmediate(callback);
                            //});
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('9', palletNumberArray, customPalletNumberArray, itemCodeArray);
                    }
                });
            });
            //
            // Item code array
            flowController.on('9', function (palletNumberArray, customPalletNumberArray, itemCodeArray) {

                (showConsole) ? console.log('INVENTORY-9') : '';

                async.eachSeries(itemCodeArray, function (element, callback) {

                    async.waterfall([
                        // Get item master data
                        function (waterfallcallback) {

                            (showConsole) ? console.log('5.1') : '';

                            data = {};

                            itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    data.itemMasterRow = itemMasterRow;
                                    waterfallcallback(null, data);
                                }
                            });
                        },
                        // Get location data
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.2') : '';

                            var locationAddress = element.rack; //.substr(2);

                            locationStoreModel.findOne({'customerAddress': locationAddress, activeStatus: 1}, function (err, locationStoreRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {

                                    waterfallcallback({message: 'Location' + locationAddress + ' data not available! Contact warehouse operator.', status: 'error', statusCode: '404'});
                                } else {

                                    data.locationStoreRow = locationStoreRow;
                                    waterfallcallback(null, data)
                                }
                            });
                        },
                        // Get holding type of location
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.3') : '';

                            var holdingType = data.locationStoreRow.holdingType;

                            if (holdingType == null) {

                                waterfallcallback({message: 'No holding type for location ' + data.locationStoreRow.customerAddress + '! Holding type of location must be defined.', status: 'error', statusCode: '500'});
                            } else {

                                holdingTypeModel.findOne({'_id': holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: 'Holding type data tampered/removed from system!', status: 'error', statusCode: '404'});
                                    } else {

                                        holdingTypeName = holdingTypeRow.name;
                                        if (holdingTypeName == 'PALLET') {

                                            waterfallcallback({message: 'Location ' + data.locationStoreRow.customerAddress + ' is Pallet location! Non-pallet item not allowed here.', status: 'error', statusCode: '404'});
                                        } else {

                                            waterfallcallback(null, data);
                                        }
                                    }
                                });
                            }
                        },
                        // Check if location capacity available or not
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.4') : '';

                            var availableCapacity = data.locationStoreRow.availableCapacity;

                            if (availableCapacity > 0) {

                                waterfallcallback(null, data);
                            } else {

                                waterfallcallback({message: 'Capacity not available at location: ' + element.rack, status: 'error', statusCode: '404'});
                            }
                        },
                        // If pallet is available then add to that pallet & if not available then add new pallet if capacity available
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.5') : '';

                            var itemMasterId = String(data.itemMasterRow._id);

                            if (data.locationStoreRow.isReservedForItem === 'YES') {

                                if (data.locationStoreRow.assignedItemStoreId.indexOf(itemMasterId) == -1) {

                                    waterfallcallback({message: 'Location ' + data.locationStoreRow.customerAddress + ' is reserved for different item! This item is not allowed to be put.', status: 'error', statusCode: '404'});
                                } else {

                                    waterfallcallback(null, data);
                                }
                            } else {

                                var sameItemObject = [];
                                var otherItemObject = [];
                                var exclusiveItem = [];
                                if (data.locationStoreRow.assignedItemStoreId.length !== 0) {

                                    async.eachSeries(data.locationStoreRow.assignedItemStoreId, function (element, callback) {

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

                                            waterfallcallback(err);
                                        } else {

                                            if (sameItemObject.length === data.locationStoreRow.assignedItemStoreId.length) {
                                                // Item present at location
                                                waterfallcallback(null, data);
                                            } else if (exclusiveItem.length != 0) {
                                                // Exclusive storage available
                                                waterfallcallback({message: 'Location already having exclusive storage enabled items! This item not allowed.', status: 'error', statusCode: '404'});
                                            } else if (otherItemObject.length != 0 && data.itemMasterRow.exclusiveStorage == 'YES') {
                                                // Item is self exclusive
                                                waterfallcallback({message: 'This item is exclusive so not allowed to be put at shared location!', status: 'error', statusCode: '404'});
                                            } else {
                                                // empty location
                                                waterfallcallback(null, data);
                                            }
                                        }
                                    });
                                } else {

                                    waterfallcallback(null, data);
                                }
                            }
                        },
                        // Update Item Store with new record
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.6') : '';

                            var dateNew = moment(new Date()).format('DDMMYY');
                            var rgx = new RegExp("^" + dateNew);

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

                                    var randomFields = [{
                                            batch: element.batch,
                                            palletType: (element.palletType) ? element.palletType : null,
                                            palletSize: (element.palletSize) ? element.palletSize : null,
                                            netWeight: element.netWeight,
                                            pieces: element.pieces,
                                            salesDocument: element.salesDocument,
                                            netWeightInLbs: element.netWeightInLbs,
                                            grossWeight: element.grossWeight,
                                            name1: element.name1,
                                            purchaseOrderNumber: element.purchaseOrderNumber,
                                            customerMaterialNumber: element.customerMaterialNumber,
                                            specificLotNo: element.specificLotNo,
                                            grossWeightInLbs: element.grossWeightInLbs,
                                            tareWeightInLbs: element.tareWeightInLbs
                                        }];

                                    var newItemStore = new itemStoreModel();

                                    newItemStore.warehouseId = warehouseId;
                                    newItemStore.itemMasterId = String(data.itemMasterRow._id);
                                    (element.boxNo) ? newItemStore.itemSerialNumber = element.boxNo : '';
                                    newItemStore.lotAddress = newLotAddress;
                                    newItemStore.manufacturingDate = element.createdOn;
                                    newItemStore.locationStoreId = String(data.locationStoreRow._id);
                                    newItemStore.overflowAutoAssign = data.itemMasterRow.overflowAutoAssign;
                                    newItemStore.exclusiveStorage = data.itemMasterRow.exclusiveStorage;
                                    newItemStore.randomFields = randomFields;
                                    newItemStore.createdBy = createdBy;
                                    newItemStore.date = moment(new Date()).format('DD/MM/YY');
                                    newItemStore.timeCreated = timeInInteger;

                                    newItemStore.save(function (err, returnData) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else {

                                            data.itemStoreId = String(returnData._id);
                                            waterfallcallback(null, data);
                                        }
                                    });
                                }
                            });
                        },
                        // Update location store
                        function (data, waterfallcallback) {

                            (showConsole) ? console.log('5.7') : '';

                            var query = {"_id": data.locationStoreRow._id};

                            var update = {"$addToSet": {"assignedItemStoreId": data.itemStoreId}, "$inc": {"availableCapacity": -1}};

                            locationStoreModel.update(query, update, function (err) {
                                if (err) {

                                    waterfallcallback(err);
                                } else {

                                    waterfallcallback(null);
                                }
                            });
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            callback(err);
                        } else {
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('10');
                    }
                });
            });
            //
            // Completion text 
            flowController.on('10', function () {

                (showConsole) ? console.log('INVENTORY-10') : '';

                result = {message: 'Inventory import completed!', status: 'success', statusCode: '200'};

                flowController.emit('END', result);
            });
            //
            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                dashboardService.createAlert();
                res.json(result);
            });
            //
            //ERROR
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'IMPORT-INVENTORY-ADD',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });
                (error.hasOwnProperty('validationErrors')) ? '' : error.validationErrors = [];

                require("fs").unlink(path, function () {
                    res.json(error);
                });
            });
            //
            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
//IMPORT EXPORT INVENTORY : By Item-Code
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/item-code/manual-export/')

        .post(function (req, res) {
            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            var directories = ["./public/files/inventory/", "./public/files/inventory/download/", "./public/files/inventory/download/item-code/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });


            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('end', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});

            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                var itemMasterArr = [];

                itemMasterModel.find({'warehouseId': warehouseId, activeStatus: 1}).lean().sort({'timeCreated': 1}).exec(function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "Unable to get Master details. " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "Item Master missing! Records tampered/removed from system.", status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(itemMasterRow, function (elementItemRow, callback) {

                            itemMasterArr.push(elementItemRow);

                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "Unable to get Master details! Try again after some time.", status: 'error', statusCode: '500'});
                            } else {

                                // flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
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
                var itemStoreQuantity1 = 0;
                var totalPrice1 = 0;
                var priceValue1 = 0;
                async.eachSeries(itemMasterData, function (elementItemMaster, callbackItemMaster) {

                    async.waterfall([

                        function (waterfallcallback) {

                            itemStoreModel.count({'itemMasterId': elementItemMaster._id, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemQuantity) {
                                if (err) {

                                    waterfallcallback({message: "Unable to get item Store Master details! Try again after some time.", status: 'error', statusCode: '500'});
                                } else {
                                    waterfallcallback(null, itemQuantity);
                                }
                            });
                        },
                        // holdingType
                        function (itemQuantity, waterfallcallback) {

                            if (elementItemMaster.holdingType) {

                                holdingTypeModel.findOne({'_id': elementItemMaster.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                    if (err) {

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

                                dispatchRuleModel.findOne({'_id': elementItemMaster.dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {
                                    if (err) {

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

                                measurementUnitModel.findOne({'_id': elementItemMaster.measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {
                                    if (err) {

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

                                itemCategorysModel.findOne({'_id': elementItemMaster.category, 'activeStatus': 1}, function (err, categoryRow) {
                                    if (err) {

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

                            var subCategoryArr = [];

                            if (elementItemMaster.subCategory.length !== 0) {

                                async.eachSeries(elementItemMaster.subCategory, function (elementSubCategory, callbackSubCategory) {

                                    itemSubCategorysModel.findOne({_id: elementSubCategory, activeStatus: 1}, function (err, subCategoryRow) {
                                        if (err) {

                                        } else if (subCategoryRow == null) {

                                            setImmediate(callbackSubCategory);
                                        } else {

                                            subCategoryName = (subCategoryRow.name) ? subCategoryRow.name : '';
                                            subCategoryArr.push(subCategoryName);
                                            setImmediate(callbackSubCategory);
                                        }
                                    });
                                }, function (err) {
                                    if (err) {

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

                                            setImmediate(callbackMHU);
                                        } else {

                                            MHUName = (MHURow.name) ? MHURow.name : '';
                                            MHUArray.push(MHUName);
                                            setImmediate(callbackMHU);
                                        }
                                    });
                                }, function (err) {
                                    if (err) {

                                    } else {

                                        waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                                    }
                                });
                            } else {

                                waterfallcallback(null, itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray);
                            }
                        },
                        //
                        function (itemQuantity, holdingType, dispatchRule, measurementUnit, categoryName, subCategoryArr, MHUArray, waterfallcallback) {


                            var dataArea = {
                                //itemMasterId: elementItemMaster._id,
                                ItemCode: elementItemMaster.itemCode,
                                ItemCateogy: categoryName,
                                ItemSubCategory: (subCategoryArr.length > 0) ? subCategoryArr.join() : "",
                                ItemDescription: elementItemMaster.itemDescription,
                                TotalQuantity: itemQuantity ? itemQuantity : 0,
                                TotalPrice: parseInt(elementItemMaster.priceValue) * parseInt(itemQuantity) ? parseInt(elementItemMaster.priceValue) * parseInt(itemQuantity) : 0 + " " + elementItemMaster.priceCurrency,
                                UnitPrice: (elementItemMaster.priceValue) ? elementItemMaster.priceValue : 0 + " " + elementItemMaster.priceCurrency,
                                //PriceCurrency: elementItemMaster.priceCurrency,
                                AlertDate: elementItemMaster.alertDate,
                                DispatchRule: dispatchRule,
                                TimeCreated: moment.unix(elementItemMaster.timeCreated).format("DD/MMM/YYYY HH:mm:ss"),
                                HoldingType: holdingType,
                                ExclusiveStorage: elementItemMaster.exclusiveStorage,
                                OverflowAutoAssign: elementItemMaster.overflowAutoAssign,
                                MeasurementUnit: measurementUnit,
                                MaterialHandlingUnitId: MHUArray.join(),
                                ManufacturingDate: elementItemMaster.manufacturingDate,
                                ExpiryDate: elementItemMaster.expiryDate,
                                ItemStatus: (elementItemMaster.itemSystemSpecification[0].itemStatus) ? elementItemMaster.itemSystemSpecification[0].itemStatus : '',

                            };

                            itemStoreQuantity1 += parseInt(itemQuantity);
                            totalPrice1 += parseInt(elementItemMaster.priceValue) * parseInt(itemQuantity);
                            priceValue1 += parseInt(elementItemMaster.priceValue);
                            waterfallcallback(null, dataArea);
                        }
                    ], function (err, result) {

                        if (err) {
                            callbackItemMaster({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            itemMasterArray.push(result);
                            setImmediate(callbackItemMaster);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        var dataArea = {
                            ItemCode: "",
                            ItemCateogy: "",
                            ItemSubCategory: "",
                            ItemDescription: "",
                            TotalQuantity: itemStoreQuantity1,
                            TotalPrice: totalPrice1,
                            UnitPrice: priceValue1,
                            AlertDate: "",
                            DispatchRule: "",
                            TimeCreated: "",
                            HoldingType: "",
                            ExclusiveStorage: "",
                            OverflowAutoAssign: "",
                            MeasurementUnit: "",
                            MaterialHandlingUnitId: "",
                            ManufacturingDate: "",
                            ExpiryDate: "",
                            ItemStatus: "",

                        };
                        itemMasterArray.push(dataArea);

                        //console.log('itemStoreQuantity1' + itemStoreQuantity1 + '=totalPrice1' + totalPrice1 + '==totalPrice1' + totalPrice1);
                        flowController.emit('2', itemMasterArray);
                    }
                });
            });

            //delete old file
            flowController.on('2', function (itemMasterArray) {
                (showConsole) ? console.log('2') : '';

                var path = "./public/files/inventory/download/item-code/";
                fs.readdir(path, function (err, files) {

                    if (err) {

                        // flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {

                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/inventory/download/item-code/' + fileArray[0];

                            if (fs.existsSync(path)) {

                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('3', itemMasterArray);
                                });
                            }
                        } else {

                            flowController.emit('3', itemMasterArray);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('3', function (itemMasterArray) {
                (showConsole) ? console.log('3') : '';

                var model = mongoXlsx.buildDynamicModel(itemMasterArray);
                var fileName = 'By_ItemCode_Inventory_Excel- ' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/inventory/download/item-code/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(itemMasterArray, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/inventory/download/item-code/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " File.";
                        dataObject.module = 'BY ITEMCODE INVENTORY';
                        dataObject.name = 'BY ITEMCODE INVENTORY DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("ITEMCODE DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                    // flowController.emit('end', {data: baseUrl + 'files/inventory/download/item-code/' + result.fileName, status: 'success', statusCode: '200'});
                });
            });

            // error while process execution
            flowController.on('ERROR', function (error) {
                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'EXPORT-INVENTORY',
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
            //END
            flowController.on('end', function (result) {

                (showConsole) ? console.log('end') : '';
                res.json(result);
            });
            //
            flowController.emit('RESPONSE');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// IMPORT EXPORT INVENTORY : By Serial Number
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/serial-number/manual-export/')

        .post(function (req, res) {
            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();

            var serialNumberArray = [];

            var directories = ["./public/files/inventory/", "./public/files/inventory/download/", "./public/files/inventory/download/serial-number/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });
            var flowController = new EventEmitter();
            // check for logical validations item quantity vs actual available quantity & item details

            flowController.on('RESPONSE', function () {

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            //
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                // Use connect method to connect to the Server
                MongoClient.connect(url, function (err, db) {

                    if (err) {

                        //assert.equal(null, err);
                    } else {

                        var collection = db.collection('transactionalData-itemStores');
                        // Find some documents
                        collection.find({'warehouseId': warehouseId, 'activeStatus': 1}).toArray(function (err, itemStoreRow) {
                            if (err) {
                                console.log("error" + err);
                                //assert.equal(err, null);
                            } else {

                                flowController.emit('1', itemStoreRow);
                                //flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // Generate date
            flowController.on('1', function (itemStoreArray) {

                (showConsole) ? console.log('1') : '';

                var count = 0;
                var priceValueTotal = 0;
                var tareWeightLBSTotal = 0;
                var grossWeightTotal = 0;
                var piecesTotal = 0;
                var grossWeightInLbsTotal = 0;
                var netWeightLBSTotal = 0;
                var netWeightTotal = 0;

                async.eachSeries(itemStoreArray, function (elementItemStore, callback) {

                    console.log('Item ' + count);

                    var customPalletNumber = (elementItemStore.customPalletNumber) ? elementItemStore.customPalletNumber : '';

                    async.waterfall([
                        //
                        function (waterfallcallback) {

                            locationStoreModel.findOne({'_id': elementItemStore.locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
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

                                    areaMasterModel.findOne({'_id': data.areaId, 'activeStatus': 1}, function (err, areaRow) {
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

                                    zoneMasterModel.findOne({'_id': data.zoneId, 'activeStatus': 1}, function (err, zoneRow) {
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

                                    lineMasterModel.findOne({'_id': data.lineId, 'activeStatus': 1}, function (err, lineRow) {
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

                                    levelMasterModel.findOne({'_id': data.levelId, 'activeStatus': 1}, function (err, levelRow) {
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

                                                measurementUnitModel.findOne({'_id': itemMasterRow.measurementUnit, 'activeStatus': 1}, function (err, measurementUnitRow) {
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


                            var arrKey = elementItemStore.randomFields[0];

                            dataSerialNumber = {
                                ItemCode: itemCode,
                                CustomPalletNumber: customPalletNumber,
                                ItemDescription: itemDescription,
                                PriceValue: (priceValue) ? priceValue : 0 + " " + priceCurrency,
                                MeasurementUnit: measurementUnit,
                                Location: customerAddress,
                                AreaName: areaName,
                                ZoneName: zoneName,
                                LineName: lineName,
                                LevelName: levelName,
                                FunctionName: functionName,
                                ItemSerialNumber: elementItemStore.itemSerialNumber,
                                InwardDate: elementItemStore.date,
                                AlertDate: elementItemStore.alertDate,
                                ManufacturingDate: elementItemStore.manufacturingDate,
                                ExpiryDate: elementItemStore.expiryDate,
                                PalletNumber: elementItemStore.palletNumber,
                                Flags: elementItemStore.flags.join(),
                                PalletType: arrKey ? elementItemStore.randomFields[0].palletType : "",
                                TareWeightLBS: arrKey ? elementItemStore.randomFields[0].tareWeightLBS : 0,
                                SpecifcLotNo: arrKey ? elementItemStore.randomFields[0].specifcLotNo : 0,
                                PurchaseOrderNo: arrKey ? elementItemStore.randomFields[0].purchaseOrderNo : 0,
                                GrossWeight: arrKey ? elementItemStore.randomFields[0].grossWeight : 0,
                                Pieces: arrKey ? elementItemStore.randomFields[0].pieces : 0,
                                PalletSize: arrKey ? elementItemStore.randomFields[0].palletSize : 0,
                                GrossWeightInLbs: arrKey ? elementItemStore.randomFields[0].GrossWeightInLbs : 0,
                                CustomerMeterialNumber: arrKey ? elementItemStore.randomFields[0].CustomerMeterialNumber : 0,
                                Name1: arrKey ? elementItemStore.randomFields[0].name1 : '',
                                NetWeightLBS: arrKey ? elementItemStore.randomFields[0].netWeightLBS : 0,
                                SalesDocument: arrKey ? elementItemStore.randomFields[0].salesDocument : "",
                                NetWeight: arrKey ? elementItemStore.randomFields[0].netWeight : 0,
                                Batch: arrKey ? elementItemStore.randomFields[0].batch : 0,
                                ExclusiveStorage: elementItemStore.exclusiveStorage,
                                OverflowAutoAssign: elementItemStore.overflowAutoAssign,
                                TimeModified: (elementItemStore.timeModified) ? elementItemStore.timeModified : ""
                            };
                            priceValueTotal += priceValue;

                            tareWeightLBSTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].tareWeightLBS || 0 : 0);
                            grossWeightTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].grossWeight || 0 : 0);
                            piecesTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].pieces || 0 : 0);
                            grossWeightInLbsTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].grossWeightInLbsTotal || 0 : 0);
                            netWeightLBSTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].netWeightLBS || 0 : 0);
                            netWeightTotal += parseFloat(arrKey ? elementItemStore.randomFields[0].netWeight || 0 : 0);

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

                        dataSerialNumber = {
                            ItemCode: "",
                            CustomPalletNumber: "",
                            ItemDescription: "",
                            PriceValue: priceValueTotal,
                            MeasurementUnit: "",
                            Location: "",
                            AreaName: "",
                            ZoneName: "",
                            LineName: "",
                            LevelName: "",
                            FunctionName: "",
                            ItemSerialNumber: "",
                            InwardDate: "",
                            AlertDate: "",
                            ManufacturingDate: "",
                            ExpiryDate: "",
                            PalletNumber: "",
                            Flags: "",
                            "PalletType": "",
                            "TareWeightLBS": tareWeightLBSTotal,
                            "SpecifcLotNo": "",
                            "PurchaseOrderNo": "",
                            "GrossWeight": grossWeightTotal,
                            "Pieces": piecesTotal,
                            "PalletSize": "",
                            "GrossWeightInLbs": grossWeightInLbsTotal,
                            "CustomerMeterialNumber": "",
                            "Name1": "",
                            "NetWeightLBS": netWeightLBSTotal,
                            "SalesDocument": "",
                            "NetWeight": netWeightTotal,
                            "Batch": "",
                            ExclusiveStorage: "",
                            OverflowAutoAssign: "",
                            TimeModified: ""
                        };
                        serialNumberArray.push(dataSerialNumber);
                        flowController.emit('2', serialNumberArray);
                    }
                });
            });
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('2', function (serialNumberArray) {
                (showConsole) ? console.log('2') : '';

                var path = "./public/files/inventory/download/serial-number/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/inventory/download/serial-number/' + fileArray[0];

                            if (fs.existsSync(path)) {

                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('3', serialNumberArray);
                                });
                            }
                        } else {

                            flowController.emit('3', serialNumberArray);
                        }
                    }
                });
            });
            // Save file to database
            flowController.on('3', function (serialNumberArray) {

                (showConsole) ? console.log('3') : '';

                var model = mongoXlsx.buildDynamicModel(serialNumberArray);
                var fileName = 'By_Serial_Number_Inventory_Excel- ' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/inventory/download/serial-number/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(serialNumberArray, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/inventory/download/serial-number/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " File.";
                        dataObject.module = 'BY SERIAL NUMBER INVENTORY';
                        dataObject.name = 'BY SERIAL NUMBER INVENTORY DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {

                                console.log("err");
                            } else {

                                console.log("SERIAL NUMBER INVENTORY DOWNLOAD EXCEL:  success");
                            }
                        });
                    }
                });
            });

            // END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'EXPORT-INVENTORY(BY SERIAL NUMBER)-ADD',
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
            flowController.emit('RESPONSE');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// IMPORT EXPORT INVENTORY : By Location
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/inventory/action/read/item/location-store/manual-export/')

        .post(function (req, res) {

            var showConsole = 1;
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();

            var QuantityTotal = 0;
            var AvailableCapacityTotal = 0;

            var directories = ["./public/files/inventory/", "./public/files/inventory/download/", "./public/files/inventory/download/location-store/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            // For warehouse inventory comparison purpose only
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                locationStoreModel.find({'warehouseId': warehouseId, 'assignedItemStoreId': {'$exists': true}, 'activeStatus': 1}).lean().sort({'sequenceId': 1}).exec(function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {
                        `                           `
                        flowController.emit('ERROR', {data: [], message: 'No locations found! Contact customer-support!', status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', locationStoreRow);
                        flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
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

                            areaMasterModel.findOne({'_id': element.areaId, 'activeStatus': 1}, function (err, areaRow) {
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

                            zoneMasterModel.findOne({'_id': element.zoneId, 'activeStatus': 1}, function (err, zoneRow) {
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

                            lineMasterModel.findOne({'_id': element.lineId, 'activeStatus': 1}, function (err, lineRow) {
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

                            levelMasterModel.findOne({'_id': element.levelId, 'activeStatus': 1}, function (err, levelRow) {
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

                        // flowController.emit('ERROR', err);
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

                                setImmediate(callbackDone2);
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

                        // flowController.emit('ERROR', err);
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

                        // flowController.emit('ERROR', err);
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

                            itemCategorysModel.findOne({_id: itemMasterRow.category, activeStatus: 1}, function (err, categoryRow) {

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

                        //flowController.emit('ERROR', err);
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

                                    callbackMHU(err);
                                } else if (materialHandlingMasterRow == null) {

                                    setImmediate(callbackMHU);
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

                        //   flowController.emit('ERROR', err);
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
                        Location: element.customerAddress,
                        ItemCode: element.itemCode,
                        ItemDescription: element.itemDescription,
                        Category: element.category,
                        LocationQuantity: element.quantity,
                        AvailableCapacity: element.availableCapacity,
                        BlockStatus: element.isBlocked,
                        AreaName: element.areaName,
                        ZoneName: element.zoneName,
                        LineName: element.lineName,
                        LevelName: element.levelName,
                        LocationMaterialHandlingUnit: element.locationMHE.join(),
                        ItemMaterialHandlingUnit: element.itemMHE.join(),
                        PalletNumber: element.palletNumber.join(),
                        PalletType: element.palletType.join(),
                        PalletSize: element.palletSize.join(),
                        LocationCapacity: parseInt(element.locationCapacity),
                        Flags: [].join()

                    };

                    QuantityTotal += parseInt(element.quantity);
                    AvailableCapacityTotal += parseInt(element.availableCapacity);
                    locationInventoryArray.push(object);
                    setImmediate(callbackDone);
                }, function (err) {
                    if (err) {

                        //flowController.emit('ERROR', err);
                    } else {
                        var object = {
                            Location: "",
                            ItemCode: "",
                            ItemDescription: "",
                            Category: "",
                            LocationQuantity: QuantityTotal,
                            AvailableCapacity: AvailableCapacityTotal,
                            BlockStatus: "",
                            AreaName: "",
                            ZoneName: "",
                            LineName: "",
                            LevelName: "",
                            LocationMaterialHandlingUnit: "",
                            ItemMaterialHandlingUnit: "",
                            PalletNumber: "",
                            PalletType: "",
                            PalletSize: "",
                            LocationCapacity: "",
                            Flags: ""

                        };
                        locationInventoryArray.push(object);
                        flowController.emit('7', locationInventoryArray);
                    }
                });
            });

            //delete old file
            // fs.unlink(fileDest);
            flowController.on('7', function (locationInventoryArray) {
                (showConsole) ? console.log('7') : '';

                var path = "./public/files/inventory/download/location-store/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        //flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/inventory/download/location-store/' + fileArray[0];

                            if (fs.existsSync(path)) {

                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('8', locationInventoryArray);
                                });
                            }
                        } else {

                            flowController.emit('8', locationInventoryArray);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('8', function (locationInventoryArray) {

                (showConsole) ? console.log('8') : '';

                var model = mongoXlsx.buildDynamicModel(locationInventoryArray);
                var fileName = 'By_Location_Inventory_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/inventory/download/location-store/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(locationInventoryArray, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/inventory/download/location-store/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " File.";
                        dataObject.module = 'BY LOCATION INVENTORY';
                        dataObject.name = 'BY LOCATION INVENTORY DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("LOCATIONSTORE DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                    // flowController.emit('END', {data: baseUrl + 'files/inventory/download/location-store/' + result.fileName, status: 'success', statusCode: '200'});
                });
            });
            // End  
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'EXPORT-INVENTORY(BY LOCATION)-ADD',
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
//IMPORT EXPORT INVENTORY : Inventory comparison
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/action/inventory-comparison/manual-import/')

        .post(function (req, res, next) {
//            // Multar based file upload in Binary chunks
            multer({
                dest: os.tmpdir() + '/',
                limits: {files: 1}
            }, next());
//            // Multar based file upload in Binary chunks
        }, function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var baseImageUrl = req.body.baseImageUrl.trim();

            var fileXLS = req.files.fileXLS;

            var date = moment(new Date()).format('DDMMYYYYHHMMSS');

            var path = "./public/files/inventory-compare/IC_" + date + ".xlsx";

            var directories = ["./public/files/inventory-compare/", "./public/files/inventory-compare/inventory-alerts/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            var validationErrorArray = [];
            // Change the 
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                require("fs").writeFile(path, fileXLS.data, 'binary', function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Error occurred while uploading file to server ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'File received! Inventory comparison is in progress. You will receive status updates soon via Alerts.', status: 'success', statusCode: '200'});

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
            // Replace the keys from excel object with server side keys
            flowController.on('0', function (mongoData) {

                (showConsole) ? console.log('IC-0') : '';

                var updatedExcelKeysArray = [];

                async.eachSeries(mongoData, function (element, callback) {

                    var obj = JSON.stringify(element);

                    obj = obj.replace(/Batch/g, 'batch');
                    obj = obj.replace(/BoxType/g, 'boxType');
                    obj = obj.replace(/BoxNo/g, 'boxNo');
                    obj = obj.replace(/NetWeight/g, 'netWeight');
                    obj = obj.replace(/Pieces/g, 'pieces');
                    obj = obj.replace(/PalletType/g, 'palletType');
                    obj = obj.replace(/PalletSize/g, 'palletSize');
                    obj = obj.replace(/PalletNo/g, 'palletNo');
                    obj = obj.replace(/CustomPalletNumber/g, 'customPalletNumber');
                    obj = obj.replace(/Material/g, 'material');
                    obj = obj.replace(/Rack/g, 'rack');
                    obj = obj.replace(/SalesDocument/g, 'salesDocument');
                    obj = obj.replace(/NetWeightinLBS/g, 'netWeightinLBS'); // NO CHANGE ITS CORRECT
                    obj = obj.replace(/GrossWeight/g, 'grossWeight');
                    obj = obj.replace(/CreatedOn/g, 'createdOn');
                    obj = obj.replace(/Name1/g, 'name1');
                    obj = obj.replace(/MaterialDescription/g, 'materialDescription');
                    obj = obj.replace(/PurchaseOrderNumber/g, 'purchaseOrderNumber');
                    obj = obj.replace(/CustomerMaterialNumber/g, 'customerMaterialNumber');
                    obj = obj.replace(/SpecificLotno/g, 'specificLotNo');
                    obj = obj.replace(/GrossWeightInLbs/g, 'grossWeightInLbs');
                    obj = obj.replace(/TareWeightinLBs/g, 'tareWeightInLbs');

                    var newObject = JSON.parse(obj);

                    newObject.hasOwnProperty('boxNo') ? '' : newObject.boxNo = '';
                    newObject.hasOwnProperty('dropOffZone') ? '' : newObject.dropOffZone = '';
                    newObject.hasOwnProperty('customPalletNumber') ? '' : newObject.customPalletNumber = '';
                    newObject.hasOwnProperty('palletNo') ? '' : newObject.palletNo = '';

                    updatedExcelKeysArray.push(newObject);

                    setImmediate(callback);
                }, function (err) {
                    if (err) {

                        flowController.emit('ALERT', {message: err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', updatedExcelKeysArray);
                    }
                });
            });
            //
            // Validate data against customer address
            flowController.on('1', function (mongoData) {

                (showConsole) ? console.log('IC-1') : '';

                var mongoDataArray = [];
                var customerAddressColumnArray = [];

                var count = 0;

                async.eachSeries(mongoData, function (element, callback) {

                    count++;
                    console.log('validation line item: ' + count);
                    if (element.boxNo == '') {

                        validationErrorArray.push({message: "Box No. can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (customerAddressColumnArray.indexOf(element.boxNo) > -1) {

                        validationErrorArray.push({message: "Same Box No. " + element.boxNo + " for more than one location found!  See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else {

                        customerAddressColumnArray.push(element.boxNo);

                        itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMaster) {
                            if (err) {

                                validationErrorArray.push({message: err});
                                setImmediate(callback);
                            } else if (itemMaster == null) {

                                validationErrorArray.push({message: 'Details of Material : ' + element.material + " not available in system! See line no. " + count + " in Excel file."});
                                setImmediate(callback);
                            } else {

                                element.itemMasterId = String(itemMaster._id);
                                var customerAddress = element.rack.toUpperCase();

                                locationStoreModel.findOne({"customerAddress": customerAddress, "activeStatus": 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        callback(err);
                                    } else if (locationStoreRow == null) {

                                        validationErrorArray.push({message: 'Location : ' + element.rack + " mismatch in Warehouse."});
                                        setImmediate(callback);
                                    } else {

                                        element.locationStoreId = String(locationStoreRow._id);
                                        mongoDataArray.push(element);
                                        setImmediate(callback);
                                    }
                                });
                            }
                        });
                    }
                }, function (err) {
                    if (err)
                        flowController.emit('ALERT', err);
                    else if (validationErrorArray.length > 0)
                        flowController.emit('ALERT', {message: 'Following erros occurred while uploading customer addresses', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    else
                        flowController.emit('2', mongoDataArray);
                });
            });
            //
            //compare Excel data to inventory
            flowController.on('2', function (mongoLocationArray) {

                (showConsole) ? console.log('IC-2') : '';

                var count = 1;

                async.eachSeries(mongoLocationArray, function (element, callback) {
                    count++;
                    console.log('current line item: ' + count);
                    var itemMasterId = element.itemMasterId;
                    var locationStoreId = element.locationStoreId;
                    var palletNumber = element.PalletNo;

                    itemStoreModel.findOne({'itemSerialNumber': element.boxNo, "activeStatus": 1}, function (err, itemStoreRow) {
                        if (err) {
                            // Unexpected Error pccurred
                            validationErrorArray.push({message: err});
                            setImmediate(callback);
                        } else if (itemStoreRow == null) {
                            // Item not available in warehouse
                            validationErrorArray.push({message: 'No item with this Box No. ' + element.boxNo + " available in system."});
                            setImmediate(callback);
                        } else if (itemStoreRow.itemMasterId != itemMasterId) {
                            // Material mismatched
                            validationErrorArray.push({message: 'Material of Box No. ' + element.boxNo + " mismatched!"});
                            setImmediate(callback);
                        } else if (itemStoreRow.locationStoreId != locationStoreId) {
                            // Material mismatched
                            validationErrorArray.push({message: 'Location of Box No. ' + element.boxNo + " mismatched!"});
                            setImmediate(callback);
                        } else if (element.PalletNo && itemStoreRow.palletNumber != palletNumber) {
                            // Material mismatched
                            validationErrorArray.push({message: 'Pallet Number Mismatched! Pallet Number for Box No. ' + element.boxNo + ' in system is ' + itemStoreRow.palletNumber});
                            setImmediate(callback);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ALERT', err);
                    else if (validationErrorArray.length != 0)
                        flowController.emit('ALERT', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    else
                        flowController.emit('ALERT', {message: 'Inventory comparison completed!', status: 'success', statusCode: '200'});
                });
            });
            //
            // Alert
            flowController.on('ALERT', function (response) {

                (showConsole) ? console.log('IC-ALERT') : '';
                (showConsole) ? console.log(response) : '';
                var dataObject = {
                    MODULE: 'IMPORT-INVENTORY COMPARISION-ADD',
                    ERRORMESSAGE: response.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });

                if (response.status == 'error') {
                    require("fs").unlink(path, function () {
                    });
                }
                flowController.emit('ALERT-FILE', response);
            });
            //
            //
            flowController.on('ALERT-FILE', function (error) {

                (showConsole) ? console.log('IC-ALERT-FILE') : '';

                if (error.status == 'error') {
                    var model = mongoXlsx.buildDynamicModel(error.validationErrors);

                    var fileName = 'ICERROR_' + moment(new Date()).format('DDMMYYYYHHMMSS') + ".xlsx";

                    var optionObject = {
                        save: true,
                        sheetName: [],
                        fileName: fileName,
                        path: "./public/files/inventory-compare/inventory-alerts/",
                        defaultSheetName: "worksheet"
                    };

                    mongoXlsx.mongoData2Xlsx(error.validationErrors, model, optionObject, function (err, result) {

                        var fileName = baseImageUrl + '/files/inventory-compare/inventory-alerts/' + result.fileName;
                        var message = 'Inventory mismatched! <a href="' + fileName + '" _target="blank">Click Here</a>';
                        flowController.emit('ALERT-MESSAGE', message);
                    });
                } else {

                    var message = error.message;
                    flowController.emit('ALERT-MESSAGE', message);
                }
            });
            //
            //
            flowController.on('ALERT-MESSAGE', function (message) {

                (showConsole) ? console.log('IC-ALERT-MESSAGE') : '';

                dataObject = {};
                dataObject.warehouseId = warehouseId;
                dataObject.textName = message;
                dataObject.module = 'INVENTORY-COMPARISON';
                dataObject.name = 'INVENTORY COMPARISON';
                dataObject.id = '';

                alertService.createAlert(dataObject, function (err, response) {
                    if (err)
                        console.log('err while adding alert ' + err);
                    else
                        console.log('Alert regarding inventory comparison added to system ');
                });
            });
            //
            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log('IC-END') : '';

                res.json(result);
            });
            //
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('IC-ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;