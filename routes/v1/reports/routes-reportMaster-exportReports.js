var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var mongoXlsx = require('mongo-xlsx');
var requestify = require('requestify');
var MagicIncrement = require('magic-increment');
var events = require('events');
var fs = require('fs');
var EventEmitter = events.EventEmitter;
var async = require('async');
var json2csv = require('json2csv');
var csv = require('csvtojson');
var multer = require('multer');
var os = require('os');
var mongoose = require('mongoose');
var underscore = require('underscore');
var MongoClient = require('mongodb').MongoClient;
//---------------------------------------------------------------------------------------------------------------------------
var pathPickSubList = './logs/dailyLog/pickSubListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var transactionalLogService = require('../../../service-factory/transactionalLogService');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var measurementUnitModel = require('../../../models/mongodb/itemMaster-measurementUnits/collection-measurementUnits.js');
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMasterModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var excelPathStoreModel = require('../../../models/mongodb/locationMaster-excelPathStore/collection-excelPathStore.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var dispatchRuleModel = require('../../../models/mongodb/itemMaster-dispatchRules/collection-dispatchRules.js');
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userTypeModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var userLicenseManagerModel = require('../../../models/mongodb/userMaster-licenseManager/collection-licenseManager');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var userCategoryModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');
var holdingTypeModel = require('../../../models/mongodb/itemMaster-holdingTypes/collection-holdingTypes.js');
var sideMastersModel = require('../../../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var pathSubPutList = './logs/dailyLog/putSubListLogs/log.txt';
var logger = require('../../../logger/logger.js');
// Connection URL
var url = 'mongodb://localhost:27017/aider';
//inventory reports
//-----------------------------------------------------------------------------------------------------------------    
router.route('/v1/reportMaster/masterData/processMaster/action/export/inventory/')

        .post(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = parseInt(req.body.startDate);
            var endDate = parseInt(req.body.endDate);

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;
            //ObjQuery.activeStatus = {$in: [1, 2]};

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/inventory-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                var P1 = [{"$match": ObjQuery}, {"$out": "TempInventory"}];
                var aggregation = itemStoreModel.aggregate(P1);

                aggregation.exec(function (err, result) {
                    if (err) {
                        throw err;
                    } else {

                        flowController.emit('START');
                        res.json({message: 'Your Request is in process. You will get notified on alert when done.!', status: 'success', statusCode: '201'});
                    }
                });


                //flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';

                // Use connect method to connect to the Server
                MongoClient.connect(url, function (err, db) {

                    if (err) {

                        console.log("error" + err);
                    } else {

                        var collection = db.collection('TempInventory');
                        // Find some documents
                        collection.find({'warehouseId': warehouseId}).toArray(function (err, itemStoreRow) {
                            if (err) {

                                console.log("error" + err);

                            } else {

                                flowController.emit('1', itemStoreRow);
                            }
                        });
                    }
                });
            });

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('1', function (itemStoreRow) {

                (showConsole) ? console.log('1') : '';
                var itemStoreArray = [];
                var count = 0;

                async.eachSeries(itemStoreRow, function (elementItemStore, callback) {

                    console.log('Item ' + count);
                    async.waterfall([
                        //
                        function (waterfallcallback) {

                            if (elementItemStore.locationStoreId) {

                                locationStoreModel.findOne({'_id': elementItemStore.locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else if (locationStoreRow == null) {
                                        `                           `
                                        waterfallcallback(null, '');
                                    } else {

                                        var customerAddress = locationStoreRow.customerAddress;
                                        waterfallcallback(null, customerAddress);
                                    }
                                });
                            } else {

                                waterfallcallback(null, '');
                            }
                        },
                        function (customerAddress, waterfallcallback) {
//                                
                            itemMasterModel.findOne({_id: elementItemStore.itemMasterId, activeStatus: 1}, function (err, itemMasterRow) {
                                if (err) {

                                    waterfallcallback(err);
                                } else if (itemMasterRow == null) {

                                    waterfallcallback(null, customerAddress, '');
                                } else {

                                    itemCode = itemMasterRow.itemCode;
                                    waterfallcallback(null, customerAddress, itemCode);
                                }
                            });
                        },
                        function (customerAddress, itemCode, waterfallcallback) {

                            if (elementItemStore.modifiedBy) {
                                usersModel.findOne({'_id': elementItemStore.modifiedBy}, function (err, userRow) {
                                    if (err) {

                                        waterfallcallback(err);
                                    } else if (userRow == null) {
                                        waterfallcallback(null, customerAddress, itemCode, '');
                                    } else {
                                        username = (userRow.username) ? userRow.username : '';
                                        waterfallcallback(null, customerAddress, itemCode, username);
                                    }
                                });
                            } else {

                                waterfallcallback(null, customerAddress, itemCode, '');
                            }
                        },

                        function (customerAddress, itemCode, username, waterfallcallback) {

                            var data = {
                                ItemCode: itemCode ? itemCode : "-",
                                Location: customerAddress ? customerAddress : "-",
                                //Date: element.date,
                                ExclusiveStorage: elementItemStore.exclusiveStorage,
                                OverflowAutoAssign: elementItemStore.overflowAutoAssign,
                                AlertDate: (elementItemStore.alertDate) ? elementItemStore.alertDate : '-',
                                ExpiryDate: (elementItemStore.expiryDate) ? elementItemStore.expiryDate : '-',
                                ManufacturingDate: (elementItemStore.manufacturingDate) ? elementItemStore.manufacturingDate : '-',
                                PalletNumber: elementItemStore.palletNumber,
                                ItemSerialNumber: (elementItemStore.itemSerialNumber) ? elementItemStore.itemSerialNumber : '-',
                                ActiveStatus: (elementItemStore.activeStatus == 1) ? 'Active' : 'Inactive',
                                Batch: (elementItemStore.randomFields[0].batch) ? elementItemStore.randomFields[0].batch : '-', //batch,netWeight,palletType,boxNo,
                                NetWeight: elementItemStore.randomFields[0].netWeight ? elementItemStore.randomFields[0].netWeight : '-',
                                PalletType: elementItemStore.randomFields[0].palletType ? elementItemStore.randomFields[0].palletType : '-',
                                BoxNo: elementItemStore.randomFields[0].boxNo ? elementItemStore.randomFields[0].boxNo : '-',
                                TareWeightLBS: elementItemStore.randomFields[0].tareWeightLBS ? elementItemStore.randomFields[0].tareWeightLBS : '-',
                                SpecificLotNo: elementItemStore.randomFields[0].specifcLotNo ? elementItemStore.randomFields[0].specifcLotNo : '-',
                                PurchaseOrderNo: elementItemStore.randomFields[0].purchaseOrderNo ? elementItemStore.randomFields[0].purchaseOrderNo : '-',
                                GrossWeight: elementItemStore.randomFields[0].grossWeight ? elementItemStore.randomFields[0].grossWeight : '-',
                                Rack: elementItemStore.randomFields[0].rack ? elementItemStore.randomFields[0].rack : '-',
                                Pieces: elementItemStore.randomFields[0].pieces ? elementItemStore.randomFields[0].pieces : '-',
                                GrossWeightInLbs: elementItemStore.randomFields[0].grossWeightInLbs ? elementItemStore.randomFields[0].grossWeightInLbs : '-',
                                CustomerMeterialNumber: elementItemStore.randomFields[0].customerMeterialNumber ? elementItemStore.randomFields[0].customerMeterialNumber : '-',
                                Name1: elementItemStore.randomFields[0].name1 ? elementItemStore.randomFields[0].name1 : '-',
                                SalesDocument: elementItemStore.randomFields[0].salesDocument ? elementItemStore.randomFields[0].salesDocument : '-',
                                Material: elementItemStore.randomFields[0].material ? elementItemStore.randomFields[0].material : '-',
                                ModifiedBy: username ? username : '-',
                                // CreatedBy: username,
                                DateCreated: (elementItemStore.timeCreated) ? moment.unix(elementItemStore.timeCreated).format("DD/MMM/YYYY") : '-',
                                TimeCreated: (elementItemStore.timeCreated) ? moment.unix(elementItemStore.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                DateModified: (elementItemStore.timeModified) ? moment.unix(elementItemStore.timeModified).format("DD/MMM/YYYY") : '-',
                                TimeModified: (elementItemStore.timeModified) ? moment.unix(elementItemStore.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                            };
                            waterfallcallback(null, data);
                        }
                        //
                    ], function (err, result) {
                        if (err) {

                        } else {
                            count++;
                            itemStoreArray.push(result);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('2', itemStoreArray);
                    }
                });

            });

            // fs.unlink(fileDest);
            flowController.on('2', function (itemStoreArray) {
                (showConsole) ? console.log('2') : '';

                var path = "./public/files/reports/download/inventory-reports/";

                fs.readdir(path, function (err, files) {
                    if (err) {

                        // flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {

                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/inventory-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', itemStoreArray);
                                });
                            }
                        } else {

                            flowController.emit('3', itemStoreArray);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('3', function (itemStoreArray) {

                (showConsole) ? console.log('3') : '';
                var model = mongoXlsx.buildDynamicModel(itemStoreArray);

                var fileName = 'inventory_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/inventory-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(itemStoreArray, model, optionObject, function (err, result) {

                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/inventory-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'INVENTORY';
                        dataObject.name = 'INVENTORY DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");

                            } else {

                                console.log("INVENTORY DOWNLOAD EXCEL:  success");
                                flowController.emit('END');

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
            // END
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                //db.students.drop()
                MongoClient.connect(url, function (err, db) {

                    if (err) {

                        console.log(err);
                    } else {

                        db.collection("TempInventory").drop(function (err, delOK) {
                            if (err)
                                console.log(err);
                            if (delOK)
                                console.log("Collection deleted");
                            db.close();
                        });
                    }
                });
                res.json(result);
            });
            //
            //
            flowController.emit('RESPONSE');
        });
//
//
//---------------------------------------------------------------------------------------------------------------
//device Master
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/deviceMaster/action/export/all-devices/')

        .post(function (req, res) {


            var deviceArr = [];
            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            console.log(req.body);
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/deviceMaster-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            //START1 search query
            flowController.on('START', function () {


                deviceMasterModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, deviceRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (deviceRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Unable to fetch data from deviceMaster.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(deviceRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.modifiedBy) {
                                        usersModel.findOne({'_id': element.modifiedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, '');
                                    }
                                },
                                function (modifiedByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });
                                },
                                function (modifiedByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var materialHandlingUnit = [];
                                    if (element.materialHandlingUnitId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);
                                                    callbackMHU();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var data = {
                                        WarehouseName: warehouseName,
                                        Name: (element.name) ? element.name : '-',
                                        SyncInterval: element.syncInterval,
                                        Os_Version: element.osversion,
                                        Platform: element.platform,
                                        UUID: element.uuid,
                                        Manufacturer: element.manufacturer,
                                        Model: element.model,
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        MaterialHandlingUnit: materialHandlingUnit,
                                        ModifiedByName: modifiedByName,
                                        AvailableCapacity: element.availableCapacity,
                                        TargetCapacity: element.targetCapacity, DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    deviceArr.push(result);
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {


                                flowController.emit('1', deviceArr);


                            }
                        });
                    }
                });
            });


            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (deviceArr) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/deviceMaster-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/deviceMaster-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', deviceArr);
                                });
                            }
                        } else {

                            flowController.emit('2', deviceArr);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (deviceArr) {
                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(deviceArr);
                var fileName = 'deviceMaster_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/deviceMaster-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(deviceArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/deviceMaster-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'DEVICEMASTER';
                        dataObject.name = 'DEVICEMASTER DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("DEVICEMASTER DOWNLOAD EXCEL:  success");
                                // res.json('error');
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
                    MODULE: 'EXPORT-DEVICEMASTER',
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
            flowController.emit('RESPONSE');
        });
