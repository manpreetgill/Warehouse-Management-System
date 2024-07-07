var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var mongoXlsx = require('mongo-xlsx');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMasterModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMasterModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMasterModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var excelPathStoreModel = require('../../../models/mongodb/locationMaster-excelPathStore/collection-excelPathStore.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
//IMPORT EXPORT LOCATION MASTER : Upload & update the customer address to location
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/customer-address/manual-import/')

        .post(function (req, res) {

            var consoleLog = 1;

            //(consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var date = 'CAUPLOAD_' + moment(new Date()).format('DDMMYYYYHHMMSS');

            var fileXLS = req.body.fileXLS;

            var path = "./public/files/location/upload/" + date + ".xlsx";

            var directories = ["./public/files/location/", "./public/files/location/upload/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            var validationErrorArray = [];
            // Initialize
            flowController.on('START', function () {

                (consoleLog) ? console.log('1') : '';

                require("fs").writeFile(path, fileXLS, 'base64', function (err) {
                    if (err) {

                        validationErrorArray.push({message: "INTERNAL SERVER ERROR " + err});
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var model = null;

                        mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {
                            if (err) {

                                validationErrorArray.push({message: 'ERROR WHILE UPLOADING EXCEL FILE ' + err});
                                flowController.emit('ERROR', {message: 'ERROR WHILE UPLOADING EXCEL FILE ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('1', mongoData);
                            }
                        });
                    }
                });
            });

            // Initial validation
            flowController.on('1', function (mongoData) {

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(filePath, function () {

                        validationErrorArray.push({message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.'});
                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});
                    });
                } else {

                    flowController.emit('2', mongoData);
                }
            });

            // Validate data against customer address
            flowController.on('2', function (mongoData) {

                (consoleLog) ? console.log('2') : '';

                var customerAddressColumnArray = [];

                var count = 1;

                async.eachSeries(mongoData, function (element, callback) {
                    count++;

                    if (element.CustomerAddress == null || element.CustomerAddress == '') {

                        validationErrorArray.push({message: 'Customer address can not be kept blank! See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else if (customerAddressColumnArray.indexOf(element.CustomerAddress) > -1) {


                        validationErrorArray.push({message: 'Same address ' + element.CustomerAddress + 'for more than one location found! Address duplication not allowed, See line no. ' + count + ' in Excel file.'});
                        setImmediate(callback);
                    } else {

                        customerAddressColumnArray.push(element.CustomerAddress);
                        setImmediate(callback);
                    }
                }, function () {

                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following erros occurred while uploading customer addresses', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('3', mongoData);
                    }
                });
            });

            // Check if all locations belongs to rule engine
            flowController.on('3', function (mongoData) {

                (consoleLog) ? console.log('3') : '';

                var newMongoData = [];

                async.eachSeries(mongoData, function (element, callback) {

                    var customerAddress = element.CustomerAddress;

                    ruleEngineModel.findOne({'location': customerAddress, 'activeStatus': 1}).exec(function (err, ruleEngineRow) {

                        if (err) {

                            validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                            setImmediate(callback);
                        } else if (ruleEngineRow == null) {

                            validationErrorArray.push({message: 'Customer address ' + customerAddress + ' does not belongs to current available warehouse Rule-Engine! Update Rule-Engine to allow new locations first!'});
                            setImmediate(callback);
                        } else {

                            element.ruleEngineZone = ruleEngineRow.zone;
                            newMongoData.push(element);
                            setImmediate(callback);
                        }
                    });
                }, function () {

                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following erros occurred while uploading customer addresses', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('4', newMongoData);
                    }
                });
            });

            // Set customer addresses to locations
            flowController.on('4', function (mongoData) {

                (consoleLog) ? console.log('4') : '';

                async.eachSeries(mongoData, function (element, callback) {

                    var systemAddress = element.SystemAddress;
                    var customerAddress = element.CustomerAddress.toUpperCase();
                    var mongoId = element.SystemId;

                    locationStoreModel.findOne({'_id': mongoId, 'systemAddress': systemAddress, 'activeStatus': 1}, function (err, locationStoreRow) {
                        if (err) {

                            validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                            setImmediate(callback);
                        } else if (locationStoreRow == null) {

                            validationErrorArray.push({message: 'Some of the excel fields are modified! Download & try addressing again.'});
                            setImmediate(callback);
                        } else {

                            var zoneId = locationStoreRow.zoneId;

                            zoneMasterModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                                if (err) {

                                    validationErrorArray.push({message: 'INTERNAL SERVER ERROR ' + err});
                                    setImmediate(callback);
                                } else if (zoneMasterRow == null) {

                                    validationErrorArray.push({message: 'Zone missing from database'});
                                    setImmediate(callback);
                                } else if (zoneMasterRow.zone != element.ruleEngineZone) {

                                    validationErrorArray.push({message: 'Zone mismatched! Zone defined for location ' + customerAddress + ' in Rule engine is ' + element.ruleEngineZone + ' & In location Import Excel ' + zoneMasterRow.zone});
                                    setImmediate(callback);
                                } else {

                                    locationStoreRow.customerAddress = customerAddress;
                                    locationStoreRow.timeModified = timeInInteger;

                                    locationStoreRow.save(function (err, result) {
                                        if (err) {

                                            validationErrorArray.push({message: 'Unable to update customer address! Try again later.' + err});
                                            callback({message: 'Unable to update customer address! Try again later.', status: 'error', statusCode: '500'});
                                        } else {

                                            setImmediate(callback);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (validationErrorArray.length > 0) {

                        flowController.emit('ERROR', {message: 'Following erros occurred while uploading customer addresses', validationErrors: validationErrorArray, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('END', {message: 'Customer addressing set to locations!', status: 'success', statusCode: '200'});
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'IMPORT-LOCATION-UPDATE',
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
//IMPORT EXPORT LOCATION MASTER : Download location address in excel format
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/customer-address/manual-export/')

        .post(function (req, res) {

            var warehouseId = req.body.warehouseId.trim();
    
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var baseUrl = req.body.baseImageUrl.trim() + '/files/location/download/';

            var directories = ["./public/files/location/", "./public/files/location/download/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            // Get all locations in ascending order
            flowController.on('START', function () {

                locationStoreModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).sort({'systemAddress': 1}).exec(function (err, locationStoresRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoresRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No locations configured!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', locationStoresRow);
                    }
                });
            });

            // Generate Object rows
            flowController.on('1', function (locationStoresRow) {

                var locationStoreArray = [];

                async.eachSeries(locationStoresRow, function (element, callbackDone) {

                    areaMasterModel.findOne({'_id': element.areaId, 'activeStatus': 1}, function (err, areaMasterRow) {

                        if (err) {

                            callbackDone({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                        } else {

                            zoneMasterModel.findOne({'_id': element.zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {

                                if (err) {

                                    callbackDone({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    lineMasterModel.findOne({'_id': element.lineId, 'activeStatus': 1}, function (err, lineMasterRow) {

                                        if (err) {

                                            callbackDone({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            levelMasterModel.findOne({'_id': element.levelId, 'activeStatus': 1}, function (err, levelMasterRow) {

                                                if (err) {

                                                    callbackDone({message: 'INTERNAL SERVER ERROR: ' + err, status: 'error', statusCode: '500'});
                                                } else {

                                                    var temp = {
                                                        'SystemId': element._id,
                                                        'Area': areaMasterRow.area,
                                                        'Zone': zoneMasterRow.zone,
                                                        'Line': lineMasterRow.line,
                                                        'Level': levelMasterRow.level,
                                                        'SystemAddress': element.systemAddress,
                                                        'CustomerAddress': (element.customerAddress) ? element.customerAddress : ''
                                                    };

                                                    locationStoreArray.push(temp);
                                                    callbackDone();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('2', locationStoreArray);
                    }
                });
            });

            // Save file to database
            flowController.on('2', function (locationStoreArray) {

                var model = mongoXlsx.buildDynamicModel(locationStoreArray);

                var fileName = 'CADOWNLOAD_' + moment(new Date()).format('DDMMYYYYHHMMSS') + ".xlsx";

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: fileName,
                    path: "./public/files/location/download",
                    defaultSheetName: "worksheet"
                };

                mongoXlsx.mongoData2Xlsx(locationStoreArray, model, optionObject, function (err, result) {

                    var newExcelPathStore = new excelPathStoreModel();

                    newExcelPathStore.excelPathDownload = result.fileName;
                    newExcelPathStore.warehouseId = warehouseId;

                    newExcelPathStore.save(function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('END', {data: baseUrl + result.fileName, status: 'success', statusCode: '200'});
                        }
                    });
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
                    MODULE: 'EXPORT-LOCATION-ADD',
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