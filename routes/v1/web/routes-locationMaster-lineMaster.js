var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var functionAreaModel = require('../../../models/mongodb/locationMaster-functionArea/collection-functionArea.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/function/:zoneId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var zoneId = req.params.zoneId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                locationStoresModel.findOne({'zoneId': zoneId, 'activeStatus': 1}, function (err, locationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationRow == null) {

                        flowController.emit('ERROR', {message: "No line configured under this zone!1", status: 'error', statusCode: '404'});
                    } else {

                        var functionId = locationRow.function;
                        flowController.emit('END', {message: "Operation Successful.", function: functionId, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-LINE',
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
//---------------------------------------------------------------------------------------------------------------------------
// Get all lines under zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/line/:zoneId/')

        .get(function (req, res, next) {

            console.log(req.params);

            var zoneId = req.params.zoneId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                console.log('START');
                var lineMastersArray = [];
                zoneMastersModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneRow == null) {

                        flowController.emit('error', {message: "No line configured under this zone!", status: 'error', statusCode: '404'});
                    } else {

                        lineMastersModel.find({'zoneId': zoneId, 'activeStatus': 1}, function (err, lineMasterRow) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (lineMasterRow.length == 0) {

                                flowController.emit('error', {message: "No line configured under this zone!", status: 'error', statusCode: '404'});
                            } else {

                                async.eachSeries(lineMasterRow, function (element, callback) {

                                    var line = {id: element._id, name: element.line, numberOfLevel: element.numberOfLevel};
                                    lineMastersArray.push(line);
                                    setImmediate(callback);
                                }, function (err) {

                                    if (err) {

                                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('end', {message: "Operation Successful.", data: lineMastersArray, requiredLine: zoneRow.numberOfLine, currentLine: lineMastersArray.length, status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        });
                    } //end else
                });
            });
            flowController.on('end', function (result) {

                res.json(result);
            });
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-LINE-READ',
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
//---------------------------------------------------------------------------------------------------------------------------
// Get new line under zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readOne/line/:lineId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var lineId = req.params.lineId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                lineMastersModel.findOne({'_id': lineId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: "No line configured into the system!", status: 'error', statusCode: '404'});
                    } else {

                        var zoneMastersArray = [];
                        zoneMastersArray.push({id: zoneMasterRow._id, name: zoneMasterRow.line, numberOfLevel: zoneMasterRow.numberOfLevel});
                        flowController.emit('END', {data: zoneMastersArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-LINE',
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
//---------------------------------------------------------------------------------------------------------------------------
// Create new line under zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/line/')

        .post(function (req, res) {

            showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var zoneId = req.body.zoneId.trim();
            var lineName = req.body.lineName.trim().toUpperCase(); //User defined line name

            var numberOfLevel = req.body.numberOfLevel.trim();
            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                //numberOfArea
                zoneMastersModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        numberOfLine = zoneMasterRow.numberOfLine;
                        flowController.emit('1', numberOfLine);
                    }
                });
            });

            flowController.on('1', function (numberOfLine) {

                lineMastersModel.count({"zoneId": zoneId, 'activeStatus': 1}, function (err, numberOfLineCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        console.log("numberOfLineCount" + numberOfLineCount + "numberOfLine" + numberOfLine);
                        if (numberOfLineCount === parseInt(numberOfLine)) {

                            flowController.emit('ERROR', {message: 'ZONE REQUIRED LINE AND CREATE LINE COMPLETED!!!', status: 'error', statusCode: '304'});
                        } else {

                            flowController.emit('2');
                        }
                    }
                });
            });

            flowController.on('2', function () {

                lineMastersModel.find({'zoneId': zoneId, 'line': lineName}, function (err, lineMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMasterRow.length != 0) {

                        flowController.emit('ERROR', {message: "This line name already in use! Provide different name.", status: 'success', statusCode: '304'});
                    } else {

                        flowController.emit('3');
                    }
                });
            });

            flowController.on('3', function () {

                zoneMastersModel.findOne({"_id": zoneId}, function (err, zoneMasterRow) {

                    zoneCodeString = zoneMasterRow.zoneCodeString;

                    lineMastersModel.find({"zoneId": zoneId}).sort({'lineCode': -1}).exec(function (err, lineMastersRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (lineMastersRow.length != 0) { // Multiple areas present, need to insert with incrementing current present areaCode

                            var lineCode = lineMastersRow[0].lineCode + 1;

                            var string = lineCode.toString();
                            var lineCodeString = '';

                            if (parseInt(string) > 9) {

                                lineCodeString = "0" + string;
                            } else if (parseInt(string) > 99) {

                                lineCodeString = string;
                            } else {

                                lineCodeString = "00" + string;
                            }//


                            flowController.emit('4', lineCode, zoneCodeString, lineCodeString);
                        } else {

                            flowController.emit('4', 1, zoneCodeString, '001');
                        }
                    });
                });
            });

            flowController.on('4', function (lineCode, zoneCodeString, lineCodeString) {

                var newlineMaster = new lineMastersModel();

                newlineMaster.zoneId = zoneId;
                newlineMaster.line = lineName;
                newlineMaster.numberOfLevel = numberOfLevel;
                newlineMaster.lineCode = lineCode;
                newlineMaster.lineCodeString = zoneCodeString + lineCodeString;
                newlineMaster.createdBy = createdBy;
                newlineMaster.timeCreated = timeInInteger;
                newlineMaster.save(function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: "New line added into the system!", status: 'success', statusCode: '201'});
                    }
                });
            });

            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-LINE-ADD',
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
//---------------------------------------------------------------------------------------------------------------------------
// Update line details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/line/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var zoneId = req.body.zoneId.trim();
            var lineId = req.body.lineId.trim();
            var newLineName = req.body.newLineName.trim().toUpperCase(); //User defined line name

            var modifiedBy = req.body.modifiedBy.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                lineMastersModel.find({"zoneId": zoneId, "line": newLineName, 'activeStatus': 1}, function (err, lineMastersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This line name already in use! Provide different name.', status: 'success', statusCode: '200'});
                    } else {

                        lineMastersModel.findOne({'_id': lineId, 'zoneId': zoneId, 'activeStatus': 1}, function (err, lineMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (lineMasterRow == null) {

                                flowController.emit('ERROR', {message: "Line missing! Details tampered/removed from system", status: 'success', statusCode: '200'});
                            } else if (lineMasterRow != null) {

                                lineMasterRow.line = newLineName;
                                lineMasterRow.timeModified = timeInInteger;
                                lineMasterRow.modifiedBy = modifiedBy;
                                lineMasterRow.timeCreated = timeInInteger;
                                lineMasterRow.save(function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "Line details updated into the system!", status: 'success', statusCode: '200'});
                                    }
                                });
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
                    MODULE: 'UPDATE-LINE',
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
//---------------------------------------------------------------------------------------------------------------------------
// Update count
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/updateLevelInLine/line/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var zoneId = req.body.zoneId.trim();
            var lineId = req.body.lineId.trim();
            var numberOfLevel = req.body.numberOfLevel.trim(); //User defined line name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                lineMastersModel.findOne({'_id': lineId, 'zoneId': zoneId, 'activeStatus': 1}, function (err, lineMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMasterRow == null) {

                        flowController.emit('ERROR', {message: "Line missing! Details tampered/removed from system", status: 'success', statusCode: '200'});
                    } else if (lineMasterRow != null) {

                        var previousNumberOfLevelAdd = parseInt(lineMasterRow.numberOfLevel);
                        previousNumberOfLevelAdd += parseInt(numberOfLevel);
                        lineMasterRow.numberOfLevel = previousNumberOfLevelAdd;
                        lineMasterRow.timeModified = timeInInteger;
                        lineMasterRow.modifiedBy = modifiedBy;
                        lineMasterRow.save(function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Line details updated into the system!", status: 'success', statusCode: '200'});
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
                    MODULE: 'UPDATE-LINE',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err)
                        console.log('Entered error ');
                    else
                        console.log('Entered success ');
                });
                res.json(error);
            });
            //instlize
            flowController.emit('START');
        });
//
//
module.exports = router;