//
// 
//---------------------------------------------------------------------------------------------------------------
//pickList
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/export/all-pickLists/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var pickListArr = [];
            var showConsole = 1;


            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/pickLists-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            //
            flowController.on('START', function () {

                pickListModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, pickListRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        res.json({data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from pickList.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(pickListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    usersModel.findOne({$and: [{$or: [{'_id': element.createdBy}, {'_id': element.modifiedBy}]}]}, function (err, userRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (userRow == null) {
                                            waterfallcallback(null, '');
                                        } else {

                                            var modifiedByName = (userRow.username) ? userRow.username : '';
                                            waterfallcallback(null, modifiedByName);
                                        }
                                    });
                                },
                                //
                                function (modifiedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var materialHandlingUnit = [];
                                    if (element.materialHandlingUnit.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.materialHandlingUnit, function (elementMHU, callbackMHU) {

                                            if (elementMHU) {
                                                materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                    if (err) {

                                                        callbackMHU({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else if (MHURow == null) {

                                                        callbackMHU();
                                                    } else {

                                                        var data = (MHURow.name) ? MHURow.name : '';
                                                        materialHandlingUnit.push(data);
                                                        callbackMHU();
                                                    }
                                                });
                                            } else {
                                                var data = '';
                                                materialHandlingUnit.push(data);
                                                callbackMHU();
                                            }
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                //pickSubLists
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var deviceArray = [];
                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray);
                                    } else {
                                        var deviceIdArr = [];

                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });

                                        deviceArr = underscore.uniq(deviceIdArr);
                                        async.eachSeries(deviceArr, function (elementpickSubList, callbackDevice) {

                                            deviceMasterModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    callbackDevice();
                                                } else {

                                                    var data = (diviceRow.name) ? diviceRow.name : '';
                                                    deviceArray.push(data);
                                                    callbackDevice();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray);
                                            }
                                        });
                                    }
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, waterfallcallback) {

                                    pickSubListModel.find({'pickListId': element._id}, 'timeEnded').lean().sort({'timeEnded': -1}).exec(function (err, pickSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (pickSubListRow.length == 0) {

                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, '0');
                                        } else {

                                            var endTime = pickSubListRow[0];
                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, endTime);
                                        }
                                    });
                                },
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, endTime, waterfallcallback) {

                                    pickSubListModel.find({'pickListId': element._id}, 'timeStarted').lean().sort({'timeStarted': 1}).exec(function (err, pickSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (pickSubListRow.length == 0) {

                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, '0');
                                        } else {

                                            var startTime = pickSubListRow[0];
                                            var workTime = endTime.timeEnded - startTime.timeStarted;
                                            waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, deviceArray, workTime);
                                        }
                                    });
                                },
                                //
                                //
                                function (modifiedByName, warehouseName, materialHandlingUnit, deviceArray, workTime, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 5)
                                        status = 'Withdrawn';
                                    else if (element.status == 11)
                                        status = 'Activated';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 41)
                                        'Backlog';


                                    var orderNumber = '';
                                    var isArray = Array.isArray(element.orderNumber);
                                    if (isArray == false) {
                                        if (element.orderNumber == '')
                                            orderNumber = '-';
                                        else
                                            orderNumber = element.orderNumber;
                                    } else {
                                        if (element.orderNumber.length == 0)
                                            orderNumber = '-';
                                        else
                                            orderNumber = element.orderNumber.join();
                                    }

                                    var data = {
                                        WarehouseName: warehouseName,
                                        OrderNumber: orderNumber, //(element.orderNumber.length) !== 0 ? element.orderNumber.join().split('') : '-',
                                        Sr_No: element.sequence,
                                        Name: (element.name) ? element.name : '-',
                                        SyncStatus: (element.syncStatus) ? element.syncStatus : '-',
                                        Status: status,
                                        DeviceName: deviceArray.length !== 0 ? deviceArray.join() : '-',
                                        Time_Worked: workTime ? secondsToHms(workTime) : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : '-' || (element.activeStatus == 2) ? 'Inactive' : '-' || (element.activeStatus == 3) ? 'BackLog' : '-',
                                        MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit.join() : '-',
                                        CreatedByName: modifiedByName ? modifiedByName : '-', ListType: element.listType,
                                        PickRate: element.pickRate ? element.pickRate : '-', DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    pickListArr.push(result);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                res.json({message: err, status: 'error', statusCode: '500'});
                            } else {

                                  flowController.emit('1', pickListArr);
                                // res.json({data: pickListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (pickListArr) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/pickLists-reports/";
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
                            var path = './public/files/reports/download/pickLists-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', pickListArr);
                                });
                            }
                        } else {

                            flowController.emit('2', pickListArr);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (pickListArr) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(pickListArr);
                var fileName = 'pickLists_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/pickLists-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(pickListArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/pickLists-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'PICKLISTS';
                        dataObject.name = 'PICKLISTS DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("PICKLISTS DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //  
            //
            flowController.emit('RESPONSE');
        });
