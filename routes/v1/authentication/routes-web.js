var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var crypto = require('crypto'); //md5 encryption
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var Promises = require('promise');
var intersection = require('array-intersection');
var async = require('async');
//----------------------------------------------------------------------------------------------------------------------------
var pathAuth = './logs/dailyLog/loginLogs/log.txt';
//----------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------------------------
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var deviceAllocationsModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var userTypesModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var warehouseModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var companyMasterModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client.js');
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var alertService = require('../../../service-factory/alertService');
var technicalDetailsModel = require('../../../models/mongodb/deviceMaster-technicalDetails/collection-technicalDetails.js');
var authTokenModel = require('../../../models/mongodb/userMaster-authToken/collection-authToken.js');
//----------------------------------------------------------------------------------------------------------------------------
var authTokenService = require('../../../service-factory/authTokenService');
// Validations
// Username should exist
// Password should match
// User must be licensed user
// User must be allowed to access that device/ or user has special access
// User should not be logged in to other device at the same time 
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//Login Web
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/authentication/login/user/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var username = req.body.username.toUpperCase();

            var password = crypto.createHash('md5').update(req.body.password).digest("hex");

            var userArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                usersModel.findOne({'username': username, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'No user with this username exist or you may have access blocked! contact warehouse administrator', status: 'error', statusCode: '404'});
                    } else {

                        if (userRow.password !== password) {

                            flowController.emit('error', {message: 'Username/Password combination mismatched!', status: 'error', statusCode: '304'});
                        } else {

                            flowController.emit('1', userRow);
                        }
                    }
                });
            });
            //
            //
            flowController.on('1', function (userRow) {

                var userId = userRow._id;
                var userTypeId = userRow.userTypeId;
                var warehouseId = userRow.warehouseId;

                userTypesModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {

                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('error', {message: 'Users type details not available in system.', status: 'error', statusCode: '304'});
                    } else {

                        if (userTypeRow != null) {

                            var userTypeName = userTypeRow.name;

                            if (userTypeName === 'OPERATOR') {

                                var dataObject = {
                                    warehouseId: warehouseId,
                                    textName: "Operator tried out to login",
                                    module: "LOGIN",
                                    name: username,
                                    id: userId
                                };
                                alertService.createAlert(dataObject);

                                flowController.emit('error', {message: 'You are not allowed to access web portal! Contact warehouse administrator for more details', status: 'error', statusCode: '403'});
                            } else {

                                flowController.emit('2', userRow, userTypeRow);
                            }
                        }
                    }
                });
            });
            //
            //
            flowController.on('2', function (userRow, userTypeRow) {

                var warehouseId = userRow.warehouseId;
                var userId = userRow._id;

                warehouseModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('error', {message: "No warehouse configured into the system!", status: 'error', statusCode: '404'});
                    } else {

                        clientsModel.findOne({_id: warehouseRow.clientId, activeStatus: 1}, function (err, clientRow) {
                            if (err) {

                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else if (clientRow == null) {

                                flowController.emit('error', {message: 'Client details not available in system.', status: 'error', statusCode: '404'});
                            } else {

                                var temp = {
                                    warehouseId: warehouseRow._id,
                                    clientId: warehouseRow.clientId,
                                    baseUrl: clientRow.baseUrl,
                                    userId: userRow._id,
                                    employeeId: userRow.employeeId,
                                    userImage: userRow.avatar,
                                    firstName: userRow.firstName,
                                    lastName: userRow.lastName,
                                    userTypeId: userRow.userTypeId,
                                    userTypeName: userTypeRow.name,
                                    clientName: clientRow.name,
                                    clientImage: clientRow.logo,
                                    clientUserName: userRow.username
                                };
                                userArray.push(temp);

                                flowController.emit('3', userId, warehouseId, userArray);
                            }
                        });
                    }
                });
            });
            //
            flowController.on('3', function (userId, warehouseId, userArray) {

                authTokenModel.findOne({userId: userId, activeStatus: 1}, function (err, authRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (authRow == null) {
                        //next
                        flowController.emit('TOKEN', userId, warehouseId, userArray);
                    } else {

                        flowController.emit('error', {message: "User is already logged-in to another device! ", status: 'error', statusCode: '404'});
                    }
                });
            });
            //
            flowController.on('TOKEN', function (userId, warehouseId, userArray) {

                var dataObject = {
                    username: username,
                    _id: userId
                };

                authTokenService.loginToken(dataObject, function (err, response) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        var authToken = new authTokenModel();

                        authToken.warehouseId = warehouseId;
                        authToken.userId = userId;
                        authToken.authToken = response.token;
                        authToken.privateKey = response.randomstringToken;
                        authToken.timeModified = new Date();
                        authToken.activeStatus = 1;

                        authToken.save(function (err) {

                            if (err) {
                                // error while adding records
                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOG');
                                flowController.emit('end', {message: 'Login successful! Welcome.', data: userArray, status: 'success', statusCode: '200', token: response.token});
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('LOG', function () {

                fs.appendFile(pathAuth, '\n' + 'WEB' + ',' + 'LOGIN' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                    if (err) {

                        console.log({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        //  logger.error(err, {errorMetadata: "WEB User Login", UserName: username});
                    } else {

                        console.log("logs");
                    }
                });
            });
            //end
            flowController.on('end', function (result) {

                res.json(result);
            });
            //
            flowController.on('error', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//web logout
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/authentication/logout/user/')

        .put(function (req, res) {

            var userId = req.body.userId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User details not available in system.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1');
                    }
                });
            });
            //
            //
            flowController.on('1', function () {

                usersModel.update({'_id': userId}, {'$set': {'lastSeen': timeInInteger}}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', userRow);
                    }
                });
            });
            //
            //
            flowController.on('2', function (userRow) {

                authTokenModel.findOne({'userId': userId, activeStatus: 1}, function (err, authRow) {
                    if (err) {

                        flowController.emit('error', err);
                    } else if (authRow == null) {

                        flowController.emit('error', {message: "Session expired! Try login again.", status: 'error', statusCode: '403'});
                    } else {

                        authTokenModel.update({'userId': userId, activeStatus: 1}, {'$set': {'activeStatus': 2}}, function (err, authRow) {
                            if (err) {

                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {
                                //authToken
                                flowController.emit('LOG', userRow);
                                flowController.emit('end', {message: 'You are logged out!', status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            //
            flowController.on('LOG', function (userRow) {

                fs.appendFile(pathAuth, '\n' + 'WEB' + ',' + 'LOGOUT' + ',' + userRow.username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                    if (err) {

                        console.log({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        console.log("logs");
                    }
                });
            });
            //end
            flowController.on('end', function (result) {

                res.json(result);
            });

            flowController.on('error', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//Change password
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/authentication/password-change/user/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userId = req.body.userId.trim();

            var password = crypto.createHash('md5').update(req.body.password).digest("hex");

            var modifiedBy = req.body.modifiedBy.trim();
            //logger logs
            logger.debug('Device password-change:', req.body, 'requested User Id: ', userId);
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var promise_user = new Promises(function (resolve, reject) {

                    usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, usersModelRow) {
                        if (err) {

                            flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (usersModelRow == null) {

                            flowController.emit('error', {message: 'User details not available in system.', status: 'success', statusCode: '301'});
                        } else {
                            if (usersModelRow != null) {

                                var userTypeId = usersModelRow.userTypeId;
                                resolve(userTypeId);

                            }
                        }
                    });
                });

                promise_user.then(function (respond) {

                    userTypesModel.findOne({'_id': respond, 'activeStatus': 1}, function (err, userTypesModelRow) {
                        if (err) {

                            flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (userTypesModelRow == null) {

                            flowController.emit('error', {message: 'User type details not available in system.', status: 'success', statusCode: '404'});
                        } else {
                            if (userTypesModelRow != null) {

                                var name = userTypesModelRow.name;

                                var userTypeId = userTypesModelRow._id;

                                switch (name) {
                                    case 'AVANCER':
                                        flowController.emit('2', userId);
                                        break;

                                    case 'SUPERADMIN':
                                        flowController.emit('3', userId);
                                        break;

                                    case 'ADMIN':
                                        flowController.emit('4', userId);
                                        break;

                                    default:
                                        flowController.emit('error', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                                        logger.warn("Device password-change", {warningMetadata: "User Type Id removed from system unexpectedly!!", userId: userId});
                                }
                            }
                        }
                    });
                });
            });

            flowController.on('2', function (userId) {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User details not available in system!', status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            usersModel.update({'_id': userId}, {'$set': {'password': password, 'modifiedBy': modifiedBy}}, function (err, userRow) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('end', {message: 'Password changed!', status: 'success', statusCode: '200'});
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('3', function (userTypeId) {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User details not available in system', status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            var userTypeId = userRow.userTypeId;

                            userTypesModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypesModelRow) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (userTypesModelRow == null) {

                                    flowController.emit('error', {message: 'User type details not available in system!', status: 'error', statusCode: '404'});
                                } else {

                                    var name = userTypesModelRow.name;

                                    if (name == 'AVANCER') {

                                        flowController.emit('error', {message: 'Not Authorised!!', status: 'error', statusCode: '301'});
                                    } else {

                                        usersModel.update({'_id': userId}, {'$set': {'password': password, 'modifiedBy': modifiedBy}}, function (err, userRow) {
                                            if (err) {

                                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('end', {message: 'Password changed!', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });

                //                                flowController.emit('end', null);
            });

            flowController.on('4', function (userId) {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User details not available in system!', status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            var userTypeId = userRow.userTypeId;

                            userTypesModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypesModelRow) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (userTypesModelRow == null) {

                                    flowController.emit('error', {message: 'User type details not available in system!', status: 'error', statusCode: '404'});
                                } else {

                                    var name = userTypesModelRow.name;

                                    if (name == 'AVANCER' || name == 'SUPERADMIN') {

                                        flowController.emit('error', {message: 'Not Authorised!!', status: 'error', statusCode: '301'});
                                    } else {

                                        usersModel.update({'_id': userId}, {'$set': {'password': password, 'modifiedBy': modifiedBy}}, function (err, userRow) {
                                            if (err) {

                                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('end', {message: 'Password changed!', status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('end', function (result) {

                res.json(result);
            });

            flowController.on('error', function (errorData) {

                res.json(errorData);
                logger.error(errorData.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
module.exports = router;