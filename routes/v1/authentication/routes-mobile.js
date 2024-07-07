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
// Validations
// Username should exist
// Password should match
// User must be licensed user
// User must be allowed to access that device/ or user has special access
// User should not be logged in to other device at the same time 
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//Mobile Login
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/user/authentication/login/user/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var username = req.body.username.trim().toUpperCase();

            var password = crypto.createHash('md5').update(req.body.password).digest("hex");

            var deviceId = req.body.deviceId.trim(); // Device on which user tries to login

            var swVersion = req.body.swVersion.trim(); // Arrive always with all api calls over mobile

            var battery = req.body.battery.trim(); // Arrive always with all api calls over mobile

            var imeiNumber = req.body.imeiNumber.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                technicalDetailsModel.find({'imeiNumber': imeiNumber, 'activeStatus': 1}, function (err, technicalDetailsRow) {
                    if (err) {

                        callback({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (technicalDetailsRow.length == 0) {

                        flowController.emit('ERROR', {message: 'This device is blocked or not registered in system! Contact administrator.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1.0');
                    }
                });
            });

            flowController.on('1.0', function () {

                usersModel.findOne({'username': username, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'User with username ' + username + ' not available/registered in system!', status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            if (userRow.password !== password) {

                                flowController.emit('ERROR', {message: 'Username/Password combination mismatched!', status: 'error', statusCode: '304'});
                            } else {

                                deviceMastersModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (deviceRow == null) {

                                        flowController.emit('ERROR', {message: 'Device not available/registered in system.', status: 'error', statusCode: '404'});
                                    } else {

                                        var data = {
                                            userId: userRow._id,
                                            deviceName: deviceRow.name,
                                            syncInterval: deviceRow.syncInterval,
                                            minPickListItem: deviceRow.minPickListItem,
                                            maxPickListItem: deviceRow.maxPickListItem,
                                            userMaterialHandlingUnit: ('materialHandlingUnitId' in userRow && userRow.materialHandlingUnitId != undefined) ? userRow.materialHandlingUnitId : [],
                                            deviceMaterialHandlingUnit: ('materialHandlingUnitId' in deviceRow && deviceRow.materialHandlingUnitId != undefined) ? deviceRow.materialHandlingUnitId : [],
                                            warehouseId: userRow.warehouseId,
                                            userTypeId: userRow.userTypeId,
                                            specialAccess: userRow.specialAccess
                                        };

                                        flowController.emit('1.1', data);
                                    }
                                });
                            }
                        }
                    }
                });
            });

            flowController.on('1.1', function (data) {

                var commonMHU = intersection(data.userMaterialHandlingUnit, data.deviceMaterialHandlingUnit);

                if (data.userMaterialHandlingUnit.length !== 0 && data.deviceMaterialHandlingUnit.length !== 0 && commonMHU.length == 0) {
                    flowController.emit('ERROR', {message: 'Material handling equipment(MHE) combination mismatched!', status: 'error', statusCode: '304'});

                } else {

                    flowController.emit('1', data);
                }

            });

            flowController.on('1', function (userInfo) {

                warehouseModel.findOne({'_id': userInfo.warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'Warehouse details not available in system! Contact customer-support.', status: 'error', statusCode: '404'});

                    } else {
                        if (warehouseRow != null) {

                            var clientId = warehouseRow.clientId;

                            companyMasterModel.findOne({'_id': clientId, 'activeStatus': 1}, function (err, companyMasterRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else if (companyMasterRow == null) {

                                    flowController.emit('ERROR', {message: 'Client details not available in system! Contact customer-support!', status: 'error', statusCode: '404'});
                                } else {
                                    if (companyMasterRow != null) {

                                        //var baseUrl = companyMasterRow.baseUrl;
                                        var userData = {
                                            userId: userInfo.userId,
                                            deviceName: userInfo.deviceName,
                                            syncInterval: userInfo.syncInterval,
                                            minPickListItem: userInfo.minPickListItem,
                                            maxPickListItem: userInfo.maxPickListItem,
                                            userMaterialHandlingUnit: userInfo.userMaterialHandlingUnit,
                                            deviceMaterialHandlingUnit: userInfo.deviceMaterialHandlingUnit,
                                            warehouseId: userInfo.warehouseId,
                                            userTypeId: userInfo.userTypeId,
                                            specialAccess: userInfo.specialAccess,
                                            baseUrl: companyMasterRow.baseUrl
                                        };
                                        flowController.emit('2', userData);
                                    }
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('2', function (userLogin) {

                usersModel.findOne({'_id': userLogin.userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else {

                        if (userRow.allocatedLicenseId == null || userRow.allocatedLicenseId === "") {
                            var dataObject = {
                                warehouseId: userLogin.warehouseId,
                                textName: "User tried out to login without license from this device : " + userLogin.deviceName,
                                module: "LOGIN",
                                name: username,
                                id: userLogin.userId
                            };
                            alertService.createAlert(dataObject);
                            flowController.emit('ERROR', {message: 'You are not a licensed user of the warehouse! Only Licensed users allowed to login.', status: 'error', statusCode: '304'});
                        } else {

                            deviceAllocationsModel.findOne({'deviceId': deviceId, 'userId': userLogin.userId, 'activeStatus': 1}, function (err, deviceAllocationsRow) {

                                if (err) {

                                    flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                                } else if (deviceAllocationsRow == null) {

                                    flowController.emit('ERROR', {message: 'You are not allowed to login into this device! Contact warehouse operator to enable access.', status: 'error', statusCode: '404'});
                                } else {

                                    var userData = {
                                        userId: userLogin.userId,
                                        deviceName: userLogin.deviceName,
                                        syncInterval: userLogin.syncInterval,
                                        minPickListItem: userLogin.minPickListItem,
                                        maxPickListItem: userLogin.maxPickListItem,
                                        userMaterialHandlingUnit: userLogin.userMaterialHandlingUnit,
                                        deviceMaterialHandlingUnit: userLogin.deviceMaterialHandlingUnit,
                                        employeeId: userRow.employeeId,
                                        firstName: userRow.firstName,
                                        lastName: userRow.lastName,
                                        avatar: userRow.avatar,
                                        warehouseId: userLogin.warehouseId,
                                        userTypeId: userLogin.userTypeId,
                                        specialAccess: userLogin.specialAccess,
                                        baseUrl: userLogin.baseUrl
                                    };
                                    flowController.emit('3', userData);
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('3', function (userDevice) {

                userArray = [];

                userTypesModel.findOne({'_id': userDevice.userTypeId}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'User type details not available in syatem.', status: 'error', statusCode: '304'});
                    } else {

                        if (userTypeRow != null) {

                            var userTypeName = userTypeRow.name;

                            if (userTypeName !== 'OPERATOR') {

                                flowController.emit('ERROR', {message: 'Only warehouse operators allowed to login to device!', status: 'error', statusCode: '304'});
                            } else {

                                date = moment(new Date()).format('DD/MM/YY');

                                deviceTrackingModel.findOne({'userId': userDevice.userId, 'date': date, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (deviceTrackingRow == null) { // Operator is a first time user for that device

                                        var newDeviceTracking = new deviceTrackingModel();

                                        newDeviceTracking.timestamp = timeInInteger;
                                        newDeviceTracking.timeCreated = timeInInteger;
                                        newDeviceTracking.date = moment(new Date()).format('DD/MM/YY');
                                        newDeviceTracking.deviceId = deviceId;
                                        newDeviceTracking.userId = userDevice.userId;
                                        newDeviceTracking.status = 'LOGIN';
                                        newDeviceTracking.swVersion = swVersion;
                                        newDeviceTracking.battery = battery;

                                        newDeviceTracking.save(function (err) {

                                            if (err) {

                                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var commonMaterialHandlingUnit = [];

                                                if (userDevice.deviceMaterialHandlingUnit.length === 0 && userDevice.userMaterialHandlingUnit.length === 0) {

                                                    commonMaterialHandlingUnit = [];
                                                } else if (userDevice.deviceMaterialHandlingUnit.length === 0) {

                                                    commonMaterialHandlingUnit = userDevice.userMaterialHandlingUnit;
                                                } else if (userDevice.userMaterialHandlingUnit.length === 0) {

                                                    commonMaterialHandlingUnit = userDevice.deviceMaterialHandlingUnit;
                                                } else {

                                                    commonMaterialHandlingUnit = intersection(userDevice.userMaterialHandlingUnit, userDevice.deviceMaterialHandlingUnit);
                                                }

                                                var object = {
                                                    userId: userDevice.userId,
                                                    deviceName: userDevice.deviceName,
                                                    syncInterval: userDevice.syncInterval,
                                                    minPickListItem: userDevice.minPickListItem,
                                                    maxPickListItem: userDevice.maxPickListItem,
                                                    commonMaterialHandlingUnit: commonMaterialHandlingUnit,
                                                    userMaterialHandlingUnit: userDevice.userMaterialHandlingUnit,
                                                    deviceMaterialHandlingUnit: userDevice.deviceMaterialHandlingUnit,
                                                    employeeId: userDevice.employeeId,
                                                    specialAccess: userDevice.specialAccess,
                                                    firstName: userDevice.firstName,
                                                    lastName: userDevice.lastName,
                                                    baseUrl: userDevice.baseUrl,
                                                    avatar: userDevice.avatar
                                                };

                                                userArray.push(object);

                                                fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGIN' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                                    if (err) {

                                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        flowController.emit('END', {message: 'Login successful! Welcome.', data: userArray, status: 'success', statusCode: '201'});
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        if (deviceTrackingRow != null) {

                                            var status = deviceTrackingRow.status; // Status of the latest record of that day

                                            if (status == 'ONLINE' || status == 'LOGIN') { // User logged in to another device not allowed to login on multiple device

                                                flowController.emit('ERROR', {message: 'User is already logged-in to another device!', 'forcefullyStatus': 'true', status: 'error', statusCode: '301'});

                                            } else {

                                                var newDeviceTracking = new deviceTrackingModel();

                                                newDeviceTracking.timestamp = timeInInteger;
                                                newDeviceTracking.timeCreated = timeInInteger;
                                                newDeviceTracking.date = moment(new Date()).format('DD/MM/YY');
                                                newDeviceTracking.deviceId = deviceId;
                                                newDeviceTracking.userId = userDevice.userId;
                                                newDeviceTracking.status = 'LOGIN';
                                                newDeviceTracking.swVersion = swVersion;
                                                newDeviceTracking.battery = battery;

                                                newDeviceTracking.save(function (err) {

                                                    if (err) {

                                                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        var commonMaterialHandlingUnit = [];

                                                        if (userDevice.deviceMaterialHandlingUnit.length === 0 && userDevice.userMaterialHandlingUnit.length === 0) {

                                                            commonMaterialHandlingUnit = [];
                                                        } else if (userDevice.deviceMaterialHandlingUnit.length === 0) {

                                                            commonMaterialHandlingUnit = userDevice.userMaterialHandlingUnit;
                                                        } else if (userDevice.userMaterialHandlingUnit.length === 0) {

                                                            commonMaterialHandlingUnit = userDevice.deviceMaterialHandlingUnit;
                                                        } else {

                                                            commonMaterialHandlingUnit = intersection(userDevice.userMaterialHandlingUnit, userDevice.deviceMaterialHandlingUnit);
                                                        }

                                                        var object = {
                                                            userId: userDevice.userId,
                                                            deviceName: userDevice.deviceName,
                                                            syncInterval: userDevice.syncInterval,
                                                            minPickListItem: userDevice.minPickListItem,
                                                            maxPickListItem: userDevice.maxPickListItem,
                                                            commonMaterialHandlingUnit: commonMaterialHandlingUnit,
                                                            userMaterialHandlingUnit: userDevice.userMaterialHandlingUnit,
                                                            deviceMaterialHandlingUnit: userDevice.deviceMaterialHandlingUnit,
                                                            employeeId: userDevice.employeeId,
                                                            specialAccess: userDevice.specialAccess,
                                                            firstName: userDevice.firstName,
                                                            lastName: userDevice.lastName,
                                                            baseUrl: userDevice.baseUrl,
                                                            avatar: userDevice.avatar
                                                        };
                                                        userArray.push(object);

                                                        fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGIN' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                                            if (err) {

                                                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                                            } else {

                                                                flowController.emit('END', {message: 'Login successful! Welcome.', data: userArray, status: 'success', statusCode: '201'});
                                                            }
                                                        });
                                                    }
                                                }); // Tracking save
                                            }
                                        }
                                    }
                                }); // check for online records
                            }
                        }
                    }
                });
            });
            // End
            flowController.on('END', function (result) {

                res.json(result);
            });
            // Error
            flowController.on('ERROR', function (error) {

                console.log(error);
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // Start
            flowController.emit('START');
        });
//
//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//Mobile Logout API
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/user/authentication/logout/user/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var date = moment(new Date()).format('DD/MM/YY');

            var loggedOutTime = timeInInteger;

            var userId = req.body.userId.trim();

            var deviceId = req.body.deviceId.trim();

            var swVersion = req.body.swVersion.trim();

            var battery = req.body.battery.trim();

            var idleTime = req.body.idleTime.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User details not available in system.', status: 'success', statusCode: '301'});
                    } else {

                        if (userRow != null) {
                            var username = userRow.username;

                            var newDeviceTracking = new deviceTrackingModel();

                            newDeviceTracking.timestamp = timeInInteger;
                            newDeviceTracking.timeCreated = timeInInteger;
                            newDeviceTracking.date = date;
                            newDeviceTracking.deviceId = deviceId;
                            newDeviceTracking.userId = userId;
                            newDeviceTracking.status = 'LOGOUT';
                            newDeviceTracking.swVersion = swVersion;
                            newDeviceTracking.battery = battery;

                            newDeviceTracking.save(function (err) {

                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    usersModel.update({'_id': userId}, {'$set': {'lastSeen': timeInInteger}}, function (err, userRow) {
                                        if (err) {

                                            flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('2', username);
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('2', function (username) {

                var loggedInTimeArray = [];
                var dummyObject = [];

                deviceTrackingModel.find({'userId': userId, 'deviceId': deviceId, 'status': 'LOGIN', 'activeStatus': 1}, function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (devicesTrackingRow.length == 0) {

                        flowController.emit('error', {message: "Tracking details of this device not available in system.", status: 'error', statusCode: '500'});

                    } else {
                        if (devicesTrackingRow.length != 0) {

                            async.eachSeries(devicesTrackingRow, function (element, callback) {

                                loggedInTimeArray.push(element.timestamp);

                                setImmediate(callback);

                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {
                                    loggedInTimeArray.sort();
                                    loggedInTimeArray.reverse();

                                    flowController.emit('end', loggedInTimeArray[0], username);
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('end', function (loggedInTimeLatest, username) {

                hoursTrackingModel.findOne({'userId': userId, 'date': date, 'activeStatus': 1}, function (err, hoursTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (hoursTrackingRow == null) {

                        var hoursTracking = new hoursTrackingModel();

                        hoursTracking.warehouseId = warehouseId;
                        hoursTracking.date = date;
                        hoursTracking.userId = userId;
                        hoursTracking.activeTime = loggedOutTime - loggedInTimeLatest;
                        hoursTracking.idleTime = idleTime;
                        hoursTracking.timeCreated = timeInInteger;

                        hoursTracking.save(function (err) {
                            if (err) {

                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGOUT' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        res.json({message: 'You are logged out!', status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        });

                    } else {
                        if (hoursTrackingRow != null) {

                            var activeTime = loggedOutTime - loggedInTimeLatest;

                            hoursTrackingModel.update({'userId': userId, 'date': date}, {'$inc': {'activeTime': activeTime, 'idleTime': idleTime}, 'timeCreated': timeInInteger}, function (err, hoursTrackingModelRow) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGOUT' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                        if (err) {

                                            res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            res.json({message: 'You are logged out!', status: 'success', statusCode: '200'});
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
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
//Emergency-Exit for mobile
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/user/authentication/emergency-exit/user/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var date = moment(new Date()).format('DD/MM/YY'); //58f89ffd2f2dab5efcc56045

            var deviceId = req.body.deviceId.trim();

            var userName = req.body.userName.trim().toUpperCase();

            var idleTime = req.body.idleTime;

            var warehouseId = req.body.warehouseId.trim();

            var loggedOutTime = timeInInteger;

            var userId = '';

            var username = userName;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                usersModel.findOne({'username': userName, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (userRow == null) {

                        flowController.emit('error', {message: "User details not available in system", status: 'error', statusCode: '404'});
                    } else {

                        userId = userRow._id;
                        flowController.emit('1', userId);
                    }
                });
            });

            flowController.on('1', function (userId) {

                var timestampArray = [];
                var dummyObject = []; //({'userId': userId, 'deviceId': deviceId, 'status': 'LOGIN', 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, devicesTrackingRow)

                deviceTrackingModel.find({'userId': userId, 'deviceId': deviceId, 'date': date, 'activeStatus': 1}, function (err, devicesTrackingRow) {

                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (devicesTrackingRow.length == 0) {

                        flowController.emit('error', {message: "Tracking details of this device not available in system.", status: 'error', statusCode: '404'});

                    } else {
                        if (devicesTrackingRow.length != 0) {

                            async.eachSeries(devicesTrackingRow, function (element, callback) {

                                timestampArray.push(element.timestamp);

                                setImmediate(callback);

                            }, function (err) {

                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    timestampArray.sort();
                                    timestampArray.reverse();

                                    flowController.emit('1.1', timestampArray[0]);
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('1.1', function (timestampLatest) {// qty: { $in: [ 5, 15 ] }

                deviceTrackingModel.findOne({'userId': userId, 'deviceId': deviceId, 'status': {$in: ['LOGIN', 'ONLINE']}, 'timestamp': timestampLatest, 'activeStatus': 1}, function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (devicesTrackingRow == null) {

                        flowController.emit('error', {message: "Tracking details of this device not available in system.", status: 'error', statusCode: '404'});

                    } else {
                        if (devicesTrackingRow != null) {

                            deviceTrackingModel.update({'timestamp': timestampLatest}, {'$set': {'status': 'LOGOUT'}}, function (err) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('2', timestampLatest);
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('2', function (logoutDone) {

                var loggedInTimeArray = [];
                var dummyObject = [];

                deviceTrackingModel.find({'userId': userId, 'deviceId': deviceId, 'timestamp': logoutDone, 'activeStatus': 1}, function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (devicesTrackingRow.length == 0) {

                        flowController.emit('error', {message: "Tracking details of this device not available in system.", status: 'error', statusCode: '404'});
                    } else {
                        if (devicesTrackingRow.length != 0) {

                            devicesTrackingRow.forEach(function (element) {

                                var loggedInTime = element.timestamp;

                                dummyObject.push({process: 'done'});

                                loggedInTimeArray.push(loggedInTime);

                                if (loggedInTimeArray.length == devicesTrackingRow.length) {

                                    loggedInTimeArray.reverse();

                                    flowController.emit('end', loggedInTimeArray[0]);
                                }
                            });
                        }
                    }
                });
            });

            flowController.on('end', function (loggedInTimeLatest) {

                hoursTrackingModel.findOne({'userId': userId, 'date': date, 'activeStatus': 1}, function (err, hoursTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (hoursTrackingRow == null) {

                        var hoursTracking = new hoursTrackingModel();

                        hoursTracking.warehouseId = warehouseId;
                        hoursTracking.date = date;
                        hoursTracking.userId = userId;
                        hoursTracking.activeTime = loggedOutTime - loggedInTimeLatest;
                        hoursTracking.idleTime = idleTime;

                        hoursTracking.save(function (err) {
                            if (err) {

                                flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGOUT' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else {

                                        res.json({message: 'You are logged out!', status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        });

                    } else {
                        if (hoursTrackingRow != null) {

                            var activeTime = loggedOutTime - loggedInTimeLatest;

                            hoursTrackingModel.update({'userId': userId, "date": date}, {'$inc': {'activeTime': activeTime, 'idleTime': idleTime}}, function (err, hoursTrackingModelRow) {
                                if (err) {

                                    flowController.emit('error', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    fs.appendFile(pathAuth, '\n' + 'MOBILE' + ',' + 'LOGOUT' + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                        if (err) {

                                            res.json({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                        } else {

                                            res.json({message: 'You are logged out!', status: 'success', statusCode: '200'});
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
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
//forcefullylogout 
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/user/authentication/forcefully-logout/user/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var username = req.body.username.toUpperCase().trim();

            var flowController = new EventEmitter();


            flowController.on('START', function () {

                usersModel.findOne({'username': username, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'User with this username does not present in system!', status: 'error', statusCode: '404'});

                    } else {

                        var userId = userRow._id;
                        flowController.emit('1', userId);
                    }
                });
            });

            flowController.on('1', function (userId) {

                deviceTrackingModel.findOne({'userId': userId, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (deviceTrackingRow == null) {

                        flowController.emit('ERROR', {message: "Tracking details of this device not available in system", status: 'error', statusCode: '404'});
                    } else {

                        var newDeviceTracking = new deviceTrackingModel();

                        newDeviceTracking.timestamp = timeInInteger;
                        newDeviceTracking.timeCreated = timeInInteger;
                        newDeviceTracking.date = date;
                        newDeviceTracking.deviceId = deviceTrackingRow.deviceId;
                        newDeviceTracking.userId = userId;
                        newDeviceTracking.status = 'LOGOUT';
                        newDeviceTracking.swVersion = deviceTrackingRow.swVersion;
                        newDeviceTracking.battery = deviceTrackingRow.battery;

                        newDeviceTracking.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Device tracking details added into system.", status: 'success', statusCode: '200'});
                            }
                        });
                    }
                });
            });
            // End
            flowController.on('END', function (result) {

                res.json(result);
            });
            // Error
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // Start
            flowController.emit('START');
        });
//       
//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
//check-android-logout 
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/user/authentication/check-android-logout/user/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var userId = req.body.userId.trim();
            var deviceId = req.body.deviceId.trim();

            var flowController = new EventEmitter();


            flowController.on('START', function () {

                deviceTrackingModel.find({'userId': userId, 'deviceId': deviceId, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});

                    } else if (deviceTrackingRow.length == 0) {

                        flowController.emit('ERROR', {message: "Tracking details of device not available in system!", status: 'error', statusCode: '404'});
                    } else {

                        if (deviceTrackingRow[0].status == "LOGOUT") {

                            flowController.emit('END', {message: "This device is currently logged out!", 'androidLogout': 'true', status: 'error', statusCode: '404'});
                        } else {

                            flowController.emit('END', {message: "This device is currently LoggedIn/Online!", 'androidLogout': 'false', status: 'error', statusCode: '404'});
                        }
                    }
                });
            });
            // End
            flowController.on('END', function (result) {

                res.json(result);
            });
            // Error
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // Start
            flowController.emit('START');
        });
//       
//
module.exports = router;