//
//                
//---------------------------------------------------------------------------------------------------------------
//putList
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/export/all-putLists/')

        .post(function (req, res) {

            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();

            putListArr = [];
            var showConsole = 1;

            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;


            if (startDate) {

                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/putLists-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            //
            //
            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';


                console.log(ObjQuery);
                putListModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from putList.", status: 'error', statusCode: '404'});
                    } else {
                        async.eachSeries(putListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.createdBy == 'INTERFACE' || element.createdBy == 'MANUAL') {

                                        if (element.createdBy == 'INTERFACE')
                                            waterfallcallback(null, 'INTERFACE');
                                        else
                                            waterfallcallback(null, 'MANUAL');
                                    } else {
                                        usersModel.findOne({'_id': element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName);
                                            }
                                        });
                                    }
                                },
                                function (createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    warehouseMasterModel.findOne({'_id': element.warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, createdByName, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, createdByName, warehouseName);
                                        }
                                    });
                                },
                                function (createdByName, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({'_id': element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, createdByName, warehouseName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, '');
                                    }
                                },
                                function (createdByName, warehouseName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    if (element.startedBy) {

                                        usersModel.findOne({'_id': element.startedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, '');
                                            } else {

                                                startedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, '');
                                    }
                                },
                                function (createdByName, warehouseName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.completedBy) {
                                        usersModel.findOne({'_id': element.completedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, '');
                                            } else {

                                                var completedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, '');
                                    }
                                },
                                //deviceId
                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    var deviceArray = [];
                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray);
                                    } else {
                                        var deviceIdArr = [];
                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });
                                        async.eachSeries(deviceIdArr, function (elementpickSubList, callbackDevice) {

                                            deviceMasterModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    callbackDevice();
                                                } else {

                                                    var data = (diviceRow.name) ? diviceRow.name : '';
                                                    deviceArray.push(data);
                                                    callbackDevice();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray);
                                            }
                                        });
                                    }
                                },
                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, waterfallcallback) {

                                    putSubListModel.findOne({'putListId': element._id, "activeStatus": 1}).lean().sort({'timeStarted': 1}).exec(function (err, putSubListRow) {
                                        if (err) {

                                            waterfallcallback(err);
                                        } else if (putSubListRow == null) {

                                            waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, '0');
                                        } else {


                                            var workTime = putSubListRow.timeEnded - putSubListRow.timeStarted;

                                            waterfallcallback(null, createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, workTime);
                                        }
                                    });
                                },
                                function (createdByName, warehouseName, assignedToName, startedByName, completedByName, deviceArray, workTime, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {
                                        WarehouseName: warehouseName,
                                        OrderNumber: element.orderNumber.length !== 0 ? element.orderNumber : '-',
                                        Sr_No: element.sequence,
                                        Name: (element.name) ? element.name : '-',
                                        //SyncStatus: element.syncStatus,
                                        Status: status,
                                        DeviceName: deviceArray.legnth !== 0 ? deviceArray : '-',
                                        Time_Worked: workTime ? secondsToHms(workTime) : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        StartedByName: startedByName ? startedByName : '-',
                                        CreatedByName: createdByName,
                                        AssignedToName: assignedToName ? assignedToName : '-', CompletedByName: completedByName ? completedByName : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                    };
                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    putListArr.push(result);
                                    if (putListArr.length == 1) {
                                        headerKey = underscore.keys(result);
                                    }
                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', putListArr);
                                // res.json({data: putListArr, columnArray: headerKey, message: 'Operation Successful.', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (putListArr) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/putLists-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/putLists-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', putListArr);
                                });
                            }
                        } else {

                            flowController.emit('2', putListArr);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (putListArr) {
                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(putListArr);
                var fileName = 'putLists_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/putLists-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(putListArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/putLists-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'PUTLISTS';
                        dataObject.name = 'PUTLISTS DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("PUTLISTS DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //
            //
            flowController.emit('RESPONSE');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------
//pickSubListId
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/export/all-pickSubLists/')

        .post(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickListId = req.body.pickListId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var pickSubListArr = [];

            var ObjQuery = {};
            ObjQuery.pickListId = pickListId;


            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();
            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/pickSubList-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';

                pickSubListModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, pickSubListRow) {
                    if (err) {

                        // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (pickSubListRow.length == 0) {

                        //flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from pickSubList.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(pickSubListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    pickListModel.findOne({_id: element.pickListId}, function (err, picklistRow) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                        } else if (picklistRow == null) {
                                            waterfallcallback(null, '');
                                        } else {
                                            pickListName = (picklistRow.name) ? picklistRow.name : '';
                                            waterfallcallback(null, pickListName);
                                        }
                                    });
                                },
                                //deviceNname
                                function (pickListName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    var deviceArray = [];

                                    if (element.resourceAssigned.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray);
                                    } else {
                                        var deviceIdArr = [];
                                        element.resourceAssigned.forEach(function (result) {
                                            deviceIdArr.push(result.deviceId);
                                        });
                                        async.eachSeries(deviceIdArr, function (elementpickSubList, callbackDevice) {

                                            deviceMasterModel.findOne({'_id': elementpickSubList}, function (err, diviceRow) {
                                                if (err) {

                                                    callbackDevice({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (diviceRow == null) {

                                                    callbackDevice();
                                                } else {

                                                    var data = (diviceRow.name) ? diviceRow.name : '';
                                                    deviceArray.push(data);
                                                    callbackDevice();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray);
                                            }
                                        });
                                    }
                                },
                                //itemStoreId
                                function (pickListName, deviceArray, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var itemStoreName = [];

                                    if (element.itemStoreId.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName);
                                    } else {

                                        async.eachSeries(element.itemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    setImmediate(callbackitemStore);
                                                } else {

                                                    if (itemStoreName.indexOf(itemStoreRow.palletNumber) > -1) {
                                                        itemStoreName.push(itemStoreRow.palletNumber);
                                                        setImmediate(callbackitemStore);
                                                    } else {

                                                        setImmediate(callbackitemStore);
                                                    }

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName);
                                            }
                                        });
                                    }
                                },
                                //pickedItemStoreId
                                function (pickListName, deviceArray, itemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var pickeditemStoreName = [];

                                    if (element.pickedItemStoreId.length == 0) {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName);
                                    } else {

                                        async.eachSeries(element.pickedItemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callbackitemStore();
                                                } else {

                                                    itemStoreName.push(itemStoreRow.palletNumber);
                                                    callbackitemStore();
                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName);
                                            }
                                        });
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';

                                    if (element.createdBy) {

                                        usersModel.findOne({_id: element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.modifiedBy) {
                                        usersModel.findOne({_id: element.modifiedBy}, function (err, userRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({_id: element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.startedBy) {
                                        usersModel.findOne({_id: element.startedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, '');
                                            } else {

                                                var startedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.endedBy) {
                                        usersModel.findOne({_id: element.endedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, '');
                                            } else {

                                                var endedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    if (element.backloggedBy) {

                                        usersModel.findOne({_id: element.backloggedBy}, function (err, userRow) {
                                            if (err) {

                                            } else if (userRow == null) {
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, '');
                                            } else {

                                                var backloggedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, backloggedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, '');
                                    }
                                },
                                function (pickListName, deviceArray, itemStoreName, pickeditemStoreName, createdByName, modifiedByName, assignedToName, startedByName, endedByName, backloggedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = "";
                                    if (element.status == 1)
                                        status = 'Unassigned';
                                    else if (element.status == 5)
                                        status = 'Withdrawn';
                                    else if (element.status == 11)
                                        status = 'Activated';
                                    else if (element.status == 21)
                                        status = 'Assigned';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 35)
                                        status = 'Done Skipped ';
                                    else if (element.status == 33)
                                        status = 'Skipped';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {

                                        PickListName: pickListName,
                                        ItemStoreId: itemStoreName.length !== 0 ? itemStoreName.join() : '-', //pending
                                        PickedItemStoreId: pickeditemStoreName.length !== 0 ? pickeditemStoreName.join() : '-', //pending
                                        ItemCode: element.itemCode ? element.itemCode : '-', OrderNumber: element.orderNumber ? element.orderNumber : '-',
                                        ItemType: element.itemType,
                                        ItemValue: element.itemValue,
                                        ItemDescription: element.itemDescription,
                                        HopperSequence: element.hopperSequence ? element.hopperSequence : '-',
                                        HopperPriority: (element.hopperPriority == 1) ? 'HIGH' : 'NORMAL', SerialNumberArray: element.serialNumberArray.length !== 0 ? element.serialNumberArray.join() : '-',
                                        RequiredQuantity: element.requiredQuantity,
                                        PickedQuantity: element.pickedQuantity, PickLocationAddress: element.pickLocationAddress,
                                        DropLocationAddress: element.dropLocationAddress,
                                        Sr_No: element.sequence,
                                        DeviceName: deviceArray.length !== 0 ? deviceArray.join() : "-",
                                        Status: status,
                                        SkipReason: element.skipReason ? element.skipReason : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        CreatedByName: createdByName,
                                        ModifiedByName: modifiedByName ? modifiedByName : '-', TimeAssigned: (element.timeAssigned) ? moment.unix(element.timeAssigned).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        AssignedTo: assignedToName ? assignedToName : '-', //pending
                                        TimeStarted: (element.timeStarted) ? moment.unix(element.timeStarted).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        StartedBy: startedByName ? startedByName : '-',
                                        TimeEnded: (element.timeEnded) ? moment.unix(element.timeEnded).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        EndedBy: endedByName ? endedByName : '-', //pending
                                        TimeBacklogged: (element.timeBacklogged) ? moment.unix(element.timeBacklogged).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        BackloggedBy: backloggedByName ? backloggedByName : '-', //pending
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    pickSubListArr.push(result);

                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 5);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                pickListModel.findOne({_id: pickSubListRow[0].pickListId}, function (err, picklistRow) {
                                    if (err) {

                                        // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                    } else if (picklistRow == null) {
                                        waterfallcallback(null, '');
                                    } else {

                                        var warehouseId = picklistRow.warehouseId;
                                        flowController.emit('1', pickSubListArr, warehouseId);
                                    }
                                });

                            }
                        });
                    }
                });
            });
            //
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (pickSubListArr, warehouseId) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/pickSubList-reports/";
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
                            var path = './public/files/reports/download/pickSubList-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', pickSubListArr, warehouseId);
                                });
                            }
                        } else {

                            flowController.emit('2', pickSubListArr, warehouseId);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (pickSubListArr, warehouseId) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(pickSubListArr);
                var fileName = 'pickSubList_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/pickSubList-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(pickSubListArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/pickSubList-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'PICKSUBLISTS';
                        dataObject.name = 'PICKSUBLISTS DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("PICKSUBLISTS DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                //res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //
            //
            flowController.emit('RESPONSE');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------
//putSubListId
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/export/all-putSubLists/')

        .post(function (req, res) {
            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var putListId = req.body.putListId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var putSubListArr = [];

            var ObjQuery = {};
            ObjQuery.putListId = putListId;


            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/putSubList-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //
            flowController.on('START', function () {

                putSubListModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, putSubListRow) {
                    if (err) {

                        // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (putSubListRow.length == 0) {

                        //flowController.emit('ERROR', {data: [], columnArray: [], "recordsTotal": 0, "recordsFiltered": 0, message: "Unable to fetch data from putSubList.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(putSubListRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback1') : '';
                                    putListModel.findOne({_id: element.putListId}, function (err, putlistRow) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                        } else if (putlistRow == null) {
                                            waterfallcallback(null, '');
                                        } else {
                                            putListName = (putlistRow.name) ? putlistRow.name : '';
                                            waterfallcallback(null, putListName);
                                        }
                                    });
                                },
                                //itemStoreId
                                function (putListName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';
                                    var itemStoreName = [];

                                    if (element.itemStoreId.length == 0) {

                                        waterfallcallback(null, putListName, itemStoreName);
                                    } else {

                                        async.eachSeries(element.itemStoreId, function (elementitemStore, callbackitemStore) {

                                            itemStoreModel.findOne({_id: elementitemStore}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackitemStore({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (itemStoreRow == null) {

                                                    callbackitemStore();
                                                } else {

                                                    itemStoreName.push(itemStoreRow.palletNumber);
                                                    callbackitemStore();
                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, putListName, itemStoreName);
                                            }
                                        });
                                    }
                                },
                                function (putListName, itemStoreName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';

                                    if (element.createdBy == 'INTERFACE' || element.createdBy == 'MANUAL') {

                                        if (element.createdBy == 'INTERFACE') {

                                            waterfallcallback(null, putListName, itemStoreName, 'INTERFACE');
                                        } else {

                                            waterfallcallback(null, putListName, itemStoreName, 'MANUAL');
                                        }
                                    } else {
                                        usersModel.findOne({_id: element.createdBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, putListName, itemStoreName, '');
                                            } else {

                                                var createdByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, putListName, itemStoreName, createdByName);
                                            }
                                        });
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    if (element.assignedTo) {
                                        usersModel.findOne({_id: element.assignedTo}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, '');
                                            } else {

                                                var assignedToName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.startedBy) {
                                        usersModel.findOne({_id: element.startedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, '');
                                            } else {

                                                var startedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.endedBy) {
                                        usersModel.findOne({_id: element.endedBy}, function (err, userRow) {
                                            if (err) {
                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, '');
                                            } else {

                                                var endedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.backloggedBy) {
                                        usersModel.findOne({_id: element.backloggedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, '');
                                            } else {

                                                var backloggedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, backloggedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, '');
                                    }
                                },
                                function (putListName, itemStoreName, createdByName, assignedToName, startedByName, endedByName, backloggedByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallbackData') : '';
                                    var status = '';
                                    if (element.status == 1)
                                        status = 'Pending';
                                    else if (element.status == 25)
                                        status = 'In progress';
                                    else if (element.status == 27)
                                        status = 'Pending for drop';
                                    else if (element.status == 31)
                                        status = 'Done';
                                    else if (element.status == 33)
                                        status = 'Skipped';
                                    else if (element.status == 41)
                                        status = 'Backlog';
                                    var data = {

                                        PutListName: putListName,
                                        ItemStoreId: itemStoreName.length !== 0 ? itemStoreName : '-', //pending
                                        ItemCode: element.itemCode ? element.itemCode : '-', OrderNumber: element.orderNumber ? element.orderNumber : '-',
                                        PalletNumber: element.palletNumber ? element.palletNumber : '-',
                                        PalletSize: element.palletSize ? element.palletSize : '-',
                                        PalletType: element.palletType ? element.palletType : '-',
                                        ItemDescription: element.itemDescription,
                                        RequiredQuantity: element.requiredQuantity ? element.requiredQuantity : '-',
                                        PickedQuantity: element.pickedQuantity ? element.pickedQuantity : '-',
                                        DropLocationAddress: element.dropLocationAddress ? element.dropLocationAddress : '-',
                                        Sr_No: element.sequence,
                                        Status: status,
                                        SkipReason: element.skipReason ? element.skipReason : '-',
                                        ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        CreatedByName: createdByName,
                                        TimeAssigned: (element.timeAssigned) ? moment.unix(element.timeAssigned).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        AssignedTo: assignedToName ? assignedToName : '-', //pending
                                        TimeStarted: (element.timeStarted) ? moment.unix(element.timeStarted).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        StartedBy: startedByName ? startedByName : '-',
                                        TimeEnded: (element.timeEnded) ? moment.unix(element.timeEnded).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        EndedBy: endedByName ? endedByName : "-", //pending
                                        TimeBacklogged: (element.timeBacklogged) ? moment.unix(element.timeBacklogged).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        BackloggedBy: backloggedByName ? backloggedByName : '-', //pending
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-'
                                    };

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    putSubListArr.push(result);

                                    setTimeout(function () {
                                        setImmediate(callback);
                                    }, 10);
                                }
                            });
                        }, function (err) {

                            if (err) {

                                //flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                putListModel.findOne({_id: putSubListRow[0].putListId}, function (err, putlistRow) {
                                    if (err) {

                                        // flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                    } else if (putlistRow == null) {
                                        //waterfallcallback(null, '');
                                    } else {

                                        var warehouseId = putlistRow.warehouseId;
                                        flowController.emit('1', putSubListArr, warehouseId);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (putSubListArr, warehouseId) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/putSubList-reports/";
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
                            var path = './public/files/reports/download/putSubList-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', putSubListArr, warehouseId);
                                });
                            }
                        } else {

                            flowController.emit('2', putSubListArr, warehouseId);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (putSubListArr, warehouseId) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(putSubListArr);
                var fileName = 'putSubList_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/putSubList-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(putSubListArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/putSubList-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'PUTSUBLISTS';
                        dataObject.name = 'PUTSUBLISTS DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("PUTSUBLISTS DOWNLOAD EXCEL:  success");
                                // res.json('error');
                            }
                        });
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });
            //
            //
            flowController.emit('RESPONSE');
        });
