var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var MagicIncrement = require('magic-increment');
var requestify = require('requestify');
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var sideMasterModel = require('../../../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get all levels under specific line
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/level/:lineId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var lineId = req.params.lineId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var levelMastersArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                levelMastersModel.find({'lineId': lineId, 'activeStatus': 1}, function (err, lineMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR ", status: 'error', statusCode: '500'});
                    } else if (lineMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "No level configured under this line!", status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(lineMasterRow, function (element, callback) {

                            var level = {id: element._id, name: element.level, numberOfSide: element.numberOfSide};

                            levelMastersArray.push(level);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: levelMastersArray, status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-LEVEL',
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
// Get new levels under line
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readOne/level/:levelId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var levelId = req.params.levelId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                levelMastersModel.findOne({'_id': levelId, 'activeStatus': 1}, function (err, levelMasterRow) {
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelMasterRow == null) {

                        flowController.emit('ERROR', {message: "No level configured into the system!", status: 'error', statusCode: '404'});
                    } else {

                        sideMasterModel.findOne({"levelId": levelId, 'activeStatus': 1}, function (err, sideMastersRow) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (sideMastersRow == null) {

                                flowController.emit('ERROR', {message: 'The locations for this level already configured! Can\'t reconfigure again.', status: 'error', statusCode: '304'});
                            } else {

                                var levelMastersArray = [];

                                levelMastersArray.push({id: levelMasterRow._id, name: levelMasterRow.level, numberOfLevel: sideMastersRow.numberOfLocation});
                                flowController.emit('END', {data: levelMastersArray, message: "Operation Successful.", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-LEVEL',
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
// Add levels under line with sides
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/level/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var lineId = req.body.lineId.trim();

            var levelName = req.body.levelName.trim().toUpperCase(); //User defined area name

            var numberOfSide = req.body.numberOfSide.trim();

            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                //numberOfArea
                lineMastersModel.findOne({'_id': lineId, 'activeStatus': 1}, function (err, lineMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        numberOfLevel = lineMasterRow.numberOfLevel;
                        flowController.emit('1', numberOfLevel);
                    }
                });
            });

            flowController.on('1', function (numberOfLevel) {

                levelMastersModel.count({"lineId": lineId, 'activeStatus': 1}, function (err, numberOfLevelCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (numberOfLevelCount === parseInt(numberOfLevel)) {

                        flowController.emit('ERROR', {message: 'LINE REQUIRED LEVEL AND CREATE LEVEL COMPLETED!!!', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('2');
                    }
                });
            });

            flowController.on('2', function () {

                levelMastersModel.find({'lineId': lineId, 'level': levelName, 'activeStatus': 1}, function (err, levelMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelMasterRow.length != 0) {

                        flowController.emit('ERROR', {message: "This level name already in use! Provide different name.", status: 'success', statusCode: '304'});
                    } else {

                        flowController.emit('3');
                    }
                });
            });

            flowController.on('3', function () {

                lineMastersModel.findOne({'_id': lineId}, function (err, lineMasterRow) {

                    lineCodeString = lineMasterRow.lineCodeString;

                    levelMastersModel.find({"lineId": lineId, 'activeStatus': 1}).sort({'levelCode': -1}).exec(function (err, levelMasterRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else { // Multiple areas present, need to insert with incrementing current present areaCode

                            var levelCode = (levelMasterRow.length != 0) ? MagicIncrement.inc(levelMasterRow[0].levelCode) : 'AA';

                            flowController.emit('4', levelCode, lineCodeString);
                        }
                    });
                });
            });

            flowController.on('4', function (levelCode, lineCodeString) {

                var newLevelMaster = new levelMastersModel();
                newLevelMaster.lineId = lineId;
                newLevelMaster.level = levelName;
                newLevelMaster.numberOfSide = numberOfSide;
                newLevelMaster.levelCode = levelCode;
                newLevelMaster.levelCodeString = lineCodeString + levelCode;
                newLevelMaster.createdBy = createdBy;
                newLevelMaster.timeCreated = timeInInteger;

                newLevelMaster.save(function (err, insertedRecordDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var levelId = insertedRecordDetails._id;
                        flowController.emit('5', levelId);
                    }
                });
            });

            flowController.on('5', function (levelId) {

                var baseUrl = req.body.baseUrl;

                var requestifyUrl = baseUrl + '/v1/locationMaster/web/location/configuration/create/side/';

                requestify.post(requestifyUrl, {levelId: levelId, numberOfLocation: numberOfSide, createdBy: createdBy}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {
                        flowController.emit('END', {message: "New level added into the system!", status: 'success', statusCode: '201'});
                    }

                    if (result.status === 'error') {
                        flowController.emit('ERROR', {message: result.message, status: result.status, statusCode: result.statusCode});
                    }
                });
            });

            flowController.on('END', function (result) {

                res.json(result);
            });
            //
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'lOCATION-MASTER-LEVEL-ADD',
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
// Update Level details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/level/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var lineId = req.body.lineId.trim();

            var levelId = req.body.levelId.trim();

            var newLevelName = req.body.newLevelName.trim().toUpperCase(); //User defined line name

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                levelMastersModel.find({'lineId': lineId, 'level': newLevelName, 'activeStatus': 1}, function (err, levelMastersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This level name already in use! Provide different name.', status: 'success', statusCode: '200'});
                    } else {

                        levelMastersModel.findOne({'_id': levelId, 'lineId': lineId, 'activeStatus': 1}, function (err, levelMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (levelMasterRow == null) {

                                flowController.emit('ERROR', {message: "level missing! Details tampered/removed from system.", status: 'success', statusCode: '200'});
                            } else {
                                if (levelMasterRow != null) {

                                    levelMasterRow.level = newLevelName;
                                    levelMasterRow.timeModified = timeInInteger;
                                    levelMasterRow.modifiedBy = modifiedBy;

                                    levelMasterRow.save(function (err) {

                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('END', {message: "Level details updated into the system!", status: 'success', statusCode: '200'});
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'UPDATE-LEVEL',
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
module.exports = router;