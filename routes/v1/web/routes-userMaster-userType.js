var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var userTypesModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var logger = require('../../../logger/logger.js');
var userCategorysModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get all user types
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/userType/:warehouseId/')

        .get(function (req, res, next) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                userTypesModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userTypesRow) {

                    var userTypesArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypesRow.length == 0) {

                        flowController.emit('ERROR', {message: "No user-types configured in the system yet!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userTypesRow, function (element, callback) {

                            if (element.name != 'AVANCER') {// It will omit the AVANCER & send rest of all

                                var itemCategory = {id: element._id, name: element.name};

                                userTypesArray.push(itemCategory);
                            }
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: userTypesArray, status: 'success', statusCode: '200'});
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
// Create user types (Internal use only)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/userType/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var userTypeArray = ['AVANCER', 'SUPERADMIN', 'ADMIN', 'OPERATOR'];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var promise_createUserType = new Promises(function (resolve, reject) {

                    async.eachSeries(userTypeArray, function (element, callback) {

                        var newUserType = new userTypesModel();

                        newUserType.warehouseId = warehouseId;
                        newUserType.name = element;
                        newUserType.timeCreated = timeInInteger;

                        userTypesModel.findOne({"name": element}, function (err, userTypesRow) {

                            if (err) {

                                reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userTypesRow != null) {

                                resolve({message: 'Default user types are already configured!', status: 'error', statusCode: '304'});
                            } else {

                                newUserType.save(function (err, returnData) {
                                    if (err) {

                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        var userTypeId = returnData._id;

                                        var newUserCategory = userCategorysModel();

                                        newUserCategory.warehouseId = warehouseId;
                                        newUserCategory.userTypeId = userTypeId;
                                        newUserCategory.name = element;
                                        newUserCategory.typeName = 'FIXED';
                                        newUserCategory.enable = (element == 'AVANCER') ? 'NO' : 'YES';
                                        newUserCategory.createdBy = 'AVANCER';//  Created by AVANCER when this record is auto configured
                                        newUserCategory.timeCreated = timeInInteger;

                                        newUserCategory.save(function (err, returnData) {
                                            if (err) {

                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                setImmediate(callback);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }, function (err) {

                        if (err) {

                            reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            resolve({message: 'User Types configured into system!', status: 'success', statusCode: '201'});
                        }
                    });
                });

                promise_createUserType.then(function (response) { // After promise completes, if promise resolved (RESOLVED PART)

                    flowController.emit('END',response);
                }, function (reason) {// After promise completes, if promise rejected (REJECTED PART)

                    flowController.emit('ERROR',reason);
                }).catch(function (exption) {
                    /* error :( */
                    flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + exption, status: 'error', statusCode: '500'});
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