//
//
//---------------------------------------------------------------------------------------------------------------
// Get All user information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/userMaster/action/export/all-users/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var arrUserMaster = [];

            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }
            var showConsole = 1;

            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/userMaster-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });

            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                console.log(ObjQuery);
                usersModel.find(ObjQuery).lean().exec(function (err, userMasterRow) {
                    if (err) {

                        //res.json({data: [], message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (userMasterRow.length == 0) {

                        // res.json({data: [], columnArray: [], message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userMasterRow, function (element, callback) {

                            if (element.username !== 'AVANCER') {

                                async.waterfall([
                                    function (waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback1') : '';

                                        if (element.allocatedLicenseId) {

                                            userLicenseManagerModel.findOne({'_id': element.allocatedLicenseId, 'activeStatus': 1}, function (err, licenseRow) {
                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else {

                                                    var allocatedLicenseName = licenseRow.name;
                                                    waterfallcallback(null, allocatedLicenseName);
                                                }
                                            });
                                        } else {
                                            waterfallcallback(null, '');
                                        }
                                    },
                                    function (allocatedLicenseName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback2') : '';

                                        if (element.createdBy == 'AVANCER' || element.modifiedBy == 'AVANCER') {

                                            var createdBy = 'AVANCER';
                                            var modifiedBy = 'AVANCER';
                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy);
                                        } else {

                                            usersModel.findOne({$and: [{$or: [{'_id': element.createdBy}, {'_id': element.modifiedBy}]}]}, function (err, userMasterRowData) {
                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                                } else if (userMasterRowData == null) {

                                                    waterfallcallback({message: "Unable to fetch data from userMaster.", status: 'error', statusCode: '404'});
                                                } else {

                                                    var createdBy = (userMasterRowData.username) ? userMasterRowData.username : '';
                                                    var modifiedBy = (userMasterRowData.username) ? userMasterRowData.username : '';

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy);
                                                }
                                            });
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback3') : '';

                                        var materialHandlingUnit = [];

                                        if (element.materialHandlingUnitId.length == 0) {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit);
                                        } else {

                                            async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                                materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                    if (err) {

                                                        callbackMHU({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                    } else if (MHURow == null) {

                                                        callbackMHU();
                                                    } else {

                                                        var data = (MHURow.name) ? MHURow.name : '';
                                                        materialHandlingUnit.push(data);
                                                        callbackMHU();
                                                    }
                                                });
                                            }, function (err) {

                                                if (err) {

                                                    waterfallcallback(err);
                                                } else {

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit);
                                                }
                                            });
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback4') : '';

                                        warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (warehouseRow == null) {

                                                waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, '');
                                            } else {

                                                var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                                waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName);
                                            }
                                        });
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback5') : '';
                                        if (element.userCategoryId) {

                                            userCategoryModel.findOne({'_id': element.userCategoryId}, function (err, userCategoryRow) {
                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                                } else if (userCategoryRow == null) {

                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                                } else {

                                                    var userCategoryName = (userCategoryRow.name) ? userCategoryRow.name : '';
                                                    //console.log(typeof userCategoryName);
                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName);
                                                }
                                            });
                                        } else {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallback6') : '';

                                        if (element.userTypeId) {
                                            userTypeModel.findOne({'_id': element.userTypeId}, function (err, userTypeRow) {
                                                if (err) {

                                                    waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                                } else if (userTypeRow == null) {
                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                                } else {

                                                    var userTypeName = (userTypeRow.name) ? userTypeRow.name : '';
                                                    waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, userTypeName);
                                                }
                                            });
                                        } else {

                                            waterfallcallback(null, allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, '');
                                        }
                                    },
                                    function (allocatedLicenseName, createdBy, modifiedBy, materialHandlingUnit, warehouseName, userCategoryName, userTypeName, waterfallcallback) {

                                        (showConsole) ? console.log('waterfallcallbackData') : '';

                                        var data = {
                                            WarehouseName: warehouseName,
                                            Username: element.username,
                                            FirstName: element.firstName,
                                            LastName: element.lastName,
                                            EmployeeId: element.employeeId ? element.employeeId : '-',
                                            UserCategoryName: userCategoryName,
                                            UserTypeName: userTypeName,
                                            TargetCapacity: (element.targetCapacity) ? element.targetCapacity : '-',
                                            PendingCapacity: element.pendingCapacity ? element.pendingCapacity : '-',
                                            AllocatedCapacity: element.allocatedCapacity ? element.allocatedCapacity : '-',
                                            ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                            MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit.join() : '-',
                                            ModifiedByName: modifiedBy ? modifiedBy : '-',
                                            CreatedByName: createdBy,
                                            AllocatedLicenseName: allocatedLicenseName ? allocatedLicenseName : '-',
                                            DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                            TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                            DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                            TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                        };
                                        waterfallcallback(null, data);
                                    }
                                ], function (err, result) {
                                    // result now equals 'done'
                                    if (err) {
                                        setImmediate(callback);
                                    } else {

                                        arrUserMaster.push(result);

                                        setTimeout(function () {
                                            setImmediate(callback);
                                        }, 100);
                                    }
                                });
                            } else {
                                setImmediate(callback);
                            }
                        }, function (err) {

                            if (err) {

                                // res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', arrUserMaster);
                            }
                        });
                    }
                });
            });
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (arrUserMaster) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/userMaster-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/userMaster-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', arrUserMaster);
                                });
                            }
                        } else {

                            flowController.emit('2', arrUserMaster);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (arrUserMaster) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(arrUserMaster);
                var fileName = 'userMaster_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/userMaster-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(arrUserMaster, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/userMaster-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'USERMASTER';
                        dataObject.name = 'USERMASTER DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("USERMASTER DOWNLOAD EXCEL:  success");
                                // res.json('error');
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
                    MODULE: 'EXPORT-USERMASTER',
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

                (showConsole) ? console.log('END') : '';
                console.log(response);
                res.json(response);
            });

            // Initialize
            flowController.emit('RESPONSE');

        });
