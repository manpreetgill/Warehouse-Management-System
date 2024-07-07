var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
var areaMastersModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All zone under specific area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/zone/:areaId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.params.areaId.trim(); // MongoId of the warehouse

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                areaMastersModel.findOne({'_id': areaId, 'activeStatus': 1}, function (err, areaRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaRow == null) {

                        flowController.emit('ERROR', {message: "No zone configured under this area!", status: 'error', statusCode: '304'});
                    } else {

                        zoneMastersModel.find({'areaId': areaId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (zoneMasterRow.length == 0) {

                                flowController.emit('ERROR', {message: "No zone configured under this area!", status: 'error', statusCode: '304'});
                            } else {

                                var zoneMastersArray = [];

                                async.eachSeries(zoneMasterRow, function (element, callback) {

                                    var zone = {id: element._id, name: element.zone, numberOfLine: element.numberOfLine};

                                    zoneMastersArray.push(zone);

                                    setImmediate(callback);

                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "Operation Successful.", data: zoneMastersArray, requiredZone: areaRow.numberOfZone, currentZone: zoneMastersArray.length, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-ZONE',
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
// READ one zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readOne/zone/:zoneId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var zoneId = req.params.zoneId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                zoneMastersModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: "No area configured into the system!", status: 'error', statusCode: '404'});
                    } else {
                        var areaMastersArray = [];
                        areaMastersArray.push({id: zoneMasterRow._id, name: zoneMasterRow.area, numberOfLine: zoneMasterRow.numberOfLine});

                        flowController.emit('END', {data: areaMastersArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
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
                    MODULE: 'READONE-ZONE',
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
// Create Zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/zone/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.body.areaId.trim();

            var zoneName = req.body.zoneName.trim().toUpperCase(); //User defined zone name

            var numberOfLine = req.body.numberOfLine.trim();

            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {
                //numberOfArea
                areaMastersModel.findOne({'_id': areaId, 'activeStatus': 1}, function (err, areaMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        numberOfZone = areaMasterRow.numberOfZone;
                        flowController.emit('1', numberOfZone);
                    }
                });
            });
            //
            flowController.on('1', function (numberOfZone) {

                zoneMastersModel.count({"areaId": areaId, 'activeStatus': 1}, function (err, numberOfZoneCount) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (numberOfZoneCount === parseInt(numberOfZone))
                        flowController.emit('ERROR', {message: 'AREA REQUIRED ZONE AND CREATE ZONE COMPLETED!!!', status: 'error', statusCode: '304'});
                    else
                        flowController.emit('2');
                });
            });
            //
            flowController.on('2', function (numberOfZone) {

                zoneMastersModel.find({'areaId': areaId, 'zone': zoneName, 'activeStatus': 1}, function (err, zoneMasterRow) {

                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (zoneMasterRow.length != 0)
                        flowController.emit('ERROR', {message: "This zone name already in use! Provide different name.", status: 'success', statusCode: '304'});
                    else
                        flowController.emit('3');
                });
            });
            //
            flowController.on('3', function () {

                areaMastersModel.findOne({"_id": areaId}, function (err, areaMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var areaCodeString = areaMasterRow.areaCodeString;

                        zoneMastersModel.find({"areaId": areaId}).sort({'zoneCode': -1}).exec(function (err, zoneMastersRow) {

                            if (err) {

                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (zoneMastersRow.length != 0) { // Multiple areas present, need to insert with incrementing current present areaCode

                                var zoneCode = zoneMastersRow[0].zoneCode + 1;
                                var zoneCodeString = '';

                                var string = zoneCode.toString();
                                if (parseInt(string) > 9) {

                                    zoneCodeString = "0" + string;
                                } else if (parseInt(string) > 99) {

                                    zoneCodeString = string;
                                } else {

                                    zoneCodeString = "00" + string;
                                }//

                                flowController.emit('4', zoneCode, areaCodeString, zoneCodeString);
                            } else {

                                flowController.emit('4', 1, areaCodeString, '001');
                            }
                        });
                    }
                });
            });
            //
            flowController.on('4', function (zoneCode, areaCodeString, zoneCodeString) {

                var newZoneMaster = new zoneMastersModel();
                newZoneMaster.areaId = areaId;
                newZoneMaster.zone = zoneName;
                newZoneMaster.numberOfLine = numberOfLine;
                newZoneMaster.zoneCode = zoneCode;
                newZoneMaster.zoneCodeString = areaCodeString + zoneCodeString;
                newZoneMaster.createdBy = createdBy;
                newZoneMaster.timeCreated = timeInInteger;

                newZoneMaster.save(function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "New zone added into the system!", status: 'success', statusCode: '201'});
                });
            });
            //
            flowController.on('END', function (result) {

                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-ZONE-ADD',
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
            //START
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update Zone information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/zone/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.body.areaId.trim();

            var zoneId = req.body.zoneId.trim();

            var newZoneName = req.body.newZoneName.trim().toUpperCase(); //User defined zone name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                zoneMastersModel.find({'areaId': areaId, 'zone': newZoneName, 'activeStatus': 1}, function (err, zoneMastersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This zone name already in use! Provide different name.', status: 'success', statusCode: '200'});
                    } else {

                        zoneMastersModel.findOne({'_id': zoneId, 'areaId': areaId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (zoneMasterRow == null) {

                                flowController.emit('ERROR', {message: 'Zone missing! Details tampered/removed from system.', status: 'success', statusCode: '200'});
                            } else if (zoneMasterRow != null) {

                                zoneMasterRow.zone = newZoneName;
                                zoneMasterRow.timeModified = timeInInteger;
                                zoneMasterRow.modifiedBy = modifiedBy;

                                zoneMasterRow.save(function (err) {
                                    if (err)
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    else
                                        flowController.emit('END', {message: 'Zone details updated into the system!', status: 'success', statusCode: '200'});
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
                    MODULE: 'UPDATE-ZONE',
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
//---------------------------------------------------------------------------------------------------------------------------
// Update Line count under this zone
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/updateLineInZone/zone/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.body.areaId.trim();

            var zoneId = req.body.zoneId.trim();

            var numberOfLine = req.body.numberOfLine.trim(); //User defined zone name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                zoneMastersModel.findOne({'_id': zoneId, 'areaId': areaId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Zone missing! Details tampered/removed from system.', status: 'success', statusCode: '200'});
                    } else if (zoneMasterRow != null) {

                        var previousNumberOfLineAdd = parseInt(zoneMasterRow.numberOfLine);

                        previousNumberOfLineAdd += parseInt(numberOfLine);

                        zoneMasterRow.numberOfLine = previousNumberOfLineAdd;
                        zoneMasterRow.timeModified = timeInInteger;
                        zoneMasterRow.modifiedBy = modifiedBy;

                        zoneMasterRow.save(function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: 'Line  updated into the system!', status: 'success', statusCode: '200'});
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
                    MODULE: 'UPDATE-LINE-ZONE',
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
//----------------------------------------------------------------------------------------------------------------------
// Get zone id and zone Name in warehouse
//----------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readAll/zone/')

        .get(function (req, res, next) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            //var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            var flowController = new EventEmitter();

            var zoneMastersArray = [];

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                zoneMastersModel.find({'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No zone configured under this warehouse!", status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(zoneMasterRow, function (element, callback) {

                            var zone = {id: element._id, name: element.zone, numberOfLine: element.numberOfLine};

                            zoneMastersArray.push(zone);
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: "Operation Successful.", data: zoneMastersArray, status: 'success', statusCode: '200'});
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
                    MODULE: 'UPDATE-LINE-ZONE',
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