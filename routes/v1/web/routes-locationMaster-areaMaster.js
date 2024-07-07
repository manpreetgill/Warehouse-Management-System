var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//----------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
var areaMastersModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var warehouseMastersModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/area/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaMastersArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: "Warehouse data missing! Records removed/tampered in the system.", status: 'error', statusCode: '404'});
                    } else {

                        areaMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, areaMasterRow) {

                            if (err) { // Serverside error

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (areaMasterRow.length == 0) {

                                flowController.emit('ERROR', {message: "No area configured into the system!", status: 'error', statusCode: '404'});
                            } else {

                                async.eachSeries(areaMasterRow, function (element, callback) {

                                    var area = {id: String(element._id), name: element.area, numberOfZone: element.numberOfZone};

                                    areaMastersArray.push(area);
                                    setImmediate(callback);
                                }, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "Operation Successful.", data: areaMastersArray, currentArea: areaMastersArray.length, requiredArea: warehouseRow.numberOfArea, status: 'success', statusCode: '200'});
                                    }
                                });
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
//---------------------------------------------------------------------------------------------------------------------------
// Get one area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readOne/area/:areaId/')

        .get(function (req, res, next) {

            var areaId = req.params.areaId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                areaMastersModel.findOne({'_id': areaId, 'activeStatus': 1}, function (err, areaMasterRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow == null) {

                        flowController.emit('ERROR', {message: "No area configured into the system!", status: 'error', statusCode: '404'});
                    } else {
                        var areaMastersArray = [];

                        areaMastersArray.push({id: areaMasterRow._id, name: areaMasterRow.area, numberOfZone: areaMasterRow.numberOfZone});

                        flowController.emit('END', {data: areaMastersArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
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
//---------------------------------------------------------------------------------------------------------------------------
// Create new area
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/area/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var areaName = req.body.areaName.trim().toUpperCase(); //User defined area name

            var numberOfZone = req.body.numberOfZone.trim();

            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                //numberOfArea
                warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        numberOfArea = warehouseMasterRow.numberOfArea;
                        flowController.emit('1', numberOfArea);
                    }
                });
            });
            flowController.on('1', function (numberOfArea) {

                areaMastersModel.count({"warehouseId": warehouseId, 'activeStatus': 1}, function (err, numberOfAreaCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        if (numberOfAreaCount === parseInt(numberOfArea)) {

                            flowController.emit('ERROR', {message: 'Warehouse Required AREA AND CREATE AREA COMPLETED!!!', status: 'error', statusCode: '304'});
                        } else {

                            flowController.emit('END');
                        }
                    }
                });
            });

            flowController.on('END', function () {

                areaMastersModel.find({"warehouseId": warehouseId, "area": areaName}, function (err, areaMasterRow) {

                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow.length != 0) {

                        res.json({message: "This area name already in use! Provide different name.", status: 'success', statusCode: '304'});
                    } else {

                        if (areaMasterRow.length == 0) {

                            var newAreaMaster = new areaMastersModel();

                            areaMastersModel.find({"warehouseId": warehouseId}).sort({'areaCode': -1}).exec(function (err, areaMastersRow) {

                                if (err) {

                                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (areaMastersRow.length != 0) { // Multiple areas present, need to insert with incrementing current present areaCode

                                    var areaCode = 0;

                                    areaMastersRow.forEach(function (element) {

                                        if (areaCode == 0) {

                                            areaCode = element.areaCode;
                                        }
                                    });

                                    areaCode = areaCode + 1;

                                    var string = areaCode.toString();
                                    var areaCodeString = (string < 10) ? ('0' + string) : string;

                                    newAreaMaster.warehouseId = warehouseId;
                                    newAreaMaster.area = areaName;
                                    newAreaMaster.numberOfZone = numberOfZone;
                                    newAreaMaster.areaCode = areaCode;
                                    newAreaMaster.areaCodeString = areaCodeString;
                                    newAreaMaster.createdBy = createdBy;
                                    newAreaMaster.timeCreated = timeInInteger;

                                    newAreaMaster.save(function (err) {
                                        if (err) {

                                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            res.json({message: "New area added into the system!", status: 'success', statusCode: '201'});
                                        }
                                    });

                                } else {

                                    if (areaMastersRow.length == 0) {

                                        newAreaMaster.warehouseId = warehouseId;
                                        newAreaMaster.area = areaName;
                                        newAreaMaster.numberOfZone = numberOfZone;
                                        newAreaMaster.areaCode = 1;
                                        newAreaMaster.areaCodeString = '01';
                                        newAreaMaster.createdBy = createdBy;
                                        newAreaMaster.timeCreated = timeInInteger;

                                        newAreaMaster.save(function (err) {
                                            if (err) {
                                                res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {
                                                res.json({message: "New area added into the system!", status: 'success', statusCode: '201'});
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            });
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update area details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/area/')

        .patch(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.body.areaId.trim();

            var warehouseId = req.body.warehouseId.trim();

            var newAreaName = req.body.newAreaName.trim().toUpperCase(); //User defined line name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                areaMastersModel.find({"warehouseId": warehouseId, "area": newAreaName, 'activeStatus': 1}, function (err, areaMastersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This area name already in use! Provide different name.', status: 'success', statusCode: '200'});
                    } else {

                        areaMastersModel.findOne({"_id": areaId, "warehouseId": warehouseId, 'activeStatus': 1}, function (err, areaMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (areaMasterRow == null) {

                                flowController.emit('ERROR', {message: "Area missing! Details tampered/removed from system.", status: 'success', statusCode: '200'});
                            } else if (areaMasterRow != null) {

                                areaMasterRow.area = newAreaName;
                                areaMasterRow.timeModified = timeInInteger;
                                areaMasterRow.modifiedBy = modifiedBy;

                                areaMasterRow.save(function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "Area details updated into the system!", status: 'success', statusCode: '200'});
                                    }
                                });
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
//---------------------------------------------------------------------------------------------------------------------------
// Add zone under area manually
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/updateZoneInArea/area/')

        .patch(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var areaId = req.body.areaId.trim();

            var warehouseId = req.body.warehouseId.trim();

            var numberOfZone = req.body.numberOfZone.trim().toUpperCase(); //User defined line name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                areaMastersModel.findOne({"_id": areaId, "warehouseId": warehouseId, 'activeStatus': 1}, function (err, areaMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow == null) {

                        flowController.emit('ERROR', {message: "Zone missing! Details tampered/removed from system.", status: 'success', statusCode: '200'});
                    } else if (areaMasterRow != null) {

                        var previousNumberOfZoneAdd = parseInt(areaMasterRow.numberOfZone);

                        previousNumberOfZoneAdd += parseInt(numberOfZone);

                        areaMasterRow.numberOfZone = previousNumberOfZoneAdd;
                        areaMasterRow.timeModified = timeInInteger;
                        areaMasterRow.modifiedBy = modifiedBy;

                        areaMasterRow.save(function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Zone details updated into the system!", status: 'success', statusCode: '200'});
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