//
//
//---------------------------------------------------------------------------------------------------------------
// Get location information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/locationMaster/action/export/all-location/')

        .post(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeModified = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeModified = {$gte: startDate};
                else
                    ObjQuery.timeModified = {$gte: startDate};
            }
            var showConsole = 1;

            var flowController = new EventEmitter();

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/locationMaster-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var locationArr = [];

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            // check for logical validations item quantity vs actual available quantity & item details
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                locationStoreModel.find(ObjQuery).lean().sort({'sequenceId': 1}).exec(function (err, locationRow) {
                    if (err) {

                        // res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                    } else if (locationRow.length == 0) {
                        console.log("null");
                        //res.json({data: [], columnArray: [], message: "Unable to fetch data from locationMaster.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback1') : '';

                                    if (element.modifiedBy) {
                                        usersModel.findOne({'_id': element.modifiedBy}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, modifiedByName);
                                            }
                                        });
                                    } else {
                                        waterfallcallback(null, '');
                                    }
                                },
                                function (modifiedByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback2') : '';

                                    warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, modifiedByName, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, modifiedByName, warehouseName);
                                        }
                                    });

                                },
                                function (modifiedByName, warehouseName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback3') : '';

                                    var materialHandlingUnit = [];

                                    if (element.materialHandlingUnitId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.materialHandlingUnitId, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': elementMHU}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);

                                                    callbackMHU();

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback4') : '';

                                    var subCategory = [];

                                    if (element.reservedSubCategoryId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory);
                                    } else {

                                        async.eachSeries(element.reservedSubCategoryId, function (elementSubCategory, callbackSubCategory) {
                                            itemSubCategorysModel.findOne({'_id': elementSubCategory}, function (err, subCategoryRow) {
                                                if (err) {

                                                    callbackMHU({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (subCategoryRow == null) {

                                                    callbackSubCategory();
                                                } else {

                                                    var data = (subCategoryRow.name) ? subCategoryRow.name : '';
                                                    subCategory.push(data);

                                                    callbackSubCategory();

                                                }
                                            });

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory);
                                            }
                                        });
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback5') : '';
                                    if (element.reservedCategoryId) {
                                        itemCategorysModel.findOne({'_id': element.reservedCategoryId}, function (err, categoryRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                            } else if (categoryRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, '');
                                            } else {

                                                var Category = (categoryRow.name) ? categoryRow.name : '';
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback6') : '';
                                    if (element.holdingType) {
                                        holdingTypeModel.findOne({'_id': element.holdingType}, function (err, holdingRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                            } else if (holdingRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, '');
                                            } else {

                                                var holdingName = (holdingRow.name) ? holdingRow.name : '';
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName);
                                            }
                                        }); //
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.function) {
                                        functionAreaModel.findOne({'_id': element.function}, function (err, functionRow) {

                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                            } else if (functionRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, '');
                                            } else {

                                                var functionName = (functionRow.name) ? functionRow.name : '';
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName);

                                            }
                                        }); //dispatchRulesModel
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, '');
                                    }

                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.createdBy) {
                                        usersModel.findOne({'_id': element.createdBy}, function (err, userCreatedRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userCreatedRow == null) {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, '');

                                            } else {

                                                var createdByName = (userCreatedRow.username) ? userCreatedRow.username : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.areaId) {

                                        areaMasterModel.findOne({'_id': element.areaId}, function (err, areaRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (areaRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, '');

                                            } else {

                                                var areaName = (areaRow.area) ? areaRow.area : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    if (element.zoneId) {

                                        zoneMasterModel.findOne({'_id': element.zoneId}, function (err, zoneRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (zoneRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, '');

                                            } else {

                                                var zoneName = (zoneRow.zone) ? zoneRow.zone : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback11') : '';
                                    if (element.lineId) {

                                        lineMasterModel.findOne({'_id': element.lineId}, function (err, lineRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (lineRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, '');

                                            } else {

                                                var lineName = (lineRow.line) ? lineRow.line : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback12') : '';
                                    if (element.levelId) {
                                        levelMasterModel.findOne({'_id': element.levelId}, function (err, levelRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (levelRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, '');

                                            } else {

                                                var levelName = (levelRow.level) ? levelRow.level : '';
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback13') : '';
                                    if (element.sideId) {

                                        sideMastersModel.findOne({'_id': element.sideId}, function (err, sideRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (sideRow == null) {
                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, '');

                                            } else {

                                                var sideName = (sideRow.line) ? sideRow.line : '';

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, '');
                                    }
                                },
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback14') : '';

                                    var assignedItemStoreIdArr = [];
                                    var assignedItemStoreIdUnique = [];
                                    var itemCodeArr = [];

                                    if (element.assignedItemStoreId.length == 0) {

                                        waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr);

                                    } else {

                                        async.eachSeries(element.assignedItemStoreId, function (elementStoreId, callbackStoreId) {

                                            itemStoreModel.findOne({'_id': elementStoreId}, function (err, itemStoreRow) {
                                                if (err) {

                                                    callbackStoreId({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                                } else if (itemStoreRow == null) {

                                                    setImmediate(callbackStoreId);
                                                } else {

                                                    var itemMasterId = itemStoreRow.itemMasterId;

                                                    itemMasterModel.findOne({'_id': itemMasterId}, function (err, itemMasterRow) {
                                                        if (err) {

                                                            callbackStoreId({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});

                                                        } else if (itemMasterRow == null) {

                                                            setImmediate(callbackStoreId);
                                                        } else {

                                                            var itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                                            itemCodeArr.push(itemCode);

                                                            assignedItemStoreIdArr.push(itemMasterId);
                                                            if (assignedItemStoreIdUnique.indexOf(itemMasterId) > -1) {

                                                                assignedItemStoreIdUnique.push(itemMasterId);
                                                            }
                                                            setImmediate(callbackStoreId);
                                                        }
                                                    });
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr);
                                            }
                                        });
                                    }
                                },
                                //result
                                function (modifiedByName, warehouseName, materialHandlingUnit, subCategory, Category, holdingName, functionName, createdByName, areaName, zoneName, lineName, levelName, sideName, assignedItemStoreIdArr, assignedItemStoreIdUnique, itemCodeArr, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallbackDATA') : '';

                                    var data = {

                                        WarehouseName: warehouseName,
                                        Area: areaName,
                                        Zone: zoneName,
                                        Line: lineName,
                                        Level: levelName,
                                        MaterialHandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit.join() : '-',
                                        LocationAddress: element.customerAddress ? element.customerAddress : '-',
                                        SequenceId: element.sequenceId,
                                        HoldingType: holdingName ? holdingName : '-',
                                        Availability: (element.availability == 'A') ? 'Available' : '' || (element.availability == 'B') ? 'Block' : '-',
                                        //Comments: element.comments,
                                        // Function: functionName,
                                        ReservedCategoryId: Category ? Category : '-',
                                        ReservedSubCategoryId: subCategory.length !== 0 ? subCategory.join() : '-',
                                        ReservedBy: element.reservedBy ? element.reservedBy : '-',
                                        TimeReserved: (element.timeReserved) ? moment.unix(element.timeReserved).format("DD/MMM/YYYY") : '-',
                                        AssignedItemStoreId: itemCodeArr.length !== 0 ? itemCodeArr.join() : '-',
                                        AvailableCapacity: element.availableCapacity,
                                        //  TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '',
                                        CreatedBy: createdByName ? createdByName : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        ModifiedBy: modifiedByName ? modifiedByName : '-', ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive'};

                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {
                                    callback(err);
                                } else {

                                    locationArr.push(result);

                                    setTimeout(function () {
                                        setImmediate(callback);
                                    });
                                }
                            });

                        }, function (err) {

                            if (err) {

                                // res.json({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', locationArr);
                            }
                        });
                    }
                });
            });
            //delete old file
            // fs.unlink(fileDest);
            flowController.on('1', function (locationArr) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/locationMaster-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {

                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/locationMaster-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', locationArr);
                                });
                            }
                        } else {

                            flowController.emit('2', locationArr);
                        }
                    }
                });
            });

            // Save file to database
            // Save file to database
            flowController.on('2', function (locationArr) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(locationArr);

                var fileName = 'locationMaster_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/locationMaster-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(locationArr, model, optionObject, function (err, result) {
                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/locationMaster-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'LOCATIONMASTER';
                        dataObject.name = 'LOCATIONMASTER DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("LOCATIONMASTER DOWNLOAD EXCEL:  success");
                                // res.json('error');
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
                    MODULE: 'EXPORT-locationMaster',
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

                (showConsole) ? console.log('END') : '';

                res.json(response);
            });

            // Initialize
            flowController.emit('RESPONSE');
        });

