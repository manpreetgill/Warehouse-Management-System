var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var crypto = require('crypto');//md5 encryption
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var fs = require('fs');
//---------------------------------------------------------------------------------------------------------------------------
var pathuserMaster = './logs/dailyLog/userMasterLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userCategorysModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');
var userTypeModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var deviceAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAllocation/collection-deviceAllocation.js');
var licenseManagerModel = require('../../../models/mongodb/userMaster-licenseManager/collection-licenseManager.js');

//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get single user details 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/user/:warehouseId/:userId/')

        .get(function (req, res) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userId = req.params.userId.trim(); // MongoId of the warehouse

            var userMasterArr = [];
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                usersModel.findOne({'_id': userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userDataRow) {
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userDataRow == null) {

                        flowController.emit('ERROR', {message: "Userdata tampered/removed from system!", status: 'error', statusCode: '404', data: []});
                    } else {

                        async.waterfall([

                            function (waterfallcallback) {
                                if (userDataRow.allocatedLicenseId) {

                                    licenseManagerModel.findOne({'_id': userDataRow.allocatedLicenseId, 'activeStatus': 1}, function (err, licenseRow) {
                                        if (err) {

                                            waterfallcallback(null, {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                                        } else if (licenseRow == null) {

                                            waterfallcallback(null, '');
                                        } else {

                                            var licenseName = (licenseRow.name) ? licenseRow.name : '';
                                            waterfallcallback(null, licenseName);
                                        }
                                    });
                                } else {
                                    waterfallcallback(null, '');
                                }
                            },
                            function (licenseName, waterfallcallback) {
                                var deviceArr = [];
                                deviceAllocationModel.find({'userId': userId, 'activeStatus': 1}, function (err, deviceAllocationRow) {
                                    if (err) {

                                        waterfallcallback(null, {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                                    } else if (deviceAllocationRow.length == 0) {

                                        waterfallcallback(null, licenseName, '');
                                    } else {

                                        async.eachSeries(deviceAllocationRow, function (element, callback) {
                                            //deviceId
                                            deviceArr.push(element.deviceId);
                                            setImmediate(callback);
                                        }, function (err) {

                                            if (err) {

                                                waterfallcallback(err);
                                            } else {

                                                waterfallcallback(null, licenseName, deviceArr);
                                            }
                                        });
                                    }
                                });
                            },
                            function (licenseName, deviceArr, waterfallcallback) {

                                var data = {
                                    deviceId: deviceArr,
                                    userId: userId,
                                    firstName: userDataRow.firstName,
                                    employeeId: userDataRow.employeeId,
                                    avatar: userDataRow.avatar,
                                    allocatedLicenseId: userDataRow.allocatedLicenseId,
                                    totalWorkingHours: userDataRow.totalWorkingHours,
                                    licenseName: licenseName
                                };
                                userMasterArr.push(data);
                                waterfallcallback(null, userMasterArr);
                            }
                        ], function (err, result) {
                            // result now equals 'done'
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {data: result, message: 'Operation Successful.', status: 'success', statusCode: '200'});
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
// Create new user
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/user/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim(); //MongoId of warehouse
            var userTypeId = req.body.userTypeId.trim(); //MongoId of the type of user 
            var userCategoryId = req.body.userCategoryId.trim(); //MongoId of Category of user;
            var materialHandlingUnitId = (req.body.materialHandlingUnitId) ? req.body.materialHandlingUnitId : []; // Array JSON
            var employeeId = req.body.employeeId.trim(); //Employee number 
            var firstName = req.body.firstName.trim();
            var lastName = req.body.lastName.trim();
            var username = req.body.username.trim().toUpperCase();
            var password = crypto.createHash('md5').update(req.body.password).digest("hex");
            var targetCapacity = req.body.targetCapacity.trim();
            var allocatedDeviceId = (req.body.allocatedDeviceId) ? req.body.allocatedDeviceId : []; // Array JSON// This will be an array. JSON.parse to destringify the array
            var allocatedLicenseId = req.body.allocatedLicenseId.trim();
            var createdBy = req.body.createdBy.trim(); // Userid of the user who created the user
            var totalWorkingHours = req.body.totalWorkingHours.trim();

            var flowController = new EventEmitter();

            var newUser = new usersModel();

            flowController.on('START', function () {

                var lockAccess = global.lock_createUser;
                if (lockAccess === 'YES') {

                    setTimeout(function () {
                        flowController.emit('START');
                    }, 500);
                } else {

                    global.lock_createUser = 'YES';
                    flowController.emit('1.0');
                }
            });

            flowController.on('1.0', function () {

                usersModel.find({$and: [{$or: [{'username': username}, {'employeeId': employeeId}], 'activeStatus': 1}]}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow.length != 0) {

                        flowController.emit('ERROR', {message: 'User already exist in system! Try with different username & employeeId.', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1.1');
                    }
                });
            });

            flowController.on('1.1', function () {

                usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'User already exist in system! Try with different username & employeeId.', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1.2', userRow.userTypeId);
                    }
                });
            });

            flowController.on('1.2', function (userTypeId) {

                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {
                        if (userTypeRow != null) {

                            var userTypeName = userTypeRow.name;
                            var userTypeId = userTypeRow._id;
                            switch (userTypeName) {
                                case 'AVANCER':
                                    flowController.emit('1.3', userTypeName);
                                    break;
                                case 'SUPERADMIN':
                                    flowController.emit('1.4', userTypeName);
                                    break;
                                case 'ADMIN':
                                    flowController.emit('1.5', userTypeName);
                                    break;
                                default:
                                    flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                            }
                        }
                    }
                });
            });

            flowController.on('1.3', function () {

                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', userTypeRow.name);
                    }
                });
            });

            flowController.on('1.4', function () {

                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN') {

                            flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                        } else {

                            flowController.emit('2', userTypeRow.name);
                        }
                    }
                });
            });

            flowController.on('1.5', function () {

                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN' || userTypeRow.name == 'ADMIN') {

                            flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                        } else {
                            flowController.emit('2', userTypeRow.name);
                        }
                    }
                });
            });

            flowController.on('2', function (userType) {

                if (req.body.avatar) {

                    var base64Data = req.body.avatar;
                    var path = "images/users/" + req.body.username + timeInInteger + ".jpeg";
                    var imagePath = "./public/images/users/" + req.body.username + timeInInteger + ".jpeg";
                    require("fs").writeFile(imagePath, base64Data, 'base64', function (err) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            flowController.emit('3', path, userType);
                        }
                    });
                } else {

                    var path = '/images/users/default.jpg';
                    flowController.emit('3', path, userType);
                }
            });

            flowController.on('3', function (path, userType) {

                newUser.warehouseId = warehouseId;
                newUser.userTypeId = userTypeId;
                newUser.userCategoryId = userCategoryId;
                newUser.materialHandlingUnitId = materialHandlingUnitId;
                newUser.employeeId = employeeId;
                newUser.firstName = firstName;
                newUser.lastName = lastName;
                newUser.username = username;
                newUser.password = password;
                newUser.avatar = path;
                newUser.targetCapacity = targetCapacity;
                newUser.allocatedLicenseId = allocatedLicenseId;
                newUser.createdBy = createdBy;
                newUser.timeCreated = timeInInteger;
                newUser.totalWorkingHours = totalWorkingHours;
                newUser.save(function (err, userResult) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var userId = userResult._id;
                        if (userType === 'OPERATOR') {

                            flowController.emit('4', userId, username, userType);
                        } else {

                            flowController.emit('LOG');
                            flowController.emit('END');
                        }
                    }
                });
            });
            // Device allocation
            flowController.on('4', function (userId, username, userType) {

                var iteration = function (deviceAllcation, callbackDone) {

                    var newdeviceAllocation = new deviceAllocationModel();
                    newdeviceAllocation.warehouseId = warehouseId;
                    newdeviceAllocation.deviceId = deviceAllcation;
                    newdeviceAllocation.userId = userId;
                    newdeviceAllocation.timeCreated = timeInInteger;
                    newdeviceAllocation.save(function (err) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {
                            setTimeout(function () {
                                callbackDone();
                            }, 100);
                        }
                    });
                };
                async.eachSeries(allocatedDeviceId, iteration, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('5', username, userType);
                    }
                });
            });

            flowController.on('5', function (username, userType) {

                if (allocatedLicenseId != '') {

                    licenseManagerModel.update(
                            {'_id': allocatedLicenseId, 'warehouseId': warehouseId},
                            {'$set': {'status': 'ALLOCATED', 'timeModified': timeInInteger}},
                            function (err) {

                                if (err) {
                                    // error while adding records
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('LOG');
                                    flowController.emit('END');
                                }
                            });
                } else {

                    flowController.emit('LOG');
                    flowController.emit('END');
                }
            });

            flowController.on('LOG', function () {
                //createdBy
                usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                    } else {

                        createdName = userRow.username;
                        fs.appendFile(pathuserMaster, '\n' + 'CREATE' + ',' + createdName + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                //append failed
                                console.log(err);
                                //flowController.emit('ERROR', {message: 'CAN\'T INSERT INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!100', status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file');
                            }
                        });
                    }
                });
            });
            //END
            flowController.on('END', function () {

                result = {message: 'New user added into the system.', status: 'success', statusCode: '200'};
                global.lock_createUser = 'NO';
                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                global.lock_createUser = 'NO';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-CREATE',
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
// Create new user
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/autoapi-user/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim(); //MongoId of warehousedd a comment to this line
            var materialHandlingUnitId = []; // Array JSON
            var firstName = 'TECHNICAL';
            var lastName = 'ADMIN';
            var username = 'AVANCER';
            var password = crypto.createHash('md5').update('AlphaTango#406').digest("hex");
            var flowController = new EventEmitter();
            var newUser = new usersModel();
            //
            //
            flowController.on('START', function () {

                userTypeModel.findOne({'name': 'AVANCER', 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {

                        var userTypeId = userTypeRow._id;
                        flowController.emit('1', userTypeId);
                    }
                });
            });
            //
            // 
            flowController.on('1', function (userTypeId) {

                userCategorysModel.findOne({'name': 'AVANCER', 'activeStatus': 1}, function (err, userCategoryRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategoryRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        var userCategoryId = userCategoryRow._id;
                        flowController.emit('2', userTypeId, userCategoryId);
                    }
                });
            });
            //
            //
            flowController.on('2', function (userTypeId, userCategoryId) {

                newUser.warehouseId = warehouseId;
                newUser.userTypeId = userTypeId;
                newUser.userCategoryId = userCategoryId;
                newUser.materialHandlingUnitId = materialHandlingUnitId;
                newUser.avatar = 'images/users/default.jpg';
                newUser.firstName = firstName;
                newUser.lastName = lastName;
                newUser.username = username;
                newUser.password = password;
                newUser.createdBy = 'AVANCER';
                newUser.timeCreated = timeInInteger;
                newUser.save(function (err, userResult) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END');
                    }
                });
            });
            //
            //
            flowController.on('END', function () {

                result = {message: 'New user added into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //
            //
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-AUTO-API-CREATE',
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
            //
            //
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update user details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/update/users/')

        .patch(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var userId = req.body.userId.trim();
            var employeeId = req.body.employeeId.trim();
            var userCategoryId = req.body.userCategoryId.trim();
            var firstName = req.body.firstName.trim();
            var lastName = req.body.lastName.trim();
            var targetCapacity = req.body.targetCapacity.trim();
            var materialHandlingUnitId = (req.body.materialHandlingUnitId) ? req.body.materialHandlingUnitId : []; // Array JSON
            var allocatedDeviceId = (req.body.allocatedDeviceId) ? req.body.allocatedDeviceId : []; // Array JSON// This will be an array. JSON.parse to destringify the array
            var modifiedBy = req.body.modifiedBy;
            var totalWorkingHours = req.body.totalWorkingHours;


            var flowController = new EventEmitter();
            // Check employeeId
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                usersModel.findOne({'_id': userId, 'employeeId': employeeId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow != null) {

                        flowController.emit('1.1', userRow);
                    } else {

                        if (userRow == null) {

                            usersModel.findOne({'employeeId': employeeId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userExistRow) {

                                if (userExistRow == null) {

                                    flowController.emit('1.1', userRow);
                                } else {

                                    flowController.emit('ERROR', {message: 'Employee ID already exists! Updating employeeId not allowed.', status: 'error', statusCode: '304'});
                                }
                            });
                        }
                    }
                });
            });
            //
            flowController.on('1.1', function (userRowData) {

                (showConsole) ? console.log('1.1') : '';

                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'User already exist in system! Try with different username & employeeId.', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1.2', userRow.userTypeId, userRowData);
                    }
                });
            });
            //
            //
            flowController.on('1.2', function (userTypeId, userRowData) {

                (showConsole) ? console.log('1.2') : '';
                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {
                        if (userTypeRow != null) {

                            var userTypeName = userTypeRow.name;
                            switch (userTypeName) {
                                case 'AVANCER':
                                    flowController.emit('1.3', userRowData);
                                    break;
                                case 'SUPERADMIN':
                                    flowController.emit('1.4', userRowData);
                                    break;
                                case 'ADMIN':
                                    flowController.emit('1.5', userRowData);
                                    break;
                                default:
                                    flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                            }
                        }
                    }
                });
            });
            //
            //
            flowController.on('1.3', function (userRowData) {
                (showConsole) ? console.log('1.3') : '';
                var userTypeId = userRowData.userTypeId;
                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', userRowData);
                    }
                });
            });
            //
            //
            flowController.on('1.4', function (userRowData) {
                (showConsole) ? console.log('1.4') : '';
                var userTypeId = userRowData.userTypeId;
                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN') {

                            flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                        } else {
                            flowController.emit('1', userRowData);
                        }
                    }
                });
            });
            //
            //
            flowController.on('1.5', function (userRowData) {
                (showConsole) ? console.log('1.5') : '';
                var userTypeId = userRowData.userTypeId;
                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {

                        if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN' || userTypeRow.name == 'ADMIN') {

                            flowController.emit('ERROR', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                        } else {

                            flowController.emit('1', userRowData);
                        }
                    }
                });
            });
            //-
            flowController.on('1', function (userData) {

                (showConsole) ? console.log('1') : '';

                var userTypeId = userData.userTypeId;
                var userType = userData.userType;

                userTypeModel.findOne({'_id': userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('ERROR', {message: 'UserType does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {
                        if (userTypeRow != null) {

                            if (userTypeRow.name !== "OPERATOR") {

                                flowController.emit('4', userType);
                            } else {

                                flowController.emit('2', userType);
                            }
                        }
                    }
                });
            });
            //
            flowController.on('2', function (userType) {
                (showConsole) ? console.log('2') : '';

                deviceAllocationModel.find({'userId': userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceAllcationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        if (deviceAllcationRow.length == 0) {

                            flowController.emit('4', userType);
                        } else {

                            async.eachSeries(deviceAllcationRow, function (element, callback) {

                                var deviceId = element.deviceId;
                                deviceAllocationModel.update(
                                        {'_id': element._id, 'deviceId': deviceId, 'userId': userId, 'warehouseId': warehouseId},
                                        {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}},
                                        function (err) {

                                            if (err) {
                                                // error while adding records
                                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                setImmediate(callback);
                                            }
                                        });
                            }, function (err) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('3', allocatedDeviceId, userType);
                                }
                            });
                        }
                    }
                });
            });
            //
            flowController.on('3', function (allocatedDeviceId, userType) {
                (showConsole) ? console.log('3') : '';
                async.eachSeries(allocatedDeviceId, function (element, callback) {

                    deviceAllocationModel.find({'userId': userId, 'deviceId': element, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceAllocationRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (deviceAllocationRow.length != 0) {

                            setImmediate(callback);
                        } else {

                            var newdeviceAllocation = new deviceAllocationModel();
                            newdeviceAllocation.warehouseId = warehouseId;
                            newdeviceAllocation.deviceId = element;
                            newdeviceAllocation.userId = userId;
                            newdeviceAllocation.timeCreated = timeInInteger;
                            newdeviceAllocation.allocatedBy = modifiedBy;
                            newdeviceAllocation.save(function (err) {
                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('4', userType);
                    }
                });
            });
            //
            flowController.on('4', function (userType) {
                (showConsole) ? console.log('4') : '';
                usersModel.findOne({'_id': userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userRow) {

                    userRow.employeeId = employeeId;
                    userRow.userCategoryId = userCategoryId;
                    userRow.firstName = firstName;
                    userRow.lastName = lastName;
                    userRow.targetCapacity = targetCapacity;
                    userRow.materialHandlingUnitId = materialHandlingUnitId;
                    userRow.modifiedBy = modifiedBy;
                    userRow.timeModified = timeInInteger;
                    userRow.totalWorkingHours = totalWorkingHours;

                    userRow.save(function (err) {
                        if (err) {
                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var username = userRow.username;
                            flowController.emit('LOG', username);
                            flowController.emit('END', {message: 'User data updated into the system', status: 'success', statusCode: '201'});
                        }
                    });
                });
            });
            //LOG
            flowController.on('LOG', function (username) {
                (showConsole) ? console.log('LOG') : '';

                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        console.log('null');
                    } else {

                        modifiedByName = userRow.username;

                        fs.appendFile(pathuserMaster, '\n' + 'UPDATE' + ',' + modifiedByName + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log(err);
                            } else {

                                console.log('append file');
                            }
                        });
                    }
                });
            });
            //END
            flowController.on('END', function (result) {

                res.json(result);
            });
            //ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-UPDATE',
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
// Update image of user
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/update/image/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            //Request onject is JSON object so no need to parse the array inside it
            var warehouseId = req.body.warehouseId.trim();
            var userMasterId = req.body.userMasterId.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                usersModel.findOne({'_id': userMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Data missing! User records tampered/removed from system.', status: 'success', statusCode: '200'});
                    } else {

                        if (userMasterRow != null) {

                            var promise_insertUserMasterImage = new Promises(function (resolve, reject) {

                                if (req.body.image) {

                                    var base64Data = req.body.image;
                                    databasePath = '/images/users/' + userMasterRow.username + '_' + timeInInteger + ".jpeg";
                                    var uploadPath = "./public/images/users/" + userMasterRow.username + '_' + timeInInteger + ".jpeg";
                                    require("fs").writeFile(uploadPath, base64Data, 'base64', function (err) {

                                        if (err) {

                                            reject(res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                                        } else {

                                            resolve(databasePath);
                                        }
                                    });
                                } else {
                                    if (userMasterRow.avatar == '') {
                                        databasePath = '/images/users/default.jpeg';
                                        resolve(databasePath);
                                    } else {
                                        resolve(userMasterRow.avatar);
                                    }

                                }
                            });
                            promise_insertUserMasterImage.then(function (promise_resolvedData) {

                                userMasterRow.avatar = promise_resolvedData;
                                userMasterRow.save(function (err, insertedRecordDetails) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: 'User\s master information updated into system!', status: 'success', statusCode: '201'});
                                    }
                                });
                            }, function (reject) {// After 1st promise completes, if promise rejected (REJECTED PART)

                                flowController.emit('ERROR', reject);
                            }).catch(function (exception) {
                                /* error :( */
                                flowController.emit('ERROR', {message: 'EXCEPTION WHILE ADDING IMAGE', status: 'error', statusCode: '500'});
                            });
                        }
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
// Delete user
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/delete/user/:warehouseId/:userId/:modifiedBy')

        .delete(function (req, res) {

            var showConsole = 1;
            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim(); //MongoId of warehouse

            var userId = req.params.userId.trim(); //MongoId of warehouse

            var modifiedBy = req.params.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                (showConsole) ? console.log('START') : '';
                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, usersModelRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (usersModelRow == null) {

                        flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {
                        if (usersModelRow != null) {

                            var userTypeId = usersModelRow.userTypeId;
                            flowController.emit('1', userTypeId);
                        }
                    }
                });
            });
            //
            //
            flowController.on('1', function (getuserTypeId) {
                (showConsole) ? console.log('1') : '';

                userTypeModel.findOne({'_id': getuserTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow == null) {

                        flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {
                        if (userTypeRow != null) {

                            var userTypeName = userTypeRow.name;
                            var userTypeId = userTypeRow._id;
                            switch (userTypeName) {
                                case 'AVANCER':
                                    flowController.emit('2', userTypeName);
                                    break;
                                case 'SUPERADMIN':
                                    flowController.emit('3', userTypeName);
                                    break;
                                case 'ADMIN':
                                    flowController.emit('4', userTypeName);
                                    break;
                                case 'OPERATOR':
                                    flowController.emit('5', userTypeName);
                                    break;
                                default:
                                    flowController.emit('error', {message: 'You are not Authenticated user for this action!', status: 'error', statusCode: '301'});
                            }
                        }
                    }
                });
            });
            //
            //
            flowController.on('2', function (userTypeName) {
                (showConsole) ? console.log('2') : '';

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {

                        username = userRow.username;
                        userTypeModel.findOne({'_id': userRow.userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userTypeRow == null) {

                                flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                            } else {

                                if (userTypeRow.name == 'AVANCER') {

                                    flowController.emit('error', {message: 'Not Authorised!', status: 'error', statusCode: '304'});
                                } else {

                                    usersModel.update({'_id': userId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err) {
                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {
                                            if (userTypeRow.name == 'OPERATOR') {

                                                if (userRow.allocatedLicenseId) {

                                                    flowController.emit('5.1', userRow.allocatedLicenseId, username, userTypeName);
                                                } else {

                                                    flowController.emit('LOG', username);
                                                    flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                                }
                                            } else {

                                                flowController.emit('LOG', username);
                                                flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                            }
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
            flowController.on('3', function (userTypeName) {

                (showConsole) ? console.log('3') : '';

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {

                        var username = userRow.username;
                        userTypeModel.findOne({'_id': userRow.userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userTypeRow == null) {

                                flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                            } else {

                                if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN') {

                                    flowController.emit('error', {message: 'Not Authorised!', status: 'error', statusCode: '304'});
                                } else {

                                    usersModel.update({'_id': userId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err) {
                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {
                                            if (userTypeRow.name == 'OPERATOR') {

                                                if (userRow.allocatedLicenseId) {

                                                    flowController.emit('5.1', userRow.allocatedLicenseId, username, userTypeName);
                                                } else {

                                                    flowController.emit('LOG', username);
                                                    flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                                }
                                            } else {

                                                flowController.emit('LOG', username);
                                                flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                            }
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
            flowController.on('4', function (userTypeName) {
                (showConsole) ? console.log('4') : '';

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {

                        var username = userRow.username;
                        userTypeModel.findOne({'_id': userRow.userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userTypeRow == null) {

                                flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                            } else {

                                if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN' || userTypeRow.name == 'ADMIN') {

                                    flowController.emit('error', {message: 'Not Authorised!!', status: 'error', statusCode: '304'});
                                } else {

                                    usersModel.update({'_id': userId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err) {
                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            if (userTypeRow.name == 'OPERATOR') {

                                                if (userRow.allocatedLicenseId) {

                                                    flowController.emit('5.1', userRow.allocatedLicenseId, username, userTypeName);
                                                } else {

                                                    flowController.emit('LOG', username);
                                                    flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                                }
                                            } else {

                                                flowController.emit('LOG', username);
                                                flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                            }
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
            flowController.on('5', function (userTypeName) {
                (showConsole) ? console.log('5') : '';

                usersModel.findOne({'_id': userId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('error', {message: 'User Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                    } else {

                        var username = userRow.username;
                        userTypeModel.findOne({'_id': userRow.userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userTypeRow == null) {

                                flowController.emit('error', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                            } else {

                                if (userTypeRow.name == 'AVANCER' || userTypeRow.name == 'SUPERADMIN' || userTypeRow.name == 'ADMIN') {

                                    flowController.emit('error', {message: 'Not Authorised!!', status: 'error', statusCode: '304'});
                                } else {

                                    usersModel.update({'_id': userId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err) {
                                        if (err) {

                                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {
                                            if (userRow.allocatedLicenseId) {

                                                flowController.emit('5.1', userRow.allocatedLicenseId, username, userTypeName);
                                            } else {

                                                flowController.emit('LOG', username);
                                                flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                                            }
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
            flowController.on('5.1', function (getLicenseId, username, userTypeName) {

                (showConsole) ? console.log('5.1') : '';
                licenseManagerModel.update({'_id': getLicenseId, 'warehouseId': warehouseId, "status": "ALLOCATED"}, {'$set': {"status": "OPEN", 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('LOG', username);
                        flowController.emit('end', {message: 'User removed from the system!', status: 'success', statusCode: '201'});
                    }
                });
            });
            //
            //
            flowController.on('LOG', function (username) {
                (showConsole) ? console.log('LOG') : '';

                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'Unable To Create User! Try again later.', status: 'error', statusCode: '304'});
                    } else if (userRow == null) {

                        console.log('null');
                    } else {

                        modifiedByName = userRow.username;

                        fs.appendFile(pathuserMaster, '\n' + 'DELETE' + ',' + modifiedByName + ',' + username + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                console.log(err);
                            } else {

                                console.log('append file');
                            }
                        });
                    }
                });
            });
            //end
            flowController.on('end', function (result) {
                //
                res.json(result);
            });

            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-DELETE',
                    ERRORMESSAGE: errorData.message
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
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get all user details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/readAll/user/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var userDataArray = [];
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                usersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userDataRow) {
                    if (err) {// Serverside error

                        flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userDataRow.length == 0) {

                        flowController.emit('ERROR',{message: "Userdata tampered/removed from system!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userDataRow, function (element, callback) {

                            if (element.username !== 'AVANCER') {
                                async.waterfall([

                                    function (waterfallcallback) {

                                        if (element.allocatedLicenseId) {

                                            licenseManagerModel.findOne({'_id': element.allocatedLicenseId, 'activeStatus': 1}, function (err, licenseRow) {
                                                if (err) {

                                                    waterfallcallback(null, {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                                                } else if (licenseRow == null) {

                                                    waterfallcallback(null, '');
                                                } else {

                                                    var licenseName = (licenseRow.name) ? licenseRow.name : '';
                                                    waterfallcallback(null, licenseName);
                                                }
                                            });
                                        } else {
                                            waterfallcallback(null, '');
                                        }
                                    },
                                    function (licenseName, waterfallcallback) {

                                        var deviceArr = [];
                                        deviceAllocationModel.find({'userId': element._id, 'activeStatus': 1}, function (err, deviceAllocationRow) {
                                            if (err) {

                                                waterfallcallback(null, {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                                            } else if (deviceAllocationRow.length == 0) {

                                                waterfallcallback(null, licenseName, '');
                                            } else {

                                                async.eachSeries(deviceAllocationRow, function (element, callback) {
                                                    //deviceId
                                                    deviceArr.push(element.deviceId);
                                                    setImmediate(callback);
                                                }, function (err) {

                                                    if (err) {

                                                        waterfallcallback(err);
                                                    } else {

                                                        waterfallcallback(null, licenseName, deviceArr);
                                                    }
                                                });
                                            }
                                        });
                                    },
                                    function (licenseName, deviceArr, waterfallcallback) {

                                        userCategorysModel.findOne({'_id': element.userCategoryId, 'activeStatus': 1}, function (err, userCategoryRow) {
                                            if (err) {// Serverside error

                                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else if (userCategoryRow == null) {

                                                waterfallcallback(null, licenseName, deviceArr, '');
                                            } else {

                                                userCategoryName = userCategoryRow.name;
                                                waterfallcallback(null, licenseName, deviceArr, userCategoryName);
                                            }
                                        });
                                    },
                                    function (licenseName, deviceArr, userCategoryName, waterfallcallback) {

                                        var dataUser = {
                                            userCategoryName: userCategoryName,
                                            userId: element._id,
                                            userCategoryId: element.userCategoryId,
                                            userTypeId: element.userTypeId,
                                            firstName: element.firstName,
                                            materialHandlingUnitId: element.materialHandlingUnitId,
                                            lastName: element.lastName,
                                            username: element.username,
                                            employeeId: element.employeeId,
                                            avatar: element.avatar,
                                            targetCapacity: element.targetCapacity,
                                            totalWorkingHours: element.totalWorkingHours,
                                            allocatedLicenseId: element.allocatedLicenseId, //licenseRow.name,
                                            licenseName: licenseName,
                                            deviceId: deviceArr
                                        };
                                        waterfallcallback(null, dataUser);
                                    }
                                ], function (err, result) {
                                    // result now equals 'done'
                                    if (err) {
                                        callback(err);
                                    } else {

                                        userDataArray.push(result);
                                        setImmediate(callback);
                                    }
                                });
                            } else {
                                setImmediate(callback);
                            }
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END',{data: userDataArray, status: 'success', statusCode: '200'});
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
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/allocatedLicense/user/')

        .patch(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var allocatedLicenseId = req.body.allocatedLicenseId.trim();
            var userId = req.body.userId.trim();
            var modifiedBy = req.body.modifiedBy.trim();
            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {

                usersModel.findOne({'_id': userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: "USER NOT FOUND!!", status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            userTypeModel.findOne({'_id': userRow.userTypeId, 'activeStatus': 1}, function (err, userTypeRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (userTypeRow == null) {

                                    flowController.emit('ERROR', {message: 'User Type Id Missing/Modified in System!!', status: 'error', statusCode: '404'});
                                } else {

                                    if (userTypeRow != null) {


                                        if (userTypeRow.name == 'OPERATOR') {

                                            if (userRow.allocatedLicenseId == '') {
                                                usersModel.update(
                                                        {'_id': userId},
                                                        {'$set': {'allocatedLicenseId': allocatedLicenseId, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}},
                                                        function (err) {

                                                            if (err) {//modifiedBy
                                                                // error while adding records
                                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                            } else {

                                                                flowController.emit('1');
                                                            }
                                                        });
                                            } else {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                                            }

                                        } else {

                                            flowController.emit('ERROR', {message: "Unable to Get details! Try again after some time.", status: 'error', statusCode: '304'});
                                        }

                                    }
                                }
                            });
                        }
                    }
                });
            });
            //
            //
            flowController.on('1', function () {

                licenseManagerModel.findOne({'_id': allocatedLicenseId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, licenseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (licenseRow == null) {

                        flowController.emit('ERROR', {message: "LICENSE ALLOCATION NOT FOUND!!", status: 'error', statusCode: '404'});
                    } else {
                        if (licenseRow != null) {

                            licenseManagerModel.update(
                                    {'_id': allocatedLicenseId},
                                    {'$set': {'status': 'ALLOCATED', 'timeModified': timeInInteger}},
                                    function (err) {

                                        if (err) {//modifiedBy
                                            // error while adding records
                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('end');
                                        }
                                    });
                        }
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-ALLOCATED-LICENSE',
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
            flowController.on('end', function () {

                res.json({message: 'LICENSE ALLOCATION TO USER SUCCESSFULLY!!', status: 'success', statusCode: 201});
            });
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/disAllocatedLicense/user/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var allocatedLicenseId = req.body.allocatedLicenseId.trim();
            var userId = req.body.userId.trim();
            var modifiedBy = req.body.modifiedBy.trim();
            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {

                date = moment(new Date()).format('DD/MM/YY');
                deviceTrackingModel.count({'userId': userId, 'activeStatus': 1}, function (err, userCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCount == 0) {

                        flowController.emit('1.1');
                    } else {

                        deviceTrackingModel.findOne({'userId': userId, 'date': date, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (deviceTrackingRow == null) {

                                flowController.emit('ERROR', {message: "USER TRACKING RECORD NOT FOUND!!", status: 'error', statusCode: '404'});
                            } else {

                                if (deviceTrackingRow.status == 'LOGOUT') {

                                    flowController.emit('1.1');
                                } else {

                                    flowController.emit('ERROR', {message: "ANTHOER USER LOGIN IN THIS LICENSE IN SYSYTEM !!", status: 'error', statusCode: '404'});
                                }
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('1.1', function () {

                usersModel.findOne({'_id': userId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: "USER NOT FOUND!!", status: 'error', statusCode: '404'});
                    } else {
                        if (userRow != null) {

                            userRow.allocatedLicenseId = '';
                            userRow.timeModified = timeInInteger;
                            userRow.modifiedBy = modifiedBy;
                            userRow.save(function (err) {

                                if (err) {//modifiedBy
                                    // error while adding records
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('1');
                                }
                            });
                        }
                    }
                });
            });
            //
            //
            flowController.on('1', function () {

                licenseManagerModel.findOne({'_id': allocatedLicenseId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, licenseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (licenseRow == null) {

                        flowController.emit('ERROR', {message: "LICENSE ALLOCATION NOT FOUND!!", status: 'error', statusCode: '404'});
                    } else {
                        if (licenseRow != null) {
                            licenseManagerModel.update(
                                    {'_id': allocatedLicenseId},
                                    {'$set': {'status': 'OPEN', 'timeModified': timeInInteger}},
                                    function (err) {

                                        if (err) {//modifiedBy
                                            // error while adding records
                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('end');
                                        }
                                    });
                        }
                    }
                });
            });
            // error while process execution
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'USERMASTER-DISALLOCATED-LICENSE',
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
            flowController.on('end', function () {

                res.json({message: 'LICENSE ALLOCATION REMOVE TO USER SUCCESSFULLY!!', status: 'success', statusCode: 201});
            });
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get single user details 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/operator/:warehouseId/')

        .get(function (req, res) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {

                usersModel.find({warehouseId: warehouseId, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else if (userRow.length == 0) {

                        flowController.emit('ERROR', {message: "Userdata tampered/removed from system!", status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', userRow);
                    }
                });
            });
            //
            //
            flowController.on('1', function (userRow) {

                var userOperatorArray = [];

                async.eachSeries(userRow, function (element, callbackDone) {

                    userTypeModel.findOne({_id: element.userTypeId, warehouseId: warehouseId, "activeStatus": 1}, function (err, userTypeRow) {
                        if (err) {

                            callbackDone(err);
                        } else if (userTypeRow == null) {

                            setImmediate(callbackDone);
                        } else {

                            if (userTypeRow.name == "OPERATOR") {

                                data = {
                                    userId: element._id,
                                    username: element.username,
                                    fullName: element.firstName + " " + element.lastName
                                };
                                userOperatorArray.push(data);
                                setImmediate(callbackDone);
                            } else {

                                setImmediate(callbackDone);
                            }
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', userOperatorArray);
                    }
                });
            });
            //
            //
            flowController.on('END', function (userOperatorArray) {

                result = {data: userOperatorArray, message: 'Operation Successful.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //
            //
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            //
            //
            flowController.emit('START');
        });
//
//
module.exports = router;