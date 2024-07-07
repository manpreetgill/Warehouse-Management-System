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
var json2csv = require('json2csv');
//---------------------------------------------------------------------------------------------------------------------------
var pathPickSubList = './logs/dailyLog/inwardSubListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var currentActiveStatusService = require('../../../service-functions/functions-currentActivityStatusService');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var inwardListModel = require('../../../models/mongodb/processMaster-inwardList/collection-inwardList.js');
var inwardSubListModel = require('../../../models/mongodb/processMaster-inwardSubList/collection-inwardSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var cyberneticFilesModel = require('../../../models/mongodb/processMaster-cyberneticFiles/collection-cyberneticFiles.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// PICKLIST MANUAL : Import action (GBL Specific)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/create/manual-import/')

        .post(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var fileName = req.body.fileName.trim();

            var createdBy = req.body.createdBy.trim();

            var date = moment(new Date()).format('DD/MM/YY');

            var fileXLS = req.body.fileXLS;

            var path = "./public/files/upload/pick/" + fileName;

            var directories = ["./public/files/upload/", "./public/files/upload/pick/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();
            //
            // Save file and iterate through
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                require("fs").writeFile(path, fileXLS, 'base64', function (err) {
                    if (err) {

                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        var model = null;

                        mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('0', mongoData);
                            }
                        });
                    }
                });
            });
            //
            // Initial validation to check if more than one sheets available
            flowController.on('0', function (mongoData) {

                (showConsole) ? console.log('0') : '';

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(path, function () {
                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});

                    });
                } else {

                    flowController.emit('1', mongoData);
                }
            });
            //
            // Replace the keys from excel object with server side keys
            flowController.on('1', function (mongoData) {

                (showConsole) ? console.log('1') : '';

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
                    obj = obj.replace(/DropoffZone/g, 'dropOffZone');

                    var newObject = JSON.parse(obj);

                    newObject.hasOwnProperty('boxNo') ? '' : newObject.boxNo = '';
                    newObject.hasOwnProperty('dropOffZone') ? '' : newObject.dropOffZone = '';
                    newObject.hasOwnProperty('customPalletNumber') ? '' : newObject.customPalletNumber = '';
                    newObject.hasOwnProperty('palletNo') ? '' : newObject.palletNo = '';

                    updatedExcelKeysArray.push(newObject);

                    setImmediate(callback);
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', updatedExcelKeysArray);
                    }
                });
            });
            //
            // Get holding types details
            flowController.on('2', function (updatedExcelKeysArray) {

                (showConsole) ? console.log('2') : '';

                holdingTypeModel.findOne({'name': 'PALLET', 'activeStatus': 1}, function (err, holdingTypePalletRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (holdingTypePalletRow == null) {

                        flowController.emit('ERROR', {message: 'Holding type details of PALLET not available! Add required holding type first.', status: 'error', statusCode: '500'});
                    } else {

                        holdingTypeModel.findOne({'name': 'BOX', 'activeStatus': 1}, function (err, holdingTypeBoxRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (holdingTypeBoxRow == null) {

                                flowController.emit('ERROR', {message: 'Holding type details of BOX not available! Add required holding type first.', status: 'error', statusCode: '500'});
                            } else {

                                holdingTypeModel.findOne({'name': 'ANY', 'activeStatus': 1}, function (err, holdingTypeAnyRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR! ' + err, status: 'error', statusCode: '500'});
                                    } else if (holdingTypePalletRow == null) {

                                        flowController.emit('ERROR', {message: 'Holding type details of ANY not available! Add required holding type first.', status: 'error', statusCode: '500'});
                                    } else {

                                        holdingType = {};
                                        holdingType.palletId = holdingTypePalletRow._id;
                                        holdingType.boxId = holdingTypeBoxRow._id;
                                        holdingType.anyId = holdingTypeAnyRow._id;

                                        flowController.emit('3', holdingType, updatedExcelKeysArray);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Validation
            flowController.on('3', function (holdingTypeObject, updatedExcelKeysArray) {

                (showConsole) ? console.log('2.1') : '';

                palletNumberArray = [];
                customPalletNumberArray = [];
                serialNumberArray = [];
                itemCodeArray = [];

                allowedPalletTypes = ['F', 'L', 'H', 'O'];
                allowedPalletSizes = ['A', 'B', 'C'];

                var validationErrorArray = [];

                count = 1;

                locations = {};

                async.eachSeries(updatedExcelKeysArray, function (element, callback) {

                    count++;
                    //console.log('Line: ' + count);

                    if (!element.batch) {

                        validationErrorArray.push({message: "Batch can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.boxNo) {

                        validationErrorArray.push({message: "Box No. can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.material) {

                        validationErrorArray.push({message: "Material can't be blank! See line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.rack) {

                        validationErrorArray.push({message: "Rack(Current location of item as per Cybernatic) can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else if (!element.dropOffZone) {

                        validationErrorArray.push({message: "DropOff Zone/Location can't be blank! See Line no. " + count + " in Excel file."});
                        setImmediate(callback);
                    } else {

                        var timeStamp = ((parseInt(element.createdOn) - 25569) * 86400) * 1000;
                        var newCreatedOn = moment(timeStamp).format('DD/MM/YY');
                        element.createdOn = newCreatedOn;
                        var itemCode = element.material;

                        locationStoreModel.findOne({'customerAddress': element.rack, activeStatus: 1}, function (err, rackLocationStoreRow) {
                            if (err) {

                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                setImmediate(callback);
                            } else if (rackLocationStoreRow == null) {

                                validationErrorArray.push({message: 'Details of Rack location ' + element.rack + ' not available in system. See line no. ' + count + ' in Excel file.'});
                                setImmediate(callback);
                            } else {

                                itemMasterModel.findOne({'itemCode': element.material, activeStatus: 1}, function (err, itemMasterRow) {
                                    if (err) {

                                        validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                        setImmediate(callback);
                                    } else if (itemMasterRow == null) {

                                        validationErrorArray.push({message: 'Details of Item code ' + itemCode + ' not available in system.'});
                                        setImmediate(callback);
                                    } else {
                                        var serialNumber = element.boxNo;
                                        var palletNumber = element.palletNo;

                                        itemStoreModel.findOne({'itemSerialNumber': serialNumber, 'activeStatus': 1}, function (err, itemStoreRow) {
                                            if (err) {

                                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                                setImmediate(callback);
                                            } else if (itemStoreRow == null) {

                                                validationErrorArray.push({message: 'Box No. ' + serialNumber + ' not available in warehouse!'});
                                                setImmediate(callback);
                                            } else if (itemStoreRow.locationStoreId != String(rackLocationStoreRow._id)) {
                                                // Check if the current location of this item provided by excel file is matching the location in inventory
                                                locationStoreModel.findOne({'_id': itemStoreRow.locationStoreId, activeStatus: 1}, function (err, itemSerialNumberLocationStoreRow) {
                                                    if (err) {

                                                        validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                                        setImmediate(callback);
                                                    } else if (itemSerialNumberLocationStoreRow == null) {

                                                        validationErrorArray.push({message: 'Details of current location of Box No. ' + serialNumber + ' not available in system.'});
                                                        setImmediate(callback);
                                                    } else {

                                                        validationErrorArray.push({message: 'Data mismatched! As per the system, current location(Rack) of Box No. ' + serialNumber + ' is ' + itemSerialNumberLocationStoreRow.customerAddress + '! See Line no. ' + count + ' in Excel file.'});
                                                        setImmediate(callback);
                                                    }
                                                });
                                            } else {
                                                if (palletNumber == '') {
                                                    // Check if system location has pallet number or not
                                                    if (itemStoreRow.palletNumber) {

                                                        validationErrorArray.push({message: 'Data mismatched! As per the system, Box No. ' + serialNumber + ' is present over the Pallet No. ' + itemStoreRow.palletNumber + '! See Line no. ' + count + ' in Excel file.'});
                                                        setImmediate(callback);
                                                    } else {
                                                        // Check if loose box is going at pallet location
                                                        locationStoreModel.findOne({'customerAddress': element.dropOffZone, activeStatus: 1}, function (err, locationStoreRow) {
                                                            if (err) {

                                                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                                                setImmediate(callback);
                                                            } else if (locationStoreRow == null) {

                                                                validationErrorArray.push({message: 'Location ' + element.dropOffZone + ' not available in warehouse!  See Line no. ' + count + ' in Excel file.'});
                                                                setImmediate(callback);
                                                            } else {

                                                                var holdingType = locationStoreRow.holdingType;

                                                                if (holdingType == null) {

                                                                    validationErrorArray.push({message: 'Holding type for location ' + element.dropOffZone + ' not available! Holding type should be defined!'});
                                                                    setImmediate(callback);
                                                                } else if (holdingType == holdingTypeObject.palletId) {

                                                                    validationErrorArray.push({message: 'Location ' + element.dropOffZone + ' hold PALLETS Only! Loose box not allowed here, However you can update the holding type of location & related Capacity via Location Master.'});
                                                                    setImmediate(callback);
                                                                } else {

                                                                    var key = element.dropOffZone;

                                                                    if (serialNumber != '') {

                                                                        (locations[key] == undefined) ? locations[key] = [] : '';
                                                                        ((locations[key].indexOf(serialNumber)) == -1) ? locations[key].push(serialNumber) : '';
                                                                        serialNumberArray.push(element);
                                                                        setImmediate(callback);

                                                                    } else {

                                                                        (locations[key] == undefined) ? locations[key] = [] : '';
                                                                        ((locations[key].indexOf(element.material)) == -1) ? locations[key].push(element.material) : '';
                                                                        itemCodeArray.push(element);
                                                                        setImmediate(callback);
                                                                    }
                                                                }
                                                            }
                                                        });
                                                    }
                                                } else {

                                                    //if (!element.palletType || !element.palletSize) {
                                                    //
                                                    //    validationErrorArray.push({message: 'Pallet Type and Pallet Size both must be reqired! See line no. ' + count + ' in the excel file.'});
                                                    //    setImmediate(callback);
                                                    //} else if ((allowedPalletTypes.indexOf(element.palletType) == -1) || (allowedPalletSizes.indexOf(element.palletSize) == -1)) {
                                                    //
                                                    //    validationErrorArray.push({message: 'Values of Pallet Type and Pallet Size must belongs to allowed List of Values! See line no. ' + count + ' in the excel file.'});
                                                    //    setImmediate(callback);
                                                    //} else if (element.palletType == 'O' && element.customPalletNumber == '') {// Outer pallet must have CPN
                                                    //
                                                    //    validationErrorArray.push({message: 'Pallet No. ' + palletNumber + ' is of type OUTER! Custom Pallet Number should be present! See line no. ' + count + ' in the excel file.'});
                                                    //    setImmediate(callback);
                                                    //} else {
                                                    if (!itemStoreRow.palletNumber) {

                                                        validationErrorArray.push({message: 'Data mismatched! As per the system, Box No. ' + serialNumber + ' is a Loose Box & not present over the Pallet No. ' + palletNumber + '! See Line no. ' + count + ' in Excel file.'});
                                                        setImmediate(callback);
                                                    } else if (itemStoreRow.palletNumber != palletNumber) {

                                                        validationErrorArray.push({message: 'Details of Pallet No. mismatched! As per the system, Box No. ' + serialNumber + ' is present over the Pallet No. ' + itemStoreRow.palletNumber + '! See Line no. ' + count + ' in Excel file.'});
                                                        setImmediate(callback);
                                                    } else {

                                                        itemStoreModel.findOne({'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStore2Row) {
                                                            if (err) {

                                                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                                                setImmediate(callback);
                                                            } else if (itemStore2Row == null) {

                                                                validationErrorArray.push({message: 'Pallet No. ' + palletNumber + ' not available in warehouse! See Line no. ' + count + ' in Excel file.'});
                                                                setImmediate(callback);
                                                            } else {

//                                                            if ((itemStore2Row.randomFields[0].palletType != element.palletType) || (itemStore2Row.randomFields[0].palletSize != element.palletSize)) {
//
//                                                                console.log({message: 'Pallet Type/Size Mismatched! Pallet Type/Size available in system are (' + itemStore2Row.randomFields[0].palletType + '/' + itemStore2Row.randomFields[0].palletSize + ').'});
//                                                            }

                                                                // Check if loose box is going at pallet location
                                                                locationStoreModel.findOne({'customerAddress': element.dropOffZone, activeStatus: 1}, function (err, locationStoreRow) {
                                                                    if (err) {

                                                                        validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                                                        setImmediate(callback);
                                                                    } else if (locationStoreRow == null) {

                                                                        validationErrorArray.push({message: 'Location ' + element.dropOffZone + ' not available in warehouse!  See Line no. ' + count + ' in Excel file.'});
                                                                        setImmediate(callback);
                                                                    } else {

                                                                        var holdingType = locationStoreRow.holdingType;

                                                                        if (holdingType == null) {

                                                                            validationErrorArray.push({message: 'Holding type for location ' + element.dropOffZone + ' not available! Holding type should be defined!'});
                                                                            setImmediate(callback);
                                                                        } else if (holdingType == holdingTypeObject.boxId) {

                                                                            validationErrorArray.push({message: 'Location ' + element.dropOffZone + ' hold LOOSE BOX Only! Pallet not allowed. However you can update the holding type of location & related Capacity via Location Master.  See Line no. ' + count + ' in Excel file.'});
                                                                            setImmediate(callback);
                                                                        } else {

                                                                            var key = element.dropOffZone;

                                                                            if (element.customPalletNumber != '') {

                                                                                (locations[key] == undefined) ? locations[key] = [] : '';
                                                                                ((locations[key].indexOf(element.customPalletNumber)) == -1) ? locations[key].push(element.customPalletNumber) : '';
                                                                                customPalletNumberArray.push(element);
                                                                                setImmediate(callback);
                                                                            } else {

                                                                                (locations[key] == undefined) ? locations[key] = [] : '';
                                                                                ((locations[key].indexOf(palletNumber)) == -1) ? locations[key].push(palletNumber) : '';
                                                                                palletNumberArray.push(element);
                                                                                setImmediate(callback);
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                    //}
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
                        var currentFilteredObjects = palletNumberArray.length + customPalletNumberArray.length + itemCodeArray.length + serialNumberArray.length;

                        if (validationErrorArray.length != 0) {

                            flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                        } else if (currentFilteredObjects != totalObjects) {

                            flowController.emit('ERROR', {message: 'Line rows getting missed out! Some components are not according to system requirements.', status: 'error', statusCode: '304'});
                        } else {

                            flowController.emit('4.0', locations, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray);
                        }
                    }
                });
            });
            //
            //
            flowController.on('4.0', function (locationsObject, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('4.0') : '';

                var locationCapacityArray = [];

                for (var key in locationsObject) {

                    var object = {};
                    object.location = key;
                    object.capacity = locationsObject[key].length;
                    locationCapacityArray.push(object);
                }

                flowController.emit('4.1', locationCapacityArray, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray);
            });
            //
            //
            flowController.on('4.1', function (locationCapacityArray, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('4.1') : '';

                validationErrorArray = [];

                async.eachSeries(locationCapacityArray, function (element, callback) {

                    locationStoreModel.findOne({customerAddress: element.location, activeStatus: 1}, function (err, locationStoreRow) {
                        if (err) {

                            validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
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
                            flowController.emit('4.2', customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray);
                        }
                    }
                });
            });
            //
            // Check if all outers are present in Sublist (OUTER Pallets)
            flowController.on('4.2', function (customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('4.2') : '';

                CPNArray = [];
                CPNPalletArray = [];
                var locations = {};
                validationErrorArray = [];

                async.waterfall([
                    // Get all CPN and pallet numbers.
                    function (waterfallcallback) {

                        async.eachSeries(customPalletNumberArray, function (element, callback) {

                            var key = element.customPalletNumber;
                            var value = element.dropOffZone;
                            (locations[key] == undefined) ? locations[key] = [] : '';
                            (locations[key].indexOf(value) == -1) ? locations[key].push(value) : '';

                            if (CPNArray.indexOf(element.customPalletNumber) == -1) {

                                CPNArray.push(element.customPalletNumber);
                            }

                            if (CPNPalletArray.indexOf(element.palletNo) == -1) {

                                CPNPalletArray.push(element.palletNo);
                            }
                            setImmediate(callback);

                        }, function (err) {
                            if (err) {

                                waterfallcallback(err);
                            } else {

                                waterfallcallback(null);
                            }
                        });
                    },
                    // Check if all pallets against CPN exists or not.
                    function (waterfallcallback) {

                        addedPallets = [];

                        async.eachSeries(CPNArray, function (element, callback) {

                            itemStoreModel.find({'customPalletNumber': element, 'activeStatus': 1}).select('palletNumber customPalletNumber').exec(function (err, itemStoreRow) {

                                if (err) {

                                    callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (itemStoreRow.length == 0) {

                                    validationErrorArray.push({message: "No inventory with Custom pallet No. " + element + " available in warehouse."});
                                    setImmediate(callback);
                                } else {

                                    async.eachSeries(itemStoreRow, function (element2, callback2) {

                                        if (CPNPalletArray.indexOf(element2.palletNumber) == -1) {

                                            if (addedPallets.indexOf(element2.palletNumber) == -1) {

                                                validationErrorArray.push({message: "OUTER Pallet No. " + element2.palletNumber + " is missing from list of outer pallets belonging to Custom pallet No. " + element2.customPalletNumber + "! Partial OUTER Pick not allowed."});
                                                addedPallets.push(element2.palletNumber);
                                            }
                                            setImmediate(callback2);
                                        } else {
                                            setImmediate(callback2);
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

                                waterfallcallback(err);
                            } else {

                                waterfallcallback(null);
                            }
                        });
                    }
                    // Final result
                ], function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        if (customPalletNumberArray.length != 0 && validationErrorArray.length != 0) {

                            flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                        } else {

                            flowController.emit('4.3', locations, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray);
                        }
                    }
                });
            });
            //
            // Convert object to array for further validation processing on outer case
            flowController.on('4.3', function (locationsObject, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('4.3') : '';
                (showConsole) ? console.log(locationsObject) : '';

                var locationAddressArray = [];

                for (var key in locationsObject) {

                    var object = {};
                    object.customPalletNumber = key;
                    object.dropOffAddress = locationsObject[key];
                    locationAddressArray.push(object);

                }

                flowController.emit('4.4', locationAddressArray, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray);
            });
            //
            // Validation error for outers
            flowController.on('4.4', function (locationAddressArray, customPalletNumberArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('4.4') : '';
                (showConsole) ? console.log(locationAddressArray) : '';
                validationErrorArray = [];

                async.eachSeries(locationAddressArray, function (element, callback) {

                    var dropOffAddress = element.dropOffAddress;

                    var uniqueAddresses = [...new Set(dropOffAddress)];

                    if (uniqueAddresses.length > 1) {

                        validationErrorArray.push({message: 'DropoffZone of all line items belonging to Custom pallet number(CPN): ' + element.customPalletNumber + ' must be same! Dropping at different locations not allowed.'});
                    }
                    setImmediate(callback);
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {
                        if (validationErrorArray.length != 0) {

                            flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                        } else {

                            combinedArray = palletNumberArray.concat(customPalletNumberArray);
                            flowController.emit('5', combinedArray, serialNumberArray, itemCodeArray);
                        }
                    }
                });
            });
            //
            // Get Pick function area and allowed zones for it
            flowController.on('5', function (palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('5') : '';

                functionAreaArray = [];

                functionAreaModel.find({'name': {'$in': ['REPROCESS', 'STORAGE']}, 'activeStatus': 1}, function (err, functionAreaRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
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

                                locationStoreModel.find({'function': {'$in': functionAreaArray}, 'activeStatus': 1}).distinct('zoneId', function (err, allowedZoneArray) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (allowedZoneArray.length == 0) {

                                        flowController.emit('ERROR', {message: 'No locations configured for function area of allowed Pick Process in warehouse yet!', status: 'error', statusCode: '200'});
                                    } else {

                                        flowController.emit('6', allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //
            // Create picklist
            flowController.on('6', function (allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('6') : '';

                var newPickList = new inwardListModel();

                newPickList.hopperPriority = 2;
                newPickList.createdBy = createdBy;
                newPickList.timeCreated = timeInInteger;
                newPickList.save(function (err, insertedRecordDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('7', insertedRecordDetails._id, allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray);
                    }
                });
            });
            //
            // Picklist Manual upload details to be updated to Picklist
            flowController.on('7', function (inwardListId, allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('7') : '';

                inwardListModel.findOne({'_id': inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {

                    inwardListRow.referenceFile = fileName; //Pick_15028630872
                    inwardListRow.mode = 'MANUAL';
                    inwardListRow.save(function (err) {

                        flowController.emit('8', inwardListId, allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray);
                    });
                });
            });
            //
            // Pallet number based PickSublists
            flowController.on('8', function (inwardListId, allowedZoneArray, palletNumberArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('8') : '';

                var completedPallets = [];
                var validationErrorArray = [];
                var palletInsertionArray = [];

                async.eachSeries(palletNumberArray, function (element, callback) {

                    data = {};

                    var palletNumber = String(element.palletNo);

                    async.waterfall([
                        // Get items over pallet and its master data 
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.1') : '';

                            if (completedPallets.indexOf(palletNumber) == -1) {

                                itemCode = element.material;

                                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                    } else if (itemMasterRow == null) {

                                        waterfallcallback({message: "No item master details for item code " + itemCode + " available in warehouse."});
                                    } else {

                                        var itemMasterId = String(itemMasterRow._id);

                                        itemStoreModel.find({'palletNumber': palletNumber, 'activeStatus': 1}, function (err, itemStoreRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                            } else if (itemStoreRow == null) {

                                                waterfallcallback({message: "Pallet No. " + palletNumber + " not available in warehouse Inventory."});
                                            } else if (itemStoreRow[0].itemMasterId != itemMasterId) {

                                                waterfallcallback({message: "Pallet No. " + palletNumber + " and its associated Item Code " + element.material + " mismatched in inventory."});
                                            } else if (!('locationStoreId' in itemStoreRow[0])) {

                                                waterfallcallback({message: "Put activity for Pallet No. " + palletNumber + " not completed yet!"});
                                            } else {

                                                data.itemStore = itemStoreRow;
                                                data.itemMaster = itemMasterRow;
                                                waterfallcallback(null);
                                            }
                                        });
                                    }
                                });
                            } else {
                                waterfallcallback('BYPASS');
                            }
                        },
                        // Check if pallet is of OUTER
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.2') : '';

                            var itemStoreRow = data.itemStore[0];

                            var palletType = itemStoreRow.randomFields[0].palletType;
                            // If the pallet is OUTER then CPN must be present & if not present that means PALLET is in REPROCESSING area
                            if (palletType == 'O') {

                                var customPalletNumber = (itemStoreRow.customPalletNumber) ? itemStoreRow.customPalletNumber : '';

                                if (customPalletNumber == '') {

                                    waterfallcallback({message: "Pallet No. " + palletNumber + " is an OUTER pallet & is undergoing REPROCESSING! PICK activity not allowed until the activity gets completed."});
                                } else {

                                    waterfallcallback(null);
                                }
                            } else {

                                waterfallcallback(null);
                            }
                        },
                        // Get pick process function area
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.3') : '';

                            functionAreaModel.findOne({'name': 'STORAGE', 'activeStatus': 1}, function (err, functionAreaRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (functionAreaRow == null) {

                                    waterfallcallback({message: 'Function area for pick missing! Records tampered/removed from system.'});
                                } else {

                                    data.pickFunctionArea = functionAreaRow;
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get pick location of pallet based on current inventory & validate 
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.4') : '';

                            var locationStoreId = data.itemStore[0].locationStoreId;

                            locationStoreModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (pickLocationStoreRow == null) {

                                    waterfallcallback({message: "Current location of Pallet No. " + palletNumber + " missing from warehouse! Contact warehouse administrator."});
                                } else if (pickLocationStoreRow.availability != 'A') {

                                    waterfallcallback({message: "Pick location of Pallet No. " + palletNumber + " is blocked!"});
                                } else {

                                    if (pickLocationStoreRow.customerAddress != element.rack/*.substr(2)*/) {

                                        // Add alert
                                    }

                                    if (allowedZoneArray.indexOf(pickLocationStoreRow.zoneId) == -1) {

                                        waterfallcallback({message: "Pallet No. " + palletNumber + " does not belongs to Pick process allowed zones."});
                                    } else {

                                        data.pickLocation = pickLocationStoreRow;
                                        waterfallcallback(null);
                                    }
                                }
                            });
                        },
                        // Check if Pallet scheduled for Pick activity before
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.5') : '';

                            inwardSubListModel.find({'status': {"$lt": 31}, 'itemType': 'PALLET', 'itemValue': palletNumber, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (inwardSubListRow.length != 0) {

                                    waterfallcallback({message: "Pallet No. " + palletNumber + " already scheduled for Pick!"});
                                } else {

                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get Drop off Zone Details
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.6') : '';

                            locationStoreModel.findOne({'customerAddress': element.dropOffZone, 'availability': 'A', 'activeStatus': 1}, function (err, dropLocationStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (dropLocationStoreRow == null) {

                                    waterfallcallback({message: "Drop location is not available or blocked! Can't proceed further."});
                                } else {

                                    var length = dropLocationStoreRow.locationProperties.length;
                                    if (length == 0) {

                                        waterfallcallback({message: "Capacity of the location not defined yet."});
                                    } else {

                                        var userDefinedCapacity = dropLocationStoreRow.locationProperties[0].userDefinedCapacity;

                                        if (userDefinedCapacity != "") {

                                            data.skipLocationCapacity = (userDefinedCapacity == "-1") ? 'YES' : 'NO';
                                            data.dropLocation = dropLocationStoreRow;
                                            waterfallcallback(null);
                                        } else {
                                            // capacity calculation part
                                            waterfallcallback({message: "System defined calculation coming soon."});
                                        }
                                    }
                                }
                            });
                        },
                        // Valid pick process drop zones
                        function (waterfallcallback) {
                            // Get data about drop location functions                            
                            (showConsole) ? console.log('8.7') : '';

                            dropFunctionArea = [];

                            functionAreaModel.find({'name': {'$in': ['STORAGE', 'SCRAP', 'DISPATCH', 'REPROCESS']}, 'activeStatus': 1}, function (err, functionAreaRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (functionAreaRow == null) {

                                    flowController.emit('ERROR', {message: 'Function area for pick missing! Records tampered/removed from system.', status: 'error', statusCode: '200'});
                                } else {

                                    async.eachSeries(functionAreaRow, function (element, callback) {

                                        dropFunctionArea.push(String(element._id));
                                        setImmediate(callback);
                                    }, function (err) {
                                        if (err) {

                                            flowController.emit('ERROR', err);
                                        } else {

                                            functionAreaModel.findOne({'name': 'DISPATCH', 'activeStatus': 1}, function (err, functionAreaRow3) {

                                                if (data.dropLocation.function == String(functionAreaRow3._id)) {

                                                    data.isDispatch = 'YES';
                                                } else {
                                                    data.isDispatch = 'NO';
                                                }

                                                data.dropFunctionArea = dropFunctionArea;
                                                waterfallcallback(null);
                                            });
                                        }
                                    });
                                }
                            });
                        },
                        // Check drop location holding type
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.8') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationHoldingType = data.dropLocation.holdingType;

                                holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '404'});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: "Drop location's Holding type details tampered/modified!"});
                                    } else {

                                        holdingType = holdingTypeRow.name;

                                        if (holdingType != 'PALLET') {

                                            if (holdingType != 'ANY') {

                                                waterfallcallback({message: "Pallet not allowed to be put at location " + data.dropLocation.customerAddress + " as the location is a Non-Pallet location! However, you can allow pallets to be dropped here by changing the properties of " + data.dropLocation.customerAddress + " in Location Master."});
                                            } else {

                                                waterfallcallback(null);
                                            }
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after put
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.9') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null, 0);
                            } else if (data.skipLocationCapacity == 'YES') {

                                waterfallcallback(null, 0);
                            } else {
                                var dropLocationId = String(data.dropLocation._id);

                                putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, putSubListRow) {

                                    if (putSubListRow.length == 0) {

                                        waterfallcallback(null, 0);
                                    } else {

                                        availableCapacity = data.dropLocation.availableCapacity;

                                        var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                                        var remaining = availableCapacity - suggestedCount;

                                        if (remaining >= 1) {

                                            waterfallcallback(null, suggestedCount);
                                        } else {

                                            waterfallcallback({message: "Capacity at drop location " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining});
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after pick
                        function (putReservedCapacity, waterfallcallback) {

                            (showConsole) ? console.log('8.10') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else if (data.skipLocationCapacity == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationId = String(data.dropLocation._id);

                                inwardSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                    if (inwardSubListRow.length == 0) {

                                        var dropLocationAvailableAfterPut = data.dropLocation.availableCapacity - putReservedCapacity;

                                        if (dropLocationAvailableAfterPut < 1) {

                                            waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient. Current available capacity is: " + dropLocationAvailableAfterPut});
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    } else {

                                        var totalPickReservedCapacity = 0;

                                        async.eachSeries(inwardSubListRow, function (element, callback) {

                                            totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                            setImmediate(callback);

                                        }, function (err) {

                                            availableCapacity = data.dropLocation.availableCapacity;

                                            var remaining = ((availableCapacity - totalPickReservedCapacity) - putReservedCapacity);

                                            (showConsole) ? console.log('Remaining capacity at location after PICK: ' + remaining) : '';

                                            if (remaining >= 1) {

                                                waterfallcallback(null);
                                            } else {

                                                waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity is " + remaining});
                                            }
                                        });
                                    }
                                });
                            }
                        },
                        // Check if drop is in same area or different as per function defined
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.11') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                pickProcessFunction = String(data.pickFunctionArea._id);

                                dropLocationFunction = data.dropLocation.function;

                                if (data.dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                                    // Drop location function does not belongs to valid pick process drop functions
                                    waterfallcallback({message: "Drop location " + element.dropOff + " not allowed under valid Pick process drop zones."});
                                } else {

                                    if (pickProcessFunction == dropLocationFunction) {
                                        // Pick between same area
                                        data.isSameArea = 'YES';
                                        waterfallcallback(null);
                                    } else {
                                        data.isSameArea = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check for item reservation
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.12') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    var itemMasterId = String(data.itemMaster._id);

                                    if (data.dropLocation.isReservedForItem == 'YES') {

                                        if (data.dropLocation.reservedItemId.indexOf(itemMasterId) > -1) {

                                            if (data.dropLocation.reservedItemId.length > 1) {
                                                // Location reserved for more than one item including this one
                                                data.skipNext = 'NO';
                                                waterfallcallback(null);
                                            } else {
                                                // This item is reserved here so skip next step
                                                data.skipNext = 'YES';
                                                waterfallcallback(null); // skip next
                                            }
                                        } else {
                                            // Location is reserved for different items
                                            waterfallcallback({message: 'Location ' + data.dropLocation.customerAddress + ' is reserved for different item! Choose different location.'});
                                        }
                                    } else {
                                        // Location not reserved for any item
                                        data.skipNext = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check eligibility if item is not reserved but present or not OR empty location
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.13') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    if (data.dropLocation.assignedItemStoreId.length > 0) {

                                        conflictArray = [];

                                        var itemMasterRow = data.itemMaster;

                                        async.eachSeries(data.dropLocation.assignedItemStoreId, function (element2, callback2) {

                                            itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {

                                                if (itemStoreRow.itemMasterId == String(itemMasterRow._id)) {

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

                                                waterfallcallback({message: 'Drop location ' + data.dropLocation + ' contain exclusive items! This location is not eligible choose different location.'});
                                            } else if (itemMasterRow.exclusiveStorage === 'YES') {

                                                waterfallcallback({message: 'Item ' + data.itemMaster.itemCode + ' is self exclusive! Not allowed to be dropped at shared location ' + data.dropLocation.customerAddress});
                                            } else {

                                                waterfallcallback(null);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Serial number array and item store array
                        function (waterfallcallback) {

                            (showConsole) ? console.log('8.14') : '';

                            itemStoreRowObject = {};
                            itemStoreId = [];
                            itemSerialNumberArray = [];

                            async.eachSeries(data.itemStore, function (element, callback) {

                                itemStoreId.push(String(element._id));
                                ('itemSerialNumber' in element) ? itemSerialNumberArray.push(element.itemSerialNumber) : '';
                                setImmediate(callback);

                            }, function (err) {

                                itemStoreRowObject.itemStoreId = itemStoreId;
                                itemStoreRowObject.palletType = data.itemStore[0].randomFields[0].palletType;
                                itemStoreRowObject.palletSize = data.itemStore[0].randomFields[0].palletSize;
                                itemStoreRowObject.serialNumberArray = itemSerialNumberArray;

                                waterfallcallback(null, itemStoreRowObject);
                            });
                        },
                        // Create pick sublist 
                        function (itemStoreRowObject, waterfallcallback) {

                            (showConsole) ? console.log('8.15') : '';

                            var newInwardSubList = {};
                            newInwardSubList.inwardListId = inwardListId;
                            newInwardSubList.itemCode = data.itemMaster.itemCode;
                            newInwardSubList.itemType = 'PALLET';
                            newInwardSubList.itemValue = palletNumber;
                            (itemStoreRowObject.palletType === 'O') ? newInwardSubList.customPalletNumber = element.customPalletNumber : '';
                            newInwardSubList.pickActivity = 'FULL';
                            newInwardSubList.palletType = itemStoreRowObject.palletType;
                            newInwardSubList.palletSize = itemStoreRowObject.palletSize;
                            newInwardSubList.hopperPriority = 2;
                            newInwardSubList.itemStoreId = itemStoreRowObject.itemStoreId;
                            newInwardSubList.serialNumberArray = itemStoreRowObject.serialNumberArray;
                            newInwardSubList.itemDescription = data.itemMaster.itemDescription;
                            newInwardSubList.requiredQuantity = 1;
                            newInwardSubList.pickLocationId = data.pickLocation._id;
                            newInwardSubList.pickLocationAddress = data.pickLocation.customerAddress;
                            newInwardSubList.dropLocationId = data.dropLocation._id;
                            newInwardSubList.dropLocationAddress = data.dropLocation.customerAddress;
                            newInwardSubList.sequence = '';
                            newInwardSubList.createdBy = createdBy;
                            newInwardSubList.timeCreated = timeInInteger;

                            palletInsertionArray.push(newInwardSubList);
                            completedPallets.push(palletNumber);
                            waterfallcallback(null);
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            if (err == 'BYPASS') {
                                setImmediate(callback)
                            } else {
                                validationErrorArray.push(err);
                                setImmediate(callback);
                            }
                            ;
                        } else {
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304', tempId: inwardListId});
                    } else {

                        flowController.emit('9', inwardListId, allowedZoneArray, palletInsertionArray, serialNumberArray, itemCodeArray);
                    }
                });
            });
            //
            // Serial number based PickSublists
            flowController.on('9', function (inwardListId, allowedZoneArray, palletInsertionArray, serialNumberArray, itemCodeArray) {

                (showConsole) ? console.log('9') : '';

                var completedSerials = [];
                var validationErrorArray = [];
                var serialInsertionArray = [];

                async.eachSeries(serialNumberArray, function (element, callback) {

                    data = {};

                    var serialNumber = String(element.boxNo);

                    async.waterfall([
                        // Get items over pallet and its master data 
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.1') : '';

                            if (completedSerials.indexOf(serialNumber) == -1) {

                                itemCode = element.material;

                                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                    } else if (itemMasterRow == null) {

                                        waterfallcallback({message: "Item store missing! Records tampered/removed from system."});
                                    } else {

                                        var itemMasterId = String(itemMasterRow._id);

                                        itemStoreModel.findOne({'itemSerialNumber': serialNumber, 'palletNumber': {'$exists': false}, 'activeStatus': 1}, function (err, itemStoreRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                            } else if (itemStoreRow == null) {

                                                waterfallcallback({message: "Box No. " + serialNumber + " is not available or is associated with Pallet."});
                                            } else if (itemStoreRow.itemMasterId != itemMasterId) {

                                                waterfallcallback({message: "Box No. " + serialNumber + " and its associated Item Code " + element.material + " mismatched in inventory."});
                                            } else if (!('locationStoreId' in itemStoreRow)) {

                                                waterfallcallback({message: "Put activity for Box No. " + serialNumber + " not completed yet!"});
                                            } else {

                                                data.itemStore = itemStoreRow;
                                                data.itemMaster = itemMasterRow;
                                                waterfallcallback(null);
                                            }
                                        });
                                    }
                                });
                            } else {
                                waterfallcallback('BYPASS');
                            }
                        },
                        // Get pick process function area
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.2') : '';

                            functionAreaModel.findOne({'name': 'STORAGE', 'activeStatus': 1}, function (err, functionAreaRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (functionAreaRow == null) {

                                    waterfallcallback({message: 'Function area for pick missing! Records tampered/removed from system.'});
                                } else {

                                    data.pickFunctionArea = functionAreaRow;
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get pick location of Serial number based on current inventory & validate 
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.3') : '';

                            var locationStoreId = data.itemStore.locationStoreId;

                            locationStoreModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (pickLocationStoreRow == null) {

                                    waterfallcallback({message: "Current location of Box No. " + serialNumber + " missing from warehouse! Contact warehouse administrator."});
                                } else if (pickLocationStoreRow.availability != 'A') {

                                    waterfallcallback({message: "Pick location of Box No. " + serialNumber + " is blocked!"});
                                } else {

                                    if (pickLocationStoreRow.customerAddress != element.rack/*.substr(2)*/) {

                                        // Add alert
                                    }

                                    if (allowedZoneArray.indexOf(pickLocationStoreRow.zoneId) == -1) {

                                        waterfallcallback({message: "Box No. " + serialNumber + " does not belongs to Pick process allowed zones."});
                                    } else {

                                        data.pickLocation = pickLocationStoreRow;
                                        waterfallcallback(null);
                                    }
                                }
                            });
                        },
                        // Check if Pallet scheduled for Pick activity before
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.4') : '';

                            inwardSubListModel.find({'status': {"$lt": 31}, 'itemType': 'SERIALNUMBER', 'itemValue': serialNumber, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (inwardSubListRow.length != 0) {

                                    waterfallcallback({message: "Box No. " + serialNumber + " already scheduled for Pick!"});
                                } else {

                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get Drop off Zone Details
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.5') : '';

                            locationStoreModel.findOne({'customerAddress': element.dropOffZone, 'availability': 'A', 'activeStatus': 1}, function (err, dropLocationStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (dropLocationStoreRow == null) {

                                    waterfallcallback({message: "Drop location is not available or blocked! Can't proceed further."});
                                } else {

                                    var length = dropLocationStoreRow.locationProperties.length;
                                    if (length == 0) {

                                        waterfallcallback({message: "Capacity of the location not defined yet."});
                                    } else {

                                        var userDefinedCapacity = dropLocationStoreRow.locationProperties[0].userDefinedCapacity;

                                        if (userDefinedCapacity != "") {

                                            data.skipLocationCapacity = (userDefinedCapacity == "-1") ? 'YES' : 'NO';
                                            data.dropLocation = dropLocationStoreRow;
                                            waterfallcallback(null);
                                        } else {
                                            // capacity calculation part
                                            waterfallcallback({message: "System defined calculation coming soon."});
                                        }
                                    }
                                }
                            });
                        },
                        // Valid pick process drop zones
                        function (waterfallcallback) {
                            // Get data about drop location functions                            
                            (showConsole) ? console.log('9.6') : '';

                            dropFunctionArea = [];

                            functionAreaModel.find({'name': {'$in': ['STORAGE', 'SCRAP', 'DISPATCH', 'REPROCESS']}, 'activeStatus': 1}, function (err, functionAreaRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (functionAreaRow == null) {

                                    flowController.emit('ERROR', {message: 'Function area for pick missing! Records tampered/removed from system.', status: 'error', statusCode: '200'});
                                } else {

                                    async.eachSeries(functionAreaRow, function (element, callback) {

                                        dropFunctionArea.push(String(element._id));
                                        setImmediate(callback);
                                    }, function (err) {
                                        if (err) {

                                            flowController.emit('ERROR', err);
                                        } else {

                                            functionAreaModel.findOne({'name': 'DISPATCH', 'activeStatus': 1}, function (err, functionAreaRow3) {

                                                if (data.dropLocation.function == String(functionAreaRow3._id)) {

                                                    data.isDispatch = 'YES';
                                                } else {
                                                    data.isDispatch = 'NO';
                                                }

                                                data.dropFunctionArea = dropFunctionArea;
                                                waterfallcallback(null);
                                            });
                                        }
                                    });
                                }
                            });
                        },
                        // Check drop location holding type
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.7') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationHoldingType = data.dropLocation.holdingType;

                                holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: "Drop location's Holding type details tampered/modified!"});
                                    } else {

                                        holdingType = holdingTypeRow.name;

                                        if (holdingType == 'PALLET') {

                                            waterfallcallback({message: "Only Pallets are allowed at Location " + data.dropLocation.customerAddress + ". Loose box not allowed. However you can allow by changing properties of " + data.dropLocation.customerAddress + " in Location Master."});
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after put
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.8') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null, 0);
                            } else if (data.skipLocationCapacity == 'YES') {

                                waterfallcallback(null, 0);
                            } else {
                                var dropLocationId = String(data.dropLocation._id);

                                putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, putSubListRow) {

                                    if (putSubListRow.length == 0) {

                                        waterfallcallback(null, 0);
                                    } else {

                                        availableCapacity = data.dropLocation.availableCapacity;

                                        var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                                        var remaining = availableCapacity - suggestedCount;

                                        if (remaining >= 1) {

                                            waterfallcallback(null, suggestedCount);
                                        } else {

                                            waterfallcallback({message: "Capacity at drop location " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining});
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after pick
                        function (putReservedCapacity, waterfallcallback) {

                            (showConsole) ? console.log('9.9') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else if (data.skipLocationCapacity == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationId = String(data.dropLocation._id);

                                inwardSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                    if (inwardSubListRow.length == 0) {

                                        var dropLocationAvailableAfterPut = data.dropLocation.availableCapacity - putReservedCapacity;

                                        if (dropLocationAvailableAfterPut < 1) {

                                            waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient. Current available capacity is: " + dropLocationAvailableAfterPut});
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    } else {

                                        var totalPickReservedCapacity = 0;

                                        async.eachSeries(inwardSubListRow, function (element, callback) {

                                            totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                            setImmediate(callback);

                                        }, function (err) {

                                            availableCapacity = data.dropLocation.availableCapacity;

                                            var remaining = ((availableCapacity - totalPickReservedCapacity) - putReservedCapacity);

                                            (showConsole) ? console.log('Remaining capacity at location after PICK: ' + remaining) : '';

                                            if (remaining >= 1) {

                                                waterfallcallback(null);
                                            } else {

                                                waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity is " + remaining});
                                            }
                                        });
                                    }
                                });
                            }
                        },
                        // Check if drop is in same area or different as per function defined
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.10') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                pickProcessFunction = String(data.pickFunctionArea._id);

                                dropLocationFunction = data.dropLocation.function;

                                if (data.dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                                    // Drop location function does not belongs to valid pick process drop functions
                                    waterfallcallback({message: "Drop location " + element.dropOff + " not allowed under valid Pick process drop zones."});
                                } else {

                                    if (pickProcessFunction == dropLocationFunction) {
                                        // Pick between same area
                                        data.isSameArea = 'YES';
                                        waterfallcallback(null);
                                    } else {
                                        data.isSameArea = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check for item reservation
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.11') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    var itemMasterId = String(data.itemMaster._id);

                                    if (data.dropLocation.isReservedForItem == 'YES') {

                                        if (data.dropLocation.reservedItemId.indexOf(itemMasterId) > -1) {

                                            if (data.dropLocation.reservedItemId.length > 1) {
                                                // Location reserved for more than one item including this one
                                                data.skipNext = 'NO';
                                                waterfallcallback(null);
                                            } else {
                                                // This item is reserved here so skip next step
                                                data.skipNext = 'YES';
                                                waterfallcallback(null); // skip next
                                            }
                                        } else {
                                            // Location is reserved for different items
                                            waterfallcallback({message: 'Location ' + data.dropLocation.customerAddress + ' is reserved for different item! Choose different location.'});
                                        }
                                    } else {
                                        // Location not reserved for any item
                                        data.skipNext = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check eligibility if item is not reserved but present or not OR empty location
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.12') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    if (data.dropLocation.assignedItemStoreId.length > 0) {

                                        conflictArray = [];

                                        var itemMasterRow = data.itemMaster;

                                        async.eachSeries(data.dropLocation.assignedItemStoreId, function (element2, callback2) {

                                            itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callback2({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callback2({message: 'Inventory for item ' + element2 + ' not available in system', status: 'error', statusCode: '500'});
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

                                                waterfallcallback(err);
                                            } else if (conflictArray.length != 0) {

                                                waterfallcallback({message: 'Drop location ' + data.dropLocation + ' contain exclusive items! This location is not eligible choose different location.'});
                                            } else if (itemMasterRow.exclusiveStorage === 'YES') {

                                                waterfallcallback({message: 'Item ' + data.itemMaster.itemCode + ' is self exclusive! Not allowed to be dropped at shared location ' + data.dropLocation.customerAddress});
                                            } else {

                                                waterfallcallback(null);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Serial number array and item store array
                        function (waterfallcallback) {

                            (showConsole) ? console.log('9.13') : '';

                            itemStoreRowObject = {};
                            itemStoreId = [];
                            itemSerialNumberArray = [];

                            itemStoreId.push(String(data.itemStore._id));
                            itemSerialNumberArray.push(data.itemStore.itemSerialNumber);

                            itemStoreRowObject.itemStoreId = itemStoreId;
                            itemStoreRowObject.serialNumberArray = itemSerialNumberArray;

                            waterfallcallback(null, itemStoreRowObject);
                        },
                        // Create pick sublist 
                        function (itemStoreRowObject, waterfallcallback) {

                            (showConsole) ? console.log('9.14') : '';

                            var newInwardSubList = {};
                            newInwardSubList.inwardListId = inwardListId;
                            newInwardSubList.itemCode = data.itemMaster.itemCode;
                            newInwardSubList.itemType = 'SERIALNUMBER';
                            newInwardSubList.itemValue = serialNumber;
                            newInwardSubList.pickActivity = 'FULL';
                            newInwardSubList.hopperPriority = 2;
                            newInwardSubList.itemStoreId = itemStoreRowObject.itemStoreId;
                            newInwardSubList.serialNumberArray = itemStoreRowObject.serialNumberArray;
                            newInwardSubList.itemDescription = data.itemMaster.itemDescription;
                            newInwardSubList.requiredQuantity = 1;
                            newInwardSubList.pickLocationId = data.pickLocation._id;
                            newInwardSubList.pickLocationAddress = data.pickLocation.customerAddress;
                            newInwardSubList.dropLocationId = data.dropLocation._id;
                            newInwardSubList.dropLocationAddress = data.dropLocation.customerAddress;
                            newInwardSubList.sequence = '';
                            newInwardSubList.createdBy = createdBy;
                            newInwardSubList.timeCreated = timeInInteger;

                            serialInsertionArray.push(newInwardSubList);
                            completedSerials.push(serialNumber);
                            waterfallcallback(null);
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            if (err == 'BYPASS') {
                                setImmediate(callback)
                            } else {
                                validationErrorArray.push(err);
                                setImmediate(callback);
                            }
                        } else {
                            setImmediate(callback);
                        }
                    });
                }, function () {
                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304', tempId: inwardListId});
                    } else {

                        flowController.emit('10', inwardListId, allowedZoneArray, palletInsertionArray, serialInsertionArray, itemCodeArray);
                    }
                });
            });
            //
            // Item Code based PickSublists
            flowController.on('10', function (inwardListId, allowedZoneArray, palletInsertionArray, serialInsertionArray, itemCodeArray) {

                (showConsole) ? console.log('10') : '';

                var completedItemCodes = [];
                var validationErrorArray = [];
                var itemCodeInsertionArray = [];

                async.eachSeries(itemCodeArray, function (element, callback) {

                    data = {};

                    var itemCode = String(element.material);

                    async.waterfall([
                        // Get items over pallet and its master data 
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.1') : '';

                            if (completedItemCodes.indexOf(itemCode) == -1) {

                                itemCode = element.material;

                                itemMasterModel.findOne({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                    } else if (itemMasterRow == null) {

                                        waterfallcallback({message: "Inventory for item " + itemCode + " not available in system."});
                                    } else {

                                        data.itemMaster = itemMasterRow;
                                        waterfallcallback(null);
                                    }
                                });
                            } else {
                                waterfallcallback('BYPASS');
                            }
                        },
                        // Get dispatch rules
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.2') : '';

                            dispatchRuleModel.findOne({'_id': data.itemMaster.dispatchRule, 'activeStatus': 1}, function (err, dispatchRuleRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (dispatchRuleRow == null) {

                                    waterfallcallback({message: "Dispatch rule data missing!"});
                                } else {

                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get pick process function area
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.3') : '';

                            functionAreaModel.findOne({'name': 'STORAGE', 'activeStatus': 1}, function (err, functionAreaRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (functionAreaRow == null) {

                                    waterfallcallback({message: 'Function area for pick missing! Records tampered/removed from system.'});
                                } else {

                                    data.pickFunctionArea = functionAreaRow;
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get items from item store based on input
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.2') : '';

                            var itemStoreArray = [];

                            itemStoreModel.find({'itemMasterId': String(data.itemMaster._id), 'palletNumber': {'$exists': false}, 'locationStoreId': {'$exists': true}, 'activeStatus': 1}, function (err, itemStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (itemStoreRow.length === 0) {

                                    waterfallcallback({message: "No items with this item-code available under loose box area. Check reprocess area for availability."});
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

                                            waterfallcallback(err);
                                        } else {

                                            data.itemStore = itemStoreArray;
                                            waterfallcallback(null);
                                        }
                                    });
                                }
                            });
                        },
                        // Filter & in items based on allowed zones with allowed pick locations with that
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.4') : '';

                            var filteredItemStoreArray = [];

                            var filteredPickLocationStoreIdArray = [];

                            var filteredPickLocationStoreArray = [];

                            async.eachSeries(data.itemStore, function (element, callback) {

                                locationStoreModel.findOne({'_id': element.locationStoreId, 'availability': 'A', 'activeStatus': 1}, function (err, pickLocationStoreRow) {

                                    if (err) {

                                        callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
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

                                    waterfallcallback(err);
                                } else {

                                    data.itemStore = filteredItemStoreArray;
                                    data.pickLocation = filteredPickLocationStoreArray;
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // remove itemStoreId who are already in other picklist of same day and time (NEED TO WORK IF SERIAL NUMBER RESERVED IN OTHER LIST)
                        function (waterfallcallback) {

                            var filteredItemStoreArray = [];

                            async.eachSeries(data.itemStore, function (element, callback) {

                                var itemStoreId = element.itemStoreId;

                                inwardSubListModel.find({'itemStoreId': itemStoreId, 'status': {'$lt': 31}, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                    if (err) {

                                        callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (inwardSubListRow.length == 0) {

                                        filteredItemStoreArray.push(element);
                                        setImmediate(callback);
                                        //                                
                                    } else {

                                        async.eachSeries(inwardSubListRow, function (element2, callback2) {

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

                                    waterfallcallback(err);
                                } else {

                                    data.itemStore = filteredItemStoreArray;
                                    waterfallcallback(null);
                                }
                            });
                        },
                        // Get Drop off Zone Details
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.4') : '';

                            locationStoreModel.findOne({'customerAddress': element.dropOffZone, 'availability': 'A', 'activeStatus': 1}, function (err, dropLocationStoreRow) {

                                if (err) {

                                    waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                } else if (dropLocationStoreRow == null) {

                                    waterfallcallback({message: "Drop location is not available or blocked! Can't proceed further."});
                                } else {

                                    var length = dropLocationStoreRow.locationProperties.length;
                                    if (length == 0) {

                                        waterfallcallback({message: "Capacity of the location not defined yet."});
                                    } else {

                                        if (dropLocationStoreRow.locationProperties[0].userDefinedCapacity != "") {

                                            data.dropLocation = dropLocationStoreRow;
                                            waterfallcallback(null);
                                        } else {
                                            // capacity calculation part
                                            waterfallcallback({message: "System defined calculation coming soon."});
                                        }
                                    }
                                }
                            });
                        },
                        // Valid pick process drop zones
                        function (waterfallcallback) {
                            // Get data about drop location functions                            
                            (showConsole) ? console.log('1.5') : '';

                            dropFunctionArea = [];

                            functionAreaModel.findOne({'name': 'STORAGE', 'activeStatus': 1}, function (err, functionAreaRow1) {

                                dropFunctionArea.push(String(functionAreaRow1._id));

                                functionAreaModel.findOne({'name': 'SCRAP', 'activeStatus': 1}, function (err, functionAreaRow2) {

                                    dropFunctionArea.push(String(functionAreaRow2._id));

                                    functionAreaModel.findOne({'name': 'DISPATCH', 'activeStatus': 1}, function (err, functionAreaRow3) {

                                        if (data.dropLocation.function == String(functionAreaRow3._id)) {

                                            data.isDispatch = 'YES';
                                        } else {
                                            data.isDispatch = 'NO';
                                        }

                                        data.dropFunctionArea = dropFunctionArea;
                                        waterfallcallback(null);
                                    });
                                });
                            });
                        },
                        // Check drop location holding type
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.6') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationHoldingType = data.dropLocation.holdingType;

                                holdingTypeModel.findOne({'_id': dropLocationHoldingType, 'activeStatus': 1}, function (err, holdingTypeRow) {

                                    if (err) {

                                        waterfallcallback({message: 'INTERNAL SERVER ERROR ' + err});
                                    } else if (holdingTypeRow == null) {

                                        waterfallcallback({message: "Drop location's Holding type details tampered/modified!"});
                                    } else {

                                        holdingType = holdingTypeRow.name;

                                        if (holdingType == 'PALLET') {

                                            waterfallcallback({message: "Only Pallets are allowed at Location " + data.dropLocation.customerAddress + ". Loose box not allowed. However you can allow by changing properties of " + data.dropLocation.customerAddress + " in Location Master."});
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after put
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.7') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null, 0);
                            } else {
                                var dropLocationId = String(data.dropLocation._id);

                                putSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, putSubListRow) {

                                    if (putSubListRow.length == 0) {

                                        waterfallcallback(null, 0);
                                    } else {

                                        availableCapacity = data.dropLocation.availableCapacity;

                                        var suggestedCount = putSubListRow.length; // GBL Specific check length (Ass. Each sublist contain one item)

                                        var remaining = availableCapacity - suggestedCount;

                                        if (remaining >= 1) {

                                            waterfallcallback(null, suggestedCount);
                                        } else {

                                            waterfallcallback({message: "Capacity at drop location " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like PUT, current available capacity is " + remaining});
                                        }
                                    }
                                });
                            }
                        },
                        // Check if capacity available after pick
                        function (putReservedCapacity, waterfallcallback) {

                            (showConsole) ? console.log('1.8') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                var dropLocationId = String(data.dropLocation._id);

                                inwardSubListModel.find({'status': {"$lt": 31}, 'dropLocationId': dropLocationId, 'activeStatus': 1}, function (err, inwardSubListRow) {

                                    if (inwardSubListRow.length == 0) {

                                        var dropLocationAvailableAfterPut = data.dropLocation.availableCapacity - putReservedCapacity;

                                        if (dropLocationAvailableAfterPut < 1) {

                                            waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient. Current available capacity is: " + dropLocationAvailableAfterPut});
                                        } else {

                                            waterfallcallback(null);
                                        }
                                    } else {

                                        var totalPickReservedCapacity = 0;

                                        async.eachSeries(inwardSubListRow, function (element, callback) {

                                            totalPickReservedCapacity = totalPickReservedCapacity + element.requiredQuantity;
                                            setImmediate(callback);

                                        }, function (err) {

                                            availableCapacity = data.dropLocation.availableCapacity;

                                            var remaining = ((availableCapacity - totalPickReservedCapacity) - putReservedCapacity);

                                            (showConsole) ? console.log('Remaining capacity at location after PICK: ' + remaining) : '';

                                            if (remaining >= 1) {

                                                waterfallcallback(null);
                                            } else {

                                                waterfallcallback({message: "Available capacity at location named " + data.dropLocation.customerAddress + " is not sufficient! Due to other scheduled operations like (PUT or PICK), current available capacity is " + remaining});
                                            }
                                        });
                                    }
                                });
                            }
                        },
                        // Check if drop is in same area or different as per function defined
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.9') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {

                                pickProcessFunction = String(data.pickFunctionArea._id);

                                dropLocationFunction = data.dropLocation.function;

                                if (data.dropFunctionArea.indexOf(dropLocationFunction) == -1) {
                                    // Drop location function does not belongs to valid pick process drop functions
                                    waterfallcallback({message: "Drop location " + element.dropOff + " not allowed under valid Pick process drop zones."});
                                } else {

                                    if (pickProcessFunction == dropLocationFunction) {
                                        // Pick between same area
                                        data.isSameArea = 'YES';
                                        waterfallcallback(null);
                                    } else {
                                        data.isSameArea = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check for item reservation
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.10') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    var itemMasterId = String(data.itemMaster._id);

                                    if (data.dropLocation.isReservedForItem == 'YES') {

                                        if (data.dropLocation.reservedItemId.indexOf(itemMasterId) > -1) {

                                            if (data.dropLocation.reservedItemId.length > 1) {
                                                // Location reserved for more than one item including this one
                                                data.skipNext = 'NO';
                                                waterfallcallback(null);
                                            } else {
                                                // This item is reserved here so skip next step
                                                data.skipNext = 'YES';
                                                waterfallcallback(null); // skip next
                                            }
                                        } else {
                                            // Location is reserved for different items
                                            waterfallcallback({message: 'Location ' + data.dropLocation.customerAddress + ' is reserved for different item! Choose different location.'});
                                        }
                                    } else {
                                        // Location not reserved for any item
                                        data.skipNext = 'NO';
                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Check eligibility if item is not reserved but present or not OR empty location
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.11') : '';

                            if (data.isDispatch == 'YES') {

                                waterfallcallback(null);
                            } else {
                                if (data.isSameArea == 'NO') {

                                    waterfallcallback(null);
                                } else {

                                    if (data.dropLocation.assignedItemStoreId.length > 0) {

                                        conflictArray = [];

                                        var itemMasterRow = data.itemMaster;

                                        async.eachSeries(data.dropLocation.assignedItemStoreId, function (element2, callback2) {

                                            itemStoreModel.findOne({'_id': element2, 'activeStatus': 1}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callback2({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callback2({message: 'Inventory for item ' + element2 + ' not available in system', status: 'error', statusCode: '500'});
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

                                                waterfallcallback(err);
                                            } else if (conflictArray.length != 0) {

                                                waterfallcallback({message: 'Drop location ' + data.dropLocation + ' contain exclusive items! This location is not eligible choose different location.'});
                                            } else if (itemMasterRow.exclusiveStorage === 'YES') {

                                                waterfallcallback({message: 'Item ' + data.itemMaster.itemCode + ' is self exclusive! Not allowed to be dropped at shared location ' + data.dropLocation.customerAddress});
                                            } else {

                                                waterfallcallback(null);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null);
                                    }
                                }
                            }
                        },
                        // Serial number array and item store array
                        function (waterfallcallback) {

                            (showConsole) ? console.log('1.12') : '';

                            itemStoreRowObject = {};
                            itemStoreId = [];
                            itemSerialNumberArray = [];

                            async.eachSeries(data.itemStore, function (element, callback) {

                                itemStoreId.push(String(element._id));
                                ('itemSerialNumber' in element) ? itemSerialNumberArray.push(element.itemSerialNumber) : '';
                                setImmediate(callback);

                            }, function (err) {

                                itemStoreRowObject.itemStoreId = itemStoreId;
                                //itemStoreRowObject.palletType = data.itemStore.randomFields[0].palletType;
                                //itemStoreRowObject.palletSize = data.itemStore.randomFields[0].palletSize;
                                itemStoreRowObject.serialNumberArray = itemSerialNumberArray;

                                waterfallcallback(null, itemStoreRowObject);
                            });
                        },
                        // Create pick sublist 
                        function (itemStoreRowObject, waterfallcallback) {

                            (showConsole) ? console.log('1.13') : '';

                            newInwardSubList = {};
                            newInwardSubList.inwardListId = inwardListId;
                            newInwardSubList.itemCode = data.itemMaster.itemCode;
                            newInwardSubList.itemType = 'ITEMCODE';
                            newInwardSubList.itemValue = itemCode;
                            newInwardSubList.pickActivity = 'FULL';
                            //newInwardSubList.palletType = itemStoreRowObject.palletType;
                            //newInwardSubList.palletSize = itemStoreRowObject.palletSize;
                            newInwardSubList.hopperPriority = 2;
                            newInwardSubList.itemStoreId = itemStoreRowObject.itemStoreId;
                            newInwardSubList.serialNumberArray = itemStoreRowObject.serialNumberArray;
                            newInwardSubList.itemDescription = data.itemMaster.itemDescription;
                            newInwardSubList.requiredQuantity = 1;
                            newInwardSubList.pickLocationId = data.pickLocation._id;
                            newInwardSubList.pickLocationAddress = data.pickLocation.customerAddress;
                            newInwardSubList.dropLocationId = data.dropLocation._id;
                            newInwardSubList.dropLocationAddress = data.dropLocation.customerAddress;
                            newInwardSubList.sequence = '';
                            newInwardSubList.createdBy = createdBy;
                            newInwardSubList.timeCreated = timeInInteger;

                            itemCodeInsertionArray.push(newInwardSubList);
                            completedItemCodes.push(itemCode);
                            waterfallcallback(null);
                        }
                        // Done
                    ], function (err, result) {
                        // result now equals 'done'
                        if (err) {
                            if (err == 'BYPASS') {
                                setImmediate(callback);
                            } else {
                                validationErrorArray.push(err);
                                setImmediate(callback);
                            }
                        } else {
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following error occurred while validating excel file.', validationErrors: validationErrorArray, status: 'error', statusCode: '304', tempId: inwardListId});
                    } else {

                        flowController.emit('11', inwardListId, palletInsertionArray, serialInsertionArray, itemCodeInsertionArray);
                    }
                });
            });
            //
            // End
            flowController.on('11', function (inwardListId, palletInsertionArray, serialInsertionArray, itemCodeInsertionArray) {

                (showConsole) ? console.log('11') : '';
                // Update Picklist with line item
                var sequence = 1;

                async.waterfall([
                    // Batch Insert Pallets
                    function (waterfallcallback) {

                        if (palletInsertionArray.length == 0) {

                            waterfallcallback(null);
                        } else {

                            async.eachSeries(palletInsertionArray, function (element, callback) {

                                var newInwardSubList = new inwardSubListModel();

                                newInwardSubList.inwardListId = element.inwardListId;
                                newInwardSubList.itemCode = element.itemCode;
                                newInwardSubList.itemType = element.itemType;
                                newInwardSubList.itemValue = element.itemValue;
                                (element.palletType === 'O') ? newInwardSubList.customPalletNumber = element.customPalletNumber : '';
                                newInwardSubList.pickActivity = element.pickActivity;
                                newInwardSubList.palletType = element.palletType;
                                newInwardSubList.palletSize = element.palletSize;
                                newInwardSubList.hopperPriority = element.hopperPriority;
                                newInwardSubList.itemStoreId = element.itemStoreId;
                                newInwardSubList.serialNumberArray = element.serialNumberArray;
                                newInwardSubList.itemDescription = element.itemDescription;
                                newInwardSubList.requiredQuantity = element.requiredQuantity;
                                newInwardSubList.pickLocationId = element.pickLocationId;
                                newInwardSubList.pickLocationAddress = element.pickLocationAddress;
                                newInwardSubList.dropLocationId = element.dropLocationId;
                                newInwardSubList.dropLocationAddress = element.dropLocationAddress;
                                newInwardSubList.sequence = sequence;
                                newInwardSubList.createdBy = element.createdBy;
                                newInwardSubList.timeCreated = element.timeCreated;

                                newInwardSubList.save(function (err, data) {
                                    if (err) {
                                        waterfallcallback('ERROR', err);
                                    } else {
                                        sequence++;

                                        currentActivityStatusFunction('INWARD', data._id.toString(), 'INWARD - Scheduled(Manual)');

                                        var query = {'_id': inwardListId};
                                        var update = {'$addToSet': {'inwardSubLists': data._id.toString()}};

                                        inwardListModel.update(query, update, function (err) {

                                            if (err) {
                                                // error while adding records
                                                callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var dataObject = {};

                                                dataObject.itemCode = (element.itemCode) ? element.itemCode : '';
                                                dataObject.serialNumberArray = element.serialNumberArray;
                                                dataObject.deviceId = '';
                                                dataObject.itemType = element.itemType;
                                                dataObject.itemValue = element.itemValue;
                                                dataObject.orderNumber = '';
                                                dataObject.pickLocationAddress = (element.pickLocationAddress) ? element.pickLocationAddress : '';
                                                dataObject.dropLocationAddress = (element.dropLocationAddress) ? element.dropLocationAddress : '';

                                                addProcessLogs(inwardListId, createdBy, dataObject);
                                                setImmediate(callback);
                                            }
                                        });
                                    }
                                });
                            }, function (err) {
                                waterfallcallback(null);
                            });
                        }
                    },
                    // Batch Insert Serial Numbers
                    function (waterfallcallback) {

                        if (serialInsertionArray.length == 0) {

                            waterfallcallback(null);
                        } else {

                            async.eachSeries(serialInsertionArray, function (element, callback) {

                                var newInwardSubList = new inwardSubListModel();

                                newInwardSubList.inwardListId = element.inwardListId;
                                newInwardSubList.itemCode = element.itemCode;
                                newInwardSubList.itemType = element.itemType;
                                newInwardSubList.itemValue = element.itemValue;
                                newInwardSubList.pickActivity = element.pickActivity;
                                newInwardSubList.hopperPriority = element.hopperPriority;
                                newInwardSubList.itemStoreId = element.itemStoreId;
                                newInwardSubList.serialNumberArray = element.serialNumberArray;
                                newInwardSubList.itemDescription = element.itemDescription;
                                newInwardSubList.requiredQuantity = element.requiredQuantity;
                                newInwardSubList.pickLocationId = element.pickLocationId;
                                newInwardSubList.pickLocationAddress = element.pickLocationAddress;
                                newInwardSubList.dropLocationId = element.dropLocationId;
                                newInwardSubList.dropLocationAddress = element.dropLocationAddress;
                                newInwardSubList.sequence = sequence;
                                newInwardSubList.createdBy = element.createdBy;
                                newInwardSubList.timeCreated = element.timeCreated;

                                newInwardSubList.save(function (err, data) {
                                    if (err) {
                                        waterfallcallback('ERROR', err);
                                    } else {
                                        sequence++;

                                        currentActivityStatusFunction('INWARD', data._id.toString(), 'INWARD - Scheduled(Manual)');

                                        var query = {'_id': inwardListId};
                                        var update = {'$addToSet': {'inwardSubLists': data._id.toString()}};

                                        inwardListModel.update(query, update, function (err) {

                                            if (err) {
                                                // error while adding records
                                                callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var dataObject = {};

                                                dataObject.itemCode = (element.itemCode) ? element.itemCode : '';
                                                dataObject.serialNumberArray = element.serialNumberArray;
                                                dataObject.deviceId = '';
                                                dataObject.itemType = element.itemType;
                                                dataObject.itemValue = element.itemValue;
                                                dataObject.orderNumber = '';
                                                dataObject.pickLocationAddress = (element.pickLocationAddress) ? element.pickLocationAddress : '';
                                                dataObject.dropLocationAddress = (element.dropLocationAddress) ? element.dropLocationAddress : '';

                                                addProcessLogs(inwardListId, createdBy, dataObject);
                                                setImmediate(callback);
                                            }
                                        });
                                    }
                                });
                            }, function (err) {
                                waterfallcallback(null);
                            });
                        }
                    },
                    // Batch Insert Item Codes
                    function (waterfallcallback) {

                        if (itemCodeInsertionArray.length == 0) {

                            waterfallcallback(null);
                        } else {

                            async.eachSeries(itemCodeInsertionArray, function (element, callback) {

                                var newInwardSubList = new inwardSubListModel();

                                newInwardSubList.inwardListId = element.inwardListId;
                                newInwardSubList.itemCode = element.itemCode;
                                newInwardSubList.itemType = element.itemType;
                                newInwardSubList.itemValue = element.itemValue;
                                newInwardSubList.pickActivity = element.pickActivity;
                                newInwardSubList.hopperPriority = element.hopperPriority;
                                newInwardSubList.itemStoreId = element.itemStoreId;
                                newInwardSubList.serialNumberArray = element.serialNumberArray;
                                newInwardSubList.itemDescription = element.itemDescription;
                                newInwardSubList.requiredQuantity = element.requiredQuantity;
                                newInwardSubList.pickLocationId = element.pickLocationId;
                                newInwardSubList.pickLocationAddress = element.pickLocationAddress;
                                newInwardSubList.dropLocationId = element.dropLocationId;
                                newInwardSubList.dropLocationAddress = element.dropLocationAddress;
                                newInwardSubList.sequence = sequence;
                                newInwardSubList.createdBy = element.createdBy;
                                newInwardSubList.timeCreated = element.timeCreated;

                                newInwardSubList.save(function (err, data) {
                                    if (err) {
                                        waterfallcallback('ERROR', err);
                                    } else {
                                        sequence++;

                                        currentActivityStatusFunction('INWARD', data._id.toString(), 'INWARD - Scheduled(Manual)');

                                        var query = {'_id': inwardListId};
                                        var update = {'$addToSet': {'inwardSubLists': data._id.toString()}};

                                        inwardListModel.update(query, update, function (err) {

                                            if (err) {
                                                // error while adding records
                                                callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var dataObject = {};

                                                dataObject.itemCode = (element.itemCode) ? element.itemCode : '';
                                                dataObject.serialNumberArray = element.serialNumberArray;
                                                dataObject.deviceId = '';
                                                dataObject.itemType = element.itemType;
                                                dataObject.itemValue = element.itemValue;
                                                dataObject.orderNumber = '';
                                                dataObject.pickLocationAddress = (element.pickLocationAddress) ? element.pickLocationAddress : '';
                                                dataObject.dropLocationAddress = (element.dropLocationAddress) ? element.dropLocationAddress : '';

                                                addProcessLogs(inwardListId, createdBy, dataObject);
                                                setImmediate(callback);
                                            }
                                        });
                                    }
                                });
                            }, function (err) {
                                waterfallcallback(null);
                            });
                        }
                    }
                    // Finish
                ], function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('12', inwardListId, palletInsertionArray, serialInsertionArray, itemCodeInsertionArray);
                    }
                });
            });
            //
            // Update and set name to picklist
            flowController.on('12', function (inwardListId, palletInsertionArray, serialInsertionArray, itemCodeInsertionArray) {

                (showConsole) ? console.log('12') : '';

                inwardListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, inwardListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        var name = (inwardListRow == null) ? 'INW' + moment(new Date()).format('DDMM') + '0001' : MagicIncrement.inc(inwardListRow.name);
                        var sequence = (inwardListRow == null) ? 1 : MagicIncrement.inc(inwardListRow.sequence);

                        var query = {'_id': inwardListId, 'activeStatus': 1};
                        var update = {'$set': {'warehouseId': warehouseId, 'name': name, 'sequence': sequence, 'date': date}};

                        inwardListModel.update(query, update, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('END', {message: 'Operation successful!', status: 'success', statusCode: '200'});
                            }
                        });
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
            // Error Handling
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                (showConsole) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'IMPORT-PICKLIST-ADD',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err) {
                        console.log('Entered error ');
                    } else {
                        console.log('Entered success ');
                    }
                });
                if (error.hasOwnProperty('tempId')) {

                    inwardListModel.remove({_id: String(error.tempId)}, function (err) {
                        if (err)
                            console.log('Error');
                        else
                            console.log('Document removed');
                    });
                }

                res.json(error);
            });
            //
            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// PICKLIST MANUAL : Export action (GBL Specific)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/action/create/manual-export/')

        .post(function (req, res) {

            var consoleLog = 0;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (consoleLog) ? console.log(req.body) : '';

            var inwardSubListId = req.body.inwardSubListId.trim();

            var directories = ["./public/files/interface/", "./public/files/interface/pick/", "./public/files/interface/pick/out/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            // Get picklist details
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                inwardSubListModel.findOne({'_id': inwardSubListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow == null) {

                        flowController.emit('ERROR', {message: "No line items found for picklist", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('0', inwardSubListRow);
                    }
                });
            });

            // Get line item
            flowController.on('0', function (inwardSubListRow) {

                (consoleLog) ? console.log('0') : '';

                inwardListModel.findOne({'_id': inwardSubListRow.inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRow == null) {

                        flowController.emit('ERROR', {message: "Picklist not found.", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', inwardListRow, inwardSubListRow);
                    }
                });
            });

            // Get latest file name
            flowController.on('1', function (inwardListRow, inwardSubListRow) {

                (consoleLog) ? console.log('1') : '';

                var rgx = new RegExp("^" + moment(new Date()).format('DDMMYYHHMMSSSSS'));

                var pickFileName = 'INW' + moment(new Date()).format('DDMMYYHHMMSSSSS') + '_001';

                cyberneticFilesModel.findOne({'warehouseId': inwardListRow.warehouseId, 'pickName': {$regex: rgx}}).sort({'pickName': -1}).exec(function (err, cyberneticFilesRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        fileName = (cyberneticFilesRow == null) ? pickFileName : MagicIncrement.inc(cyberneticFilesRow.pickName);

                        flowController.emit('1.1', inwardListRow, inwardSubListRow, fileName);
                    }
                });
            });

            // 
            flowController.on('1.1', function (inwardListRow, inwardSubListRow, fileName) {

                var cyberneticFile = new cyberneticFilesModel();

                cyberneticFile.warehouseId = inwardListRow.warehouseId;
                cyberneticFile.pickName = fileName;
                cyberneticFile.timeCreated = timeInInteger;

                cyberneticFile.save(function (err) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('2', inwardListRow, inwardSubListRow, fileName);
                });
            });

            // Build the JSON
            flowController.on('2', function (inwardListRow, inwardSubListRow, fileName) {

                (consoleLog) ? console.log('2') : '';

                var finalArray = [];

                serialNumberArray = inwardSubListRow.serialNumberArray;

                async.eachSeries(serialNumberArray, function (element, callback) {

                    itemStoreModel.findOne({'itemSerialNumber': element, 'activeStatus': {'$in': [1, 4]}}, function (err, itemStoreRow) {
                        if (err) {

                            callback(err);
                        } else if (itemStoreRow == null) {

                            callback({message: "Box with Box. No " + element + " not found in warehouse Inventory.", status: "error", statusCode: "200"});
                        } else {

                            var data = {};
                            data.Batch = itemStoreRow.randomFields[0].batch;
                            data.BoxNo = element;
                            data.PalletNo = (inwardSubListRow.itemType == 'PALLET') ? inwardSubListRow.itemValue : '';
                            data.Rack = inwardSubListRow.dropLocationAddress;

                            finalArray.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('3', inwardListRow, inwardSubListRow, fileName, finalArray);
                });
            });

            // Generate file
            flowController.on('3', function (inwardListRow, inwardSubListRow, fileName, finalArray) {

                (consoleLog) ? console.log('3') : '';

                var fields = ['Batch', 'BoxNo', 'PalletNo', 'Rack']; // Convert JSON data to csv file at server side

                var finalPath = './public/files/interface/pick/out/' + fileName + '.csv';

                try {

                    var csvFile = json2csv({data: finalArray, fields: fields});

                    fs.writeFile(finalPath, csvFile, function (err) {
                        if (err)
                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        else
                            flowController.emit('END', {message: 'Picklist cybernatic file with new rack location updated!', status: 'success', statusCode: '200'});
                    });
                } catch (err) {

                    flowController.emit('ERROR', {message: 'EXCEPTION WHILE DROPPING PICK ACTIVITY UPDATE TO PICK OUT, ' + err, status: 'error', statusCode: '500'});
                }
            });

            // error while process execution
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'EXPORT-PICKLIST-ADD',
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

            // end
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';
                console.log('FILE UPLOADED :' + inwardSubListId);
                res.json(response);
            });

            // Initialize
            flowController.emit('START');
        });
//
//    
var addProcessLogs = function (inwardListId, createdBy, dataObject) {

    inwardListModel.findOne({'_id': inwardListId, 'activeStatus': 1}, function (err, inwardListRow) {
        userModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
            username = (userRow.username) ? userRow.username : '';

            fs.appendFile(pathPickSubList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PICKSUBLIST' + ',' + username + ',' + inwardListRow.name + ',' + dataObject.itemCode + ',' + dataObject.itemType + ',' + dataObject.itemValue + ',' + dataObject.deviceId + ',' + dataObject.orderNumber + ',' + dataObject.pickLocationAddress + ',' + dataObject.dropLocationAddress + ',' + dataObject.timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                if (err) {

                    console.log('Error while adding logs: ' + err);
                } else {

                    console.log('append inwardSubList file create time');
                }
            });
        });
    });
};
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
//
//
module.exports = router;