//item Master
//---------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/itemMaster/action/export/all-items/')

        .post(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/itemMaster-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });
            //START
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                var itemMasterArray = [];
                // Find all the active rows in the item category collection 
                itemMasterModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, itemMasterRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED', status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No item master configured yet.", "recordsTotal": 0, "recordsFiltered": 0, status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(itemMasterRow, function (element, callback) {

                            async.waterfall([

                                //category
                                function (waterFallcallback) {

                                    if (element.category) {

                                        itemCategorysModel.findOne({'_id': element.category, 'activeStatus': 1}, function (err, itemCategoryRow) {

                                            if (err) { // Serverside error

                                                waterFallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED' + err, status: 'error', statusCode: '500'});
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
                                //holdingType
                                function (categoryName, waterFallcallback) {

                                    if (element.holdingType) {
                                        holdingTypeModel.findOne({'_id': element.holdingType, 'activeStatus': 1}, function (err, holdingTypeRow) {
                                            if (err) { // Serverside error

                                                waterFallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED', status: 'error', statusCode: '500'});
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
                                //warehouseName
                                function (categoryName, holdingType, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback2') : '';

                                    warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                                        if (err) {

                                            waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                        } else if (warehouseRow == null) {

                                            waterfallcallback(null, categoryName, holdingType, '');
                                        } else {

                                            var warehouseName = (warehouseRow.name) ? warehouseRow.name : '';
                                            waterfallcallback(null, categoryName, holdingType, warehouseName);
                                        }
                                    });
                                },
                                //MHU
                                function (categoryName, holdingType, warehouseName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback3') : '';
                                    var materialHandlingUnit = [];

                                    if (element.handlingUnit.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit);
                                    } else {

                                        async.eachSeries(element.handlingUnit, function (elementMHU, callbackMHU) {

                                            materialHandlingMasterModel.findOne({'_id': mongoose.Types.ObjectId(elementMHU)}, function (err, MHURow) {
                                                if (err) {

                                                    callbackMHU({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (MHURow == null) {

                                                    callbackMHU();
                                                } else {

                                                    var data = (MHURow.name) ? MHURow.name : '';
                                                    materialHandlingUnit.push(data);
                                                    callbackMHU();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit);
                                            }
                                        });
                                    }
                                },
                                //subCategory
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback4') : '';
                                    var subCategory = [];
                                    if (element.subCategory.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory);
                                    } else {

                                        async.eachSeries(element.subCategory, function (elementSubCategory, callbackSubCategory) {
                                            itemSubCategorysModel.findOne({'_id': mongoose.Types.ObjectId(elementSubCategory)}, function (err, subCategoryRow) {
                                                if (err) {

                                                    callbackMHU({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                                } else if (subCategoryRow == null) {

                                                    callbackSubCategory();
                                                } else {

                                                    var data = (subCategoryRow.name) ? subCategoryRow.name : '';
                                                    subCategory.push(data);
                                                    callbackSubCategory();
                                                }
                                            });
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory);
                                            }
                                        });
                                    }
                                },
                                //measurementUnit
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback7') : '';
                                    if (element.measurementUnit) {

                                        measurementUnitModel.findOne({'_id': mongoose.Types.ObjectId(element.measurementUnit)}, function (err, measurementRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (measurementRow == null) {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, '');
                                            } else {

                                                var measurementUnitName = (measurementRow.name) ? measurementRow.name : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, '');
                                    }
                                },
                                //createdBy
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback8') : '';
                                    if (element.createdBy) {

                                        usersModel.findOne({'_id': mongoose.Types.ObjectId(element.createdBy)}, function (err, userCreatedRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userCreatedRow == null) {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, '');
                                            } else {

                                                var createdByName = (userCreatedRow.username) ? userCreatedRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, '');
                                    }
                                },

                                ///dispatchRule
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, waterfallcallback) {

                                    (showConsole) ? console.log('waterfallcallback9') : '';
                                    if (element.dispatchRule) {

                                        dispatchRuleModel.findOne({'_id': mongoose.Types.ObjectId(element.dispatchRule)}, function (err, dispatchRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (dispatchRow == null) {
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, '');
                                            } else {

                                                var dispatchRule = (dispatchRow.name) ? dispatchRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, '');
                                    }
                                },
                                //inwardRule
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, waterfallcallback) {
                                    (showConsole) ? console.log('waterfallcallback10') : '';
                                    var inwardRuleArr = [];

                                    if (element.inwardRule.length == 0) {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr);
                                    } else {

                                        async.eachSeries(element.inwardRule, function (elementInward, callbackInward) {

                                            var data = (elementInward.name) ? elementInward.name : '-';

                                            inwardRuleArr.push(data);
                                            callbackInward();

                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr);
                                            }
                                        });
                                    }
                                },
                                //modifiedBy
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, waterfallcallback) {
                                    //                                     (showConsole) ? console.log('waterfallcallback1') : '';
                                    if (element.modifiedBy) {
                                        usersModel.findOne({'_id': mongoose.Types.ObjectId(element.modifiedBy)}, function (err, userRow) {
                                            if (err) {

                                                waterfallcallback({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                                            } else if (userRow == null) {
                                                waterfallcallback(null, '');
                                            } else {

                                                var modifiedByName = (userRow.username) ? userRow.username : '';
                                                waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, modifiedByName);
                                            }
                                        });
                                    } else {

                                        waterfallcallback(null, categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, '');
                                    }
                                },
                                //
                                function (categoryName, holdingType, warehouseName, materialHandlingUnit, subCategory, measurementUnitName, createdByName, dispatchRule, inwardRuleArr, modifiedByName, waterFallcallback) {

                                    var itemMaster = {
                                        WarehouseName: warehouseName,
                                        ItemCode: element.itemCode,
                                        Category: categoryName,
                                        SubCategory: subCategory.length !== 0 ? subCategory.join() : '-',
                                        CategoryCombinations: element.categoryCombinations.length !== 0 ? element.categoryCombinations.join() : '-',
                                        MeasurementUnit: measurementUnitName ? measurementUnitName : '-',
                                        OverflowAutoAssign: element.overflowAutoAssign,
                                        ExclusiveStorage: element.exclusiveStorage,
                                        HoldingType: holdingType,
                                        ItemSpecification: element.itemSpecification ? element.itemSpecification : '-',
                                        MinInventoryAlert: element.itemSystemSpecification[0].minInventoryAlert ? element.itemSystemSpecification[0].minInventoryAlert : '-',
                                        MaxInventoryAlert: element.itemSystemSpecification[0].maxInventoryAlert ? element.itemSystemSpecification[0].maxInventoryAlert : '-',
                                        AutoStockCount: element.itemSystemSpecification[0].autoStockCount ? element.itemSystemSpecification[0].autoStockCount : '-',
                                        StockCountQuantity: element.itemSystemSpecification[0].stockCountQuantity ? element.itemSystemSpecification[0].stockCountQuantity : '-',
                                        stockCountFrequency: element.itemSystemSpecification[0].stockCountFrequency ? element.itemSystemSpecification[0].stockCountFrequency : '-',
                                        ItemStatus: element.itemSystemSpecification[0].itemStatus ? element.itemSystemSpecification[0].itemStatus : '-',
                                        InwardRule: inwardRuleArr.length !== 0 ? inwardRuleArr.join() : '-',
                                        DispatchRule: dispatchRule ? dispatchRule : '-',
                                        ItemSerialNumber: element.itemSerialNumber ? element.itemSerialNumber : '-',
                                        Barcode: element.barcode ? element.barcode : '-',
                                        ItemDescription: element.itemDescription,
                                        PriceValue: element.priceValue,
                                        PriceCurrency: element.priceCurrency,
                                        ManufacturingDate: element.manufacturingDate ? element.manufacturingDate : '-',
                                        ExpiryDate: element.expiryDate,
                                        AlertDate: element.alertDate,
                                        AlertDays: element.alertDays,
                                        From: element.from,
                                        HandlingUnit: materialHandlingUnit.length !== 0 ? materialHandlingUnit.join() : "-",
                                        PickAlert: element.pickAlert ? element.pickAlert : '-',
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        DateModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY") : '-',
                                        TimeModified: (element.timeModified) ? moment.unix(element.timeModified).format("DD/MMM/YYYY hh:mm:ss") : '-',
                                        CreatedBy: createdByName,
                                        ModifiedBy: modifiedByName ? modifiedByName : '-', ActiveStatus: (element.activeStatus == 1) ? 'Active' : 'Inactive',
                                        Width: (element.itemSystemSpecification[0].Width) ? element.itemSystemSpecification[0].Width : '-',
                                        Length: (element.itemSystemSpecification[0].length) ? element.itemSystemSpecification[0].length : '-',
                                        Height: (element.itemSystemSpecification[0].height) ? element.itemSystemSpecification[0].height : '-',
                                        Weight: (element.itemSystemSpecification[0].weight) ? element.itemSystemSpecification[0].weight : '-',
                                        Volume: (element.itemSystemSpecification[0].volume) ? element.itemSystemSpecification[0].volume : '-',
                                        Diameter: (element.itemSystemSpecification[0].diameter) ? element.itemSystemSpecification[0].diameter : '-'

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

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', itemMasterArray);
                            }
                        });
                    }
                });
            });
            //
            // fs.unlink(fileDest);
            flowController.on('1', function (itemMasterArray) {
                (showConsole) ? console.log('1') : '';
                var path = "./public/files/reports/download/itemMaster-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {
                        console.log('enter');
                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/itemMaster-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', itemMasterArray);
                                });
                            }
                        } else {

                            flowController.emit('2', itemMasterArray);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (itemMasterArray) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(itemMasterArray);

                var fileName = 'itemMaster_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/itemMaster-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(itemMasterArray, model, optionObject, function (err, result) {

                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/itemMaster-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'ITEMMASTER';
                        dataObject.name = 'ITEMMASTER DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {
                                console.log("err");
                                //res.json(err);
                            } else {

                                console.log("ITEMMASTER DOWNLOAD EXCEL:  success");
                                // res.json('error');
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
                    MODULE: 'EXPORT-ITEMMASTER',
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

            flowController.emit('RESPONSE');
        });
