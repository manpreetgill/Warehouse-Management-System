var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var json2csv = require('json2csv');
var csv = require('csvtojson');
var fs = require('fs');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var virtualLocationStore = require('../../../models/mongodb/locationMaster-virtualLocationStore/collection-virtualLocationStore.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
//----------------------------------------------------------------------------------------------------------------------------
var alertService = require('../../../service-factory/alertService.js');
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
// Store reprocess file to server
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/in/get-file/reprocess-file/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            // Base URL 
            var baseUrl = req.body.baseUrl.trim();//'http://192.168.0.116:2000/avancer';
            // Warehouse Id for data separation
            var warehouseId = req.body.warehouseId.trim();
            // Name of the file (Keep same file name while adding to reprocess folder)
            var fileName = req.body.fileName.trim();
            // Get original name
            var split = fileName.split('.');
            // filename            
            var onlyFileName = split[0] + '_' + timeInInteger;
            // Data in JSON object
            var jsonObject = req.body.desktopFile;
            // File Headers predefined
            var fields = ['BoxType', 'BoxNo', 'PalletNo', 'PalletSize', 'PalletType'];
            // Convert JSON data to csv file at server side
            var csvFile = json2csv({data: jsonObject, fields: fields});

            var directory = './public/files/interface/reprocess/in/';

            var directories = ["./public/files/interface/", "./public/files/interface/reprocess/", "./public/files/interface/reprocess/in/", "./public/files/interface/_errors/"];

            directories.forEach(function (object) {
                (!fs.existsSync(object)) ? fs.mkdirSync(object) : '';
            });

            filePath = './public/files/interface/reprocess/in/' + fileName;

            validationErrors = [];

            var flowController = new EventEmitter();

            // Allow access to request if access lock is not set
            flowController.on('START', function () {

//                var lockAssignment = global.lock_interfaceReprocess;
//
//                if (lockAssignment === 'YES') {
//
//                    setTimeout(function () {
//                        console.log('Retrying: ' + fileName);
//                        flowController.emit('START');
//                    }, 1000);
//                } else {
//
//                    global.lock_interfaceReprocess = 'YES';
//                    console.log('Got access: ' + fileName);
                flowController.emit('START2');
                //}
            });

            // Write file to server
            flowController.on('START2', function () {

                (consoleLog) ? console.log("START2") : '';

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable to read reprocess file: ' + fileName + '! try later', status: 'ERROR', statusCode: '404'});
                    } else {

                        if (fs.existsSync(filePath)) {

                            flowController.emit('ERROR', {message: 'File ' + fileName + ' already copied!', status: 'SUCCESS', statusCode: '200'});
                        } else {

                            setTimeout(function () {

                                fs.writeFile(filePath, csvFile, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: 'Error occurred while copying reprocess file ' + fileName + ' to server ' + err, status: 'ERROR', statusCode: '500'});
                                    } else {

                                        flowController.emit('0');
                                    }
                                });
                            }, 3000);
                        }
                    }
                });
            });

            // Process file and create JSON
            flowController.on('0', function () {

                (consoleLog) ? console.log("0") : '';

                var jsonArray = [];

                csv().fromFile(filePath)

                        .on('json', (jsonObj) => {

                            jsonArray.push(jsonObj);
                        })
                        .on('done', (error) => {

                            if (error) {

                                flowController.emit('ERROR', {message: 'Error occurred parsing reprocess file: ' + fileName, status: 'ERROR', statusCode: '500'});
                            } else {

                                flowController.emit('1', jsonArray);
                            }
                        });
            });

            // Get Reprocess function details
            flowController.on('1', function (jsonArray) {

                (consoleLog) ? console.log("1") : '';

                functionAreaModel.findOne({'warehouseId': warehouseId, 'name': "REPROCESS", 'activeStatus': 1}, function (err, functionRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (functionRow == null) {

                        flowController.emit('ERROR', {message: 'Details of REPROCESS function not found.', status: 'error', statusCode: '304'});

                    } else {

                        var functionId = functionRow._id;

                        flowController.emit('2', jsonArray, functionId);
                    }
                });
            });

            // Validate pallet number & reprocess location
            flowController.on('2', function (jsonArray, functionId) {

                (consoleLog) ? console.log('2') : '';

                var count = 0;

                async.eachSeries(jsonArray, function (element, callback) {

                    count++;

                    async.waterfall([
                        // Getting location details of Box
                        function (waterfallcallback) {

                            (consoleLog) ? console.log("2 W1") : '';

                            itemStoreModel.findOne({'warehouseId': warehouseId, 'itemSerialNumber': element.BoxNo, 'activeStatus': 1}, function (err, itemStoreRow) {

                                if (err) {

                                    validationErrors.push({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    waterfallcallback({status: 'error'});
                                } else if (itemStoreRow == null) {

                                    validationErrors.push({message: 'Box No. ' + element.BoxNo + ' not found in warehouse! See line no. ' + count + ' in file.', status: 'error', statusCode: '304'});
                                    waterfallcallback({status: 'error'});
                                } else {

                                    var locationId = itemStoreRow.locationStoreId;
                                    waterfallcallback(null, locationId);
                                }
                            });
                        },
                        // Check if BoxNo belongs to REPROCESS Area
                        function (locationId, waterfallcallback) {

                            (consoleLog) ? console.log("2 w2") : '';

                            locationStoresModel.findOne({'_id': locationId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, locationRow) {

                                if (err) {

                                    validationErrors.push({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    waterfallcallback({status: 'error'});
                                } else if (locationRow == null) {

                                    validationErrors.push({message: 'Location details of Box No. ' + element.BoxNo + ' not found! See line no. ' + count + ' in file.', status: 'error', statusCode: '304'});
                                    waterfallcallback({status: 'error'});
                                } else {

                                    var loc_function = locationRow.function;

                                    if (functionId != loc_function) {

                                        validationErrors.push({message: 'Location of Box. No: ' + element.BoxNo + ' does not belongs to REPROCESS Area!', status: 'error', statusCode: '304'});
                                        waterfallcallback({status: 'error'});
                                    } else {

                                        waterfallcallback(null);
                                    }
                                }
                            });
                        }
                        // Final
                    ], function (err) {

                        if (err && err.status == 'error') {

                            setImmediate(callback);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function () {

                    if (validationErrors.length > 0) {

                        require("fs").unlink(filePath, function () {

                            flowController.emit('MULTI-ERROR', {message: 'Following errors occurred while validating REPROCESS file', validationErrors: validationErrors, status: 'error', statusCode: 304});
                        });
                    } else {

                        flowController.emit('3', jsonArray);
                    }
                });
            });

            // Seperate virtual updation array and normal updation array
            flowController.on('3', function (jsonArray) {

                (consoleLog) ? console.log('3') : '';

                var normalArray = [];
                var virtualUpdationArray = [];

                async.eachSeries(jsonArray, function (element, callback) {

                    if (element.BoxType == 'R') {

                        virtualUpdationArray.push(element);
                    } else {

                        normalArray.push(element);
                    }
                    setImmediate(callback);
                }, function () {

                    flowController.emit('4', normalArray, virtualUpdationArray);
                });
            });

            // Update Inventory as per file
            flowController.on('4', function (normalArray, virtualUpdationArray) {

                (consoleLog) ? console.log('4') : '';

                async.eachSeries(normalArray, function (element, callback) {

                    var query = {'warehouseId': warehouseId, 'itemSerialNumber': element.BoxNo};

                    if (element.PalletNo != "") {
                        var update = {'$set': {'palletNumber': element.PalletNo, 'randomFields.0.palletSize': element.PalletSize, 'randomFields.0.palletType': element.PalletType, 'randomFields.0.boxType': element.BoxType}};
                    } else {
                        var update = {'$unset': {'palletNumber': 1}, '$set': {'randomFields.0.palletSize': element.PalletSize, 'randomFields.0.palletType': element.PalletType, 'randomFields.0.boxType': element.BoxType}};
                    }

                    itemStoreModel.update(query, update, function (err) {
                        if (err) {

                            validationErrors.push({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        }
                        setImmediate(callback);

                    });
                }, function (err) {

                    if (validationErrors.length > 0) {

                        require("fs").unlink(filePath, function () {

                            flowController.emit('MULTI-ERROR', {message: 'Following errors occurred while validating REPROCESS file', validationErrors: validationErrors, status: 'error', statusCode: 304});
                        });
                    } else {

                        flowController.emit('5', virtualUpdationArray);
                    }
                });
            });

            // Get virtual store buckets
            flowController.on('5', function (virtualUpdationArray) {

                (consoleLog) ? console.log('5') : '';

                virtualLocationStore.findOne({"typeName": "BR", "activeStatus": 1}, function (err, virtualLocationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualLocationStoreRow == null) {

                        flowController.emit('ERROR', {message: "Virtual bucket for Box Rejected(BR) not found.", status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('6', virtualLocationStoreRow, virtualUpdationArray);
                    }
                });
            });

            // Update inventory for Virtual Store
            flowController.on('6', function (virtualLocationStoreRow, virtualUpdationArray) {

                (consoleLog) ? console.log('6') : '';

                async.eachSeries(virtualUpdationArray, function (element, callback) {

                    itemStoreId = '';

                    itemStoreModel.findOne({'warehouseId': warehouseId, 'itemSerialNumber': element.BoxNo, 'activeStatus': 1}, function (err, itemStoreRow) {

                        if (err) {

                            validationErrors.push({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            setImmediate(callback);
                        } else if (itemStoreRow == null) {

                            validationErrors.push({message: 'Box No. ' + element.BoxNo + ' not found in warehouse!', status: 'error', statusCode: '304'});
                            setImmediate(callback);
                        } else {

                            itemStoreId = String(itemStoreRow._id);
                            locationStoreId = itemStoreRow.locationStoreId;

                            itemStoreRow.virtualLocationStoreId = String(virtualLocationStoreRow._id);
                            itemStoreRow.previousLocationStoreId = locationStoreId;
                            itemStoreRow.locationStoreId = undefined;
                            itemStoreRow.activeStatus = 3;
                            itemStoreRow.timeModified = timeInInteger;

                            itemStoreRow.save(function (err) {
                                if (err) {

                                    validationErrors.push({message: "ERROR OCCURRED WHILE UPDATING ITEM INVENTORY " + err, status: 'error', statusCode: '500'});
                                } else {
                                    var query = {'_id': locationStoreId};
                                    var update = {'$pull': {'assignedItemStoreId': itemStoreId}};

                                    locationStoreModel.update(query, update, function (err) {
                                        if (err)
                                            callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callback);
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (validationErrors.length > 0) {

                        require("fs").unlink(filePath, function () {

                            flowController.emit('MULTI-ERROR', {message: 'Following errors occurred while validating REPROCESS file', validationErrors: validationErrors, status: 'error', statusCode: 304});
                        });
                    } else {

                        flowController.emit('END', {message: "Operation Successful.", status: 'success', statusCode: '200'});
                    }
                });
            });

            //END
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';
                global.lock_interfaceReprocess = 'NO';
                res.json(result);
            });

            // Error Handling : Array of errors while processing
            flowController.on('MULTI-ERROR', function (error) {

                (consoleLog) ? console.log('MULTI-ERROR') : '';
                (consoleLog) ? console.log(error) : '';

                var textFile = "./public/files/interface/_errors/" + onlyFileName + ".txt";

                fs.writeFile(textFile, 'Following errors occurred while processing REPROCESS File : ' + fileName + '\n\n', function (err) {
                    if (err) {
                        console.log('Error Occurred while creating directory: ' + err);
                        res.json(error);
                    } else {
                        flowController.emit('MULTI-ERROR2', error, textFile);
                    }
                });
            });

            // Error Handling : Array of errors while processing
            flowController.on('MULTI-ERROR2', function (error, textFile) {

                (consoleLog) ? console.log('MULTI-ERROR22222') : '';

                var count = 1;
                var text = 'Following errors occurred while processing PUT File : ' + fileName + '\n\n';

                async.eachSeries(error.validationErrors, function (element, callback) {

                    var append = count + '. ' + element.message + "\n";
                    text = text + append;
                    count++;
                    setImmediate(callback);

                }, function () {

                    fs.writeFile(textFile, text, function (err) {
                        if (err) {

                            console.log('Unable to append ' + err);
                        } else {

                            var ip = baseUrl.split('/')[2].split(':')[0];
                            var port = baseUrl.split('/')[2].split(':')[1];

                            var textFilePath = 'http://' + ip + ':' + port + "/files/interface/_errors/" + onlyFileName + ".txt";

                            dataObject = {};
                            dataObject.warehouseId = warehouseId;
                            dataObject.textName = 'Errors occurred while processing Reprocess file :<b>' + fileName + '</b> via Interface. <a target="_blank" href="' + textFilePath + '">CLICK HERE</a> to know more.';
                            dataObject.module = 'REPROCESS';
                            dataObject.name = 'REPROCESS : ' + fileName;
                            dataObject.id = '';

                            alertService.createAlert(dataObject, function (err, response) {
                                if (err) {
                                    res.json(err);
                                } else {
                                    res.json(error);
                                }
                                global.lock_interfaceReprocess = 'NO';
                            });
                        }
                    });
                });
            });

            // Error Handling : Single error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                require("fs").unlink(filePath);

                dataObject = {};
                dataObject.warehouseId = warehouseId;
                dataObject.textName = error.message;
                dataObject.module = 'REPROCESS';
                dataObject.name = 'REPROCESS : ' + fileName;
                dataObject.id = '';

                alertService.createAlert(dataObject, function (err, response) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(error);
                    }
                    global.lock_interfaceReprocess = 'NO';
                });
            });

            //ITIRATION
            flowController.emit('START');
        });
//
//
module.exports = router;