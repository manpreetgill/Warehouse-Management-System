var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var mongoXlsx = require('mongo-xlsx');
var requestify = require('requestify');
var MagicIncrement = require('magic-increment');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var async = require('async');
var json2csv = require('json2csv');
var csv = require('csvtojson');
var multer = require('multer');
var os = require('os');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/aider';
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Import & add the rule engine to database (Client Specific Exercise) & part of AUTOAPI
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/ruleEngine/manual-import/')

        .post(function (req, res) {

            var consoleLog = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var path = "./public/files/rule-engine/ruleEngine.xlsx";

            var flowController = new EventEmitter();

            var locationArray = [];

            // Initial validation
            flowController.on('START', function () {

                var model = null;

                mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {

                    var isArray = Array.isArray(mongoData[0]);

                    if (isArray) {

                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});
                    } else {

                        flowController.emit('0', mongoData);
                    }
                });
            });

            // Inserting locations
            flowController.on('0', function (mongoData) {

                async.eachSeries(mongoData, function (element, callback) {

                    if (element.location == '') {

                        callback({message: 'Customer address can not be kept blank!', status: 'error', statusCode: 304});
                    } else if (locationArray.indexOf(element.location) > -1) {

                        callback({message: 'Same address for more than one location found! Address duplication not allowed', status: 'error', statusCode: 304});
                    } else {

                        locationArray.push(element);
                        setImmediate(callback);
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('1', mongoData);
                    }
                });
            });

            // Inserting locations
            flowController.on('1', function (mongoData) {

                async.eachSeries(mongoData, function (element, callback) {

                    var sequence = parseInt(element.sequence);
                    var location = element.location;
                    var palletSize = element.palletSize;
                    var palletType = element.palletType;
                    var zone = element.zone;

                    ruleEngineModel.findOne({'location': location, 'activeStatus': 1}, function (err, ruleEngineRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (ruleEngineRow != null) {

                            callback({message: 'Excel data modified or corrupted/User modified other than required fields! Try addressing again.', status: 'error', statusCode: '404'});
                        } else {

                            palletSizeArray = [];
                            palletTypeArray = [];

                            if (palletSize.indexOf('/') !== -1) {

                                temp = palletSize.split('/');
                                palletSizeArray = temp;
                            } else {

                                palletSizeArray.push(palletSize);
                            }

                            palletTypeArray = [];

                            if (palletType.indexOf('/') !== -1) {

                                temp = palletType.split('/');
                                palletTypeArray = temp;
                            } else {

                                palletTypeArray.push(palletType);
                            }

                            var ruleEngine = new ruleEngineModel();

                            ruleEngine.warehouseId = warehouseId;
                            ruleEngine.location = location;
                            ruleEngine.palletSize = palletSizeArray;
                            ruleEngine.palletType = palletTypeArray;
                            ruleEngine.sequence = sequence;
                            ruleEngine.zone = zone;
                            ruleEngine.timeCreated = timeInInteger;

                            ruleEngine.save(function (err) {
                                if (err) {

                                    callback({message: 'ERROR WHILE CONFIGURING RULE ENGINE!' + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: 'Rule engine database is set!', status: 'success', statusCode: '200'});
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
                    MODULE: 'IMPORT-RULE-ENGINE-ADD',
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
// Export rule engine (Client Specific Exercise)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/import-export/ruleEngine/manual-export/')

        .post(function (req, res) {

            var baseUrl = req.body.baseUrl.trim();

            var path1 = '/files/rule-engine/export/ruleEngine.xlsx';
            var path2 = '/files/rule-engine/ruleEngine.xlsx';

            var ruleEnginePath = (fs.existsSync(path1)) ? path1 : path2;

            var downloadPath = baseUrl + ruleEnginePath;

            res.json({data: downloadPath, status: 'success', statusCode: '200'});

        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Import & update the rule engine to database (Client Specific Exercise)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/ruleEngine/manual-import/')

        .post(function (req, res, next) {
            // Multar based file upload in Binary chunks
            multer({
                dest: os.tmpdir() + '/',
                limits: {files: 1}
            }, next());
            // Multar based file upload in Binary chunks
        }, function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId;

            var fileXLS = req.files.fileXLS;

            var modifiedBy = req.body.modifiedBy;

            var loggedInUserRoleHeader = req.headers["loggedinuserrole"];

            var module = req.headers["module"];

            console.log(module);

            var fileName = 'RE_' + moment(new Date()).format('DDMMYYYYHHMMSS');

            var filePath = "./public/files/rule-engine/edit/" + fileName + ".xlsx";

            var directories = ["./public/files/rule-engine/", "./public/files/rule-engine/edit/", "./public/files/rule-engine/export/"];

            directories.forEach(function (object) {

                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            var flowController = new EventEmitter();

            // Initial validation
            flowController.on('START', function () {

                (console.log) ? console.log('START') : '';

                require("fs").writeFile(filePath, fileXLS.data, 'binary', function (err) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var model = null;

                        mongoXlsx.xlsx2MongoData(filePath, model, function (err, mongoData) {

                            flowController.emit('0', mongoData);
                        });
                    }
                });
            });

            // Initial validation
            flowController.on('0', function (mongoData) {

                (consoleLog) ? console.log('0') : '';

                var isArray = Array.isArray(mongoData[0]);

                if (isArray) {

                    require("fs").unlink(filePath, function () {

                        flowController.emit('ERROR', {message: 'Excel file you are uploading should contain only one sheet with required data! Multiple sheets are not allowed.', status: 'success', statusCode: '200'});
                    });
                } else {

                    flowController.emit('1', mongoData);
                }
            });

            //Sequence Based Validation
            flowController.on('1', function (mongoData) {

                (consoleLog) ? console.log('1') : '';

                var count = 1;

                var customerAddressArray = [];

                validationErrorArray = [];

                async.eachSeries(mongoData, function (element, callback) {

                    if (element.sequence == null) {

                        validationErrorArray.push({message: 'Sequence must be present! See line no. ' + count});
                    } else {

                        ruleEngineModel.findOne({'sequence': element.sequence}, function (err, ruleEngineRow) {

                            if (err) {

                                validationErrorArray.push({message: 'INTERNAL SERVER ERROR: ' + err});
                                callback();
                            } else if (element.location == null) {

                                validationErrorArray.push({message: 'Location can not be kept blank! See line no. ' + count});
                                setImmediate(callback);
                            } else if (element.palletType == null) {

                                validationErrorArray.push({message: 'Pallet Type can not be kept blank! See line no. ' + count});
                                setImmediate(callback);
                            } else if (element.palletSize == null) {

                                validationErrorArray.push({message: 'Pallet Size can not be kept blank! See line no. ' + count});
                                setImmediate(callback);
                            } else if (element.zone == null) {

                                validationErrorArray.push({message: 'Zone can not be kept blank! See line no. ' + count});
                                setImmediate(callback);
                            } else if (ruleEngineRow == null) {

                                //validationErrorArray.push({message: 'Rule Engine with sequence not found.'});
                                setImmediate(callback);
                            } else {
                                if (element.location != ruleEngineRow.location || element.zone != ruleEngineRow.zone) {

                                    if (module == 'RULEENGINE-ADD') {

                                        validationErrorArray.push({message: 'You are not allowed to modify existing rule engine location/zone! However you can add new locations. See line no. ' + count + ' from excel file.'});
                                    } else if (customerAddressArray.indexOf(element.location) >= 0) {

                                        validationErrorArray.push({message: 'Location ' + element.location + ' is coming more than once! See line no. ' + count + ' from excel file.'});
                                    } else {

                                        customerAddressArray.push(element.location);
                                    }
                                    setImmediate(callback);
                                } else {

                                    setImmediate(callback);
                                }
                                count++;
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else if (validationErrorArray.length != 0) {

                        flowController.emit('ERROR', {message: 'Following errors occurred while validating Excel file', validationErrors: validationErrorArray, status: 'error', statusCode: 304});
                    } else {

                        flowController.emit('2', mongoData);
                    }
                });
            });

            // ADD/MODIFY LOCATION
            flowController.on('2', function (mongoData) {

                (consoleLog) ? console.log('2') : '';

                async.eachSeries(mongoData, function (element, callback) {

                    var location = element.location;
                    var palletSize = element.palletSize;
                    var palletType = element.palletType;
                    var zone = element.zone;
                    var sequence = element.sequence;

                    palletSizeArray = [];
                    palletTypeArray = [];

                    if (palletSize.indexOf(',') !== -1) {

                        temp = palletSize.split(',');
                        palletSizeArray = temp;
                    } else {

                        palletSizeArray.push(palletSize);
                    }

                    palletTypeArray = [];

                    if (palletType.indexOf(',') !== -1) {

                        temp = palletType.split(',');
                        palletTypeArray = temp;
                    } else {

                        palletTypeArray.push(palletType);
                    }

                    ruleEngineModel.findOne({'sequence': sequence, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, ruleEngineRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (ruleEngineRow == null) {

                            var ruleEngine = new ruleEngineModel();

                            ruleEngine.warehouseId = warehouseId;
                            ruleEngine.location = location.trim();
                            ruleEngine.palletSize = palletSizeArray;
                            ruleEngine.palletType = palletTypeArray;
                            ruleEngine.sequence = sequence;
                            ruleEngine.zone = zone;
                            ruleEngine.timeCreated = timeInInteger;

                            ruleEngine.save(function (err) {
                                if (err) {

                                    callback({message: 'ERROR WHILE CONFIGURING RULE ENGINE!' + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        } else {

                            ruleEngineRow.sequence = sequence;
                            ruleEngineRow.location = location;
                            ruleEngineRow.palletSize = palletSizeArray;
                            ruleEngineRow.palletType = palletTypeArray;
                            ruleEngineRow.zone = zone;

                            ruleEngineRow.save(function (err) {
                                if (err) {

                                    callback({message: 'ERROR WHILE CONFIGURING RULE ENGINE!' + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });

                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('EXPORT-1', {message: 'operation successful-Rule Engine Updated'});
                    }
                });
            });

            // MongoData to Excel
            flowController.on('EXPORT-1', function (result) {

                (consoleLog) ? console.log('EXPORT-1') : '';

                var ruleEngineArray = [];

                ruleEngineModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).sort({'sequence': 1}).exec(function (err, ruleEngineRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (ruleEngineRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Rule ENgine not configured!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(ruleEngineRow, function (element, callback) {

                            var data = {};
                            data.sequence = element.sequence;
                            data.location = element.location;
                            data.palletSize = element.palletSize.join();// Convert Array to CSV string
                            data.palletType = element.palletType.join();// Convert Array to CSV string
                            data.zone = element.zone;

                            ruleEngineArray.push(data);
                            callback();
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('EXPORT-2', ruleEngineArray);
                            }
                        });
                    }
                });
            });

            // MongoData to Excel
            flowController.on('EXPORT-2', function (ruleEngineArray) {

                (consoleLog) ? console.log('EXPORT-2') : '';

                var model = mongoXlsx.buildDynamicModel(ruleEngineArray);

                var optionObject = {
                    save: true,
                    sheetName: [],
                    fileName: "ruleEngine.xlsx",
                    path: './public/files/rule-engine/export',
                    defaultSheetName: "Rule Engine"
                };

                mongoXlsx.mongoData2Xlsx(ruleEngineArray, model, optionObject, function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: 'Rule engine updated into system!', status: 'success', statusCode: '200'});
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
                    MODULE: 'IMPORT-RULE-ENGINE-UPDATE',
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