//
// 
//-----------------------------------------------------------------------------------------------------------------
//Alerts Reports
//-----------------------------------------------------------------------------------------------------------------
router.route('/v1/reportMaster/masterData/processMaster/action/export/alert/')

        .post(function (req, res) {

            var showConsole = 1;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var baseUrl = req.body.baseUrl.trim();
            var startDate = req.body.startDate;
            var endDate = req.body.endDate;

            var directories = ["./public/files/reports/", "./public/files/reports/download/", "./public/files/reports/download/alert-reports/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });


            var ObjQuery = {};
            ObjQuery.warehouseId = warehouseId;

            if (startDate) {
                if (startDate !== '' && endDate !== '')
                    ObjQuery.timeCreated = {$gte: startDate, $lte: endDate};
                else if (startDate && endDate == '')
                    ObjQuery.timeCreated = {$gte: startDate};
                else
                    ObjQuery.timeCreated = {$gte: startDate};
            }

            var flowController = new EventEmitter();
            var alertArray = [];

            flowController.on('RESPONSE', function () {
                (showConsole) ? console.log('RESPONSE') : '';

                flowController.emit('START');
                flowController.emit('END', {message: "Your Request is in process. You will get notified on alert when done.!", status: 'success', statusCode: '200'});
            });

            flowController.on('START', function () {

                (showConsole) ? console.log("START") : '';

                alertsModel.find(ObjQuery).lean().sort({'timeCreated': 1}).exec(function (err, alertRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (alertRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "Alert data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {


                        async.eachSeries(alertRow, function (element, callback) {

                            async.waterfall([

                                function (waterfallcallback) {

                                    var userArray = [];
                                    var statusArray = [];
                                    var timeSeenArray = [];

                                    async.eachSeries(element.users, function (elementUser, callbackUser) {

                                        usersModel.findOne({_id: elementUser.userId, activeStatus: 1}, function (err, userRow) {
                                            if (err) {

                                                callbackUser(err);
                                            } else if (userRow == null) {

                                                setImmediate(callbackUser);
                                            } else {

                                                userArray.push(userRow.username);
                                                statusArray.push((elementUser.status == 1) ? 'Seen' : '-' || (elementUser.status == 0) ? 'Unseen' : '-');
                                                timeSeenArray.push((elementUser.timeSeen) ? moment.unix(elementUser.timeSeen).format("DD/MMM/YYYY hh:mm:ss") : '-');
                                                setImmediate(callbackUser);
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {
                                            waterfallcallback(err);
                                        } else {
                                            waterfallcallback(null, userArray, statusArray, timeSeenArray);
                                        }
                                    });
                                }, function (userArray, statusArray, timeSeenArray, waterfallcallback) {
                                    data = {
                                        Module: element.module,
                                        Name: element.name,
                                        Username: userArray.length !== 0 ? userArray.join() : "-",
                                        Text: element.text,
                                        Status: statusArray.length !== 0 ? statusArray.join() : "-", //(element.status == 1) ? 'Seen' : '-' || (element.status == 0) ? 'Unseen' : '-',
                                        TimeSeen: timeSeenArray.length !== 0 ? timeSeenArray.join() : "-",
                                        DateCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : '-',
                                        TimeCreated: (element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY hh:mm:ss") : '-'
                                                // TimeUpdated: element.timeUpdated
                                    };
                                    waterfallcallback(null, data);
                                }
                            ], function (err, result) {
                                if (err) {

                                    callback(err);
                                } else {

                                    alertArray.push(result);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err) {

                            } else {

                                flowController.emit('1', alertArray);
                            }
                        });
                    }
                });
            });

            // fs.unlink(fileDest);
            flowController.on('1', function (alertArray) {
                (showConsole) ? console.log('1') : '';

                var path = "./public/files/reports/download/alert-reports/";
                fs.readdir(path, function (err, files) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read! try later', status: 'ERROR', statusCode: '404'});
                    } else {

                        if (files.length > 0) {
                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);
                            });
                            var path = './public/files/reports/download/alert-reports/' + fileArray[0];

                            if (fs.existsSync(path)) {
                                require("fs").unlink(path, function () {

                                    console.log('File acknowledged! Removed from server.');
                                    flowController.emit('2', alertArray);
                                });
                            }
                        } else {

                            flowController.emit('2', alertArray);
                        }
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (alertArray) {

                (showConsole) ? console.log('2') : '';
                var model = mongoXlsx.buildDynamicModel(alertArray);

                var fileName = 'alert_report_Excel-' + moment(new Date()).format("ddd MMM DD YYYY") + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/reports/download/alert-reports/",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(alertArray, model, optionObject, function (err, result) {

                    if (err) {

                        console.log("err");
                    } else {

                        dataObject = {};
                        dataObject.warehouseId = warehouseId;
                        dataObject.textName = ' <a target="_blank" href="' + baseUrl + 'files/reports/download/alert-reports/' + result.fileName + '">CLICK HERE</a> to download ' + fileName + " Report.";
                        dataObject.module = 'ALERT';
                        dataObject.name = 'ALERT DOWNLOAD EXCEL : ' + fileName;
                        dataObject.id = '';

                        alertService.createAlert(dataObject, function (err, response) {
                            if (err) {

                                console.log("err");
                            } else {

                                console.log("ALERT DOWNLOAD EXCEL:  success");
                            }
                        });
                    }
                });
            });
            //
            // End
            flowController.on('END', function (result) {

                (showConsole) ? console.log("END") : '';
                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log("ERROR") : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('RESPONSE');
        });
//
//
module.exports = router;

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? "  " : "  ") : "0";
    var mDisplay = m > 0 ? m + (m == 1 ? "  " : "  ") : "0";
    var sDisplay = s > 0 ? s + (s == 1 ? "  " : " ") : "0";
    var hh = (hDisplay > 9) ? hDisplay : '0' + hDisplay;
    var mm = mDisplay > 9 ? mDisplay : '0' + mDisplay;
    var ss = sDisplay > 9 ? sDisplay : '0' + sDisplay;

    return hh + ":" + mm + ":" + ss;
}
;

function cleanArray(actual) {
    var newArray = new Array();
    for (var i = 0; i < actual.length; i++) {
        if (actual[i]) {
            newArray.push(actual[i]);
        }
    }
    return newArray;
}