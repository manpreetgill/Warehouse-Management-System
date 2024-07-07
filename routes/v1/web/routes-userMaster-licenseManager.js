var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var MagicIncrement = require('magic-increment');
var async = require('async');
var events = require('events');
var requestify = require('requestify');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster');
var userLicenseManagerModel = require('../../../models/mongodb/userMaster-licenseManager/collection-licenseManager');
var technicalDetailsModel = require('../../../models/mongodb/deviceMaster-technicalDetails/collection-technicalDetails.js');
var licenseManagerModel = require('../../../models/mongodb/userMaster-licenseManager/collection-licenseManager.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get unallocated license configured
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/license/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userLicenseManagerModel.find({'warehouseId': warehouseId, 'status': 'OPEN', 'activeStatus': 1}, function (err, licenseManagerRow) {

                    var userLicenseArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (licenseManagerRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: "No license available! Contact Avancer customer-care to get new licenses.", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(licenseManagerRow, function (element, callback) {

                            var license = {id: element._id, name: element.name};

                            userLicenseArray.push(license);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: userLicenseArray, status: 'success', statusCode: '200'});
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
// Sync to get license
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/sync/license/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            // Get base url from clients
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                clientsModel.findOne({'activeStatus': 1}, function (err, clientRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (clientRow == null) {

                        flowController.emit('ERROR', {message: 'Client details not found in system! Contact avancer.', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('1', clientRow);
                    }
                });
            });

            // Get base url from clients
            flowController.on('1', function (clientRow) {

                (consoleLog) ? console.log('1') : '';

                warehouseMasterModel.findOne({'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse data remove from system!!', status: 'error', statusCode: '404'});
                    } else {

                        flowController.emit('2', clientRow, warehouseRow);
                    }
                });
            });

            // Get total licenses 
            flowController.on('2', function (clientRow, warehouseRow) {

                (consoleLog) ? console.log('2') : '';

                licenseManagerModel.find({'activeStatus': 1}, function (err, licenseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                    } else if (licenseRow.length == 0) {

                        flowController.emit('3', clientRow, warehouseRow, 0);
                    } else {

                        flowController.emit('3', clientRow, warehouseRow, licenseRow.length);
                    }
                });
            });

            // Get used licenses
            flowController.on('3', function (clientRow, warehouseRow, totalLicenses) {

                (consoleLog) ? console.log('3') : '';

                licenseManagerModel.find({status: 'ALLOCATED', activeStatus: 1}, function (err, licenseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                    } else if (licenseRow.length == 0) {

                        flowController.emit('4', clientRow, warehouseRow, totalLicenses, 0);
                    } else {

                        flowController.emit('4', clientRow, warehouseRow, totalLicenses, licenseRow.length);
                    }
                });
            });

            // Get total number of active devices
            flowController.on('4', function (clientRow, warehouseRow, totalLicenses, usedLicenses) {

                (consoleLog) ? console.log('4') : '';

                deviceMasterModel.find({imeiNumber: {'$exists': true}, activeStatus: 1}, function (err, deviceMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500', data: []});
                    } else if (deviceMasterRow.length == 0) {

                        flowController.emit('5', clientRow, warehouseRow, totalLicenses, usedLicenses, 0);
                    } else {

                        flowController.emit('5', clientRow, warehouseRow, totalLicenses, usedLicenses, deviceMasterRow.length);
                    }
                });
            });

            // Call & get license details
            flowController.on('5', function (clientRow, warehouseRow, totalLicenses, usedLicenses, totalDevices) {

                (consoleLog) ? console.log('5') : '';

                var clientId = String(clientRow._id);

                var warehouseId = String(warehouseRow._id);

                var baseUrl = clientRow.licenseUrl;

                var requestifyUrl = baseUrl + 'licenseCheck/' + totalLicenses + '/' + usedLicenses + '/' + totalDevices;

                requestify.get(requestifyUrl).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        flowController.emit('6', clientRow, warehouseRow, result.data[0], totalLicenses);
                    }

                    if (result.status === 'error') {

                        flowController.emit('ERROR', result);
                    }
                });
            });

            // Add New IMEI to database
            flowController.on('6', function (clientRow, warehouseRow, result, totalLicenses) {

                (consoleLog) ? console.log('6') : '';

                var IMEIArray = result.imei;

                if (IMEIArray.length == 0) {

                    flowController.emit('7', clientRow, warehouseRow, result, IMEIArray, totalLicenses);
                } else {

                    async.eachSeries(IMEIArray, function (element, callback) {

                        technicalDetailsModel.find({'imeiNumber': element, 'activeStatus': 1}, function (err, technicalDetailsRow) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (technicalDetailsRow.length != 0) {

                                setImmediate(callback);
                            } else {

                                var authorizedIMEIModel = new technicalDetailsModel();

                                authorizedIMEIModel.warehouseId = String(warehouseRow._id);
                                authorizedIMEIModel.imeiNumber = element;
                                authorizedIMEIModel.timeCreated = timeInInteger;

                                authorizedIMEIModel.save(function (err) {
                                    if (err) {
                                        callback(err);
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

                            flowController.emit('7', clientRow, warehouseRow, result, IMEIArray, totalLicenses);//{message: "Operation Successful.", data: putListArray, status: 'success', statusCode: '200'});
                        }
                    });
                }
            });

            // Call requestify to create license
            flowController.on('7', function (clientRow, warehouseRow, result, IMEIArray, totalLicenses) {

                (consoleLog) ? console.log('7') : '';

                var baseUrl = clientRow.baseUrl;

                var warehouseId = String(warehouseRow._id);

                var quantity = (parseInt(result.user) - parseInt(totalLicenses));

                if (quantity <= 0) {

                    flowController.emit('END', {message: 'Sync operation completed! No new licenses available to you.', status: 'success', statusCode: '200'});
                } else {

                    var requestifyUrl = baseUrl + '/v1/userMaster/web/user/configuration/create/license/';

                    var data = {warehouseId: warehouseId, quantity: String(quantity)};

                    requestify.post(requestifyUrl, data).then(function (response) {

                        var localresult = response.getBody();

                        if (localresult.status === 'success') {

                            flowController.emit('8', clientRow, warehouseRow, result, IMEIArray);
                        }

                        if (localresult.status === 'error') {

                            flowController.emit('ERROR', result);
                        }
                    });
                }
            });

            // Check the available licenses against server side license data
            flowController.on('8', function (clientRow, warehouseRow, result, IMEIArray) {

                (consoleLog) ? console.log('8') : '';

                userLicenseManagerModel.find({'activeStatus': 1}, function (err, userLicenseManagerRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userLicenseManagerRow.length == 0) {

                        flowController.emit('ERROR', err);
                    } else {

                        var totalCurrentLicenses = userLicenseManagerRow.length;
                        var totalServerLicenses = parseInt(result.user);

                        if (totalCurrentLicenses == totalServerLicenses) {

                            flowController.emit('END', {message: 'Sync operation completed!', status: 'success', statusCode: '200'});
                        } else {

                            flowController.emit('9', clientRow, warehouseRow, totalCurrentLicenses, totalServerLicenses);
                        }
                    }
                });
            });

            // Else condition
            flowController.on('9', function (clientRow, warehouseRow, totalCurrentLicenses, totalServerLicenses) {

                (consoleLog) ? console.log('9') : '';

                var licensesToAdd = totalServerLicenses - totalCurrentLicenses;

                var baseUrl = clientRow.baseUrl;

                var warehouseId = String(warehouseRow._id);

                var quantity = String(licensesToAdd);

                var requestifyUrl = baseUrl + '/v1/userMaster/web/user/configuration/create/license/';

                var data = {warehouseId: warehouseId, quantity: String(quantity)};

                requestify.post(requestifyUrl, data).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        flowController.emit('END', {message: 'Sync operation completed!!', status: 'success', statusCode: '200'});
                    }

                    if (result.status === 'error') {

                        flowController.emit('ERROR', result);
                    }
                });
            });

            // End
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';

                res.json(response);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Create License
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/license/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var quantity = req.body.quantity.trim();// Parameter from body

            var licenseArray = [];

            var flowController = new EventEmitter();

            // Get current license data
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                userLicenseManagerModel.findOne({"warehouseId": warehouseId}).sort({'name': -1}).exec(function (err, userLicenseManagersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('1', userLicenseManagersRow);
                    }
                });
            });

            // Get count of licenses
            flowController.on('1', function (userLicenseManagersRow) {

                (consoleLog) ? console.log('1') : '';

                for (var j = 1; j <= quantity; j++) {

                    var temp = {};

                    if (licenseArray.length != 0) {

                        previousLicense = licenseArray[j - 2].license;
                        newLicense = MagicIncrement.inc(previousLicense);
                    } else {
                        if (userLicenseManagersRow == null) {

                            newLicense = 'AVANCERDLA0001';
                        } else {

                            newLicense = MagicIncrement.inc(userLicenseManagersRow.name);
                        }
                    }

                    temp.license = newLicense;
                    licenseArray.push(temp);
                }

                if (licenseArray.length == quantity) {

                    flowController.emit('2', licenseArray);
                }
            });

            // Add licenses to database
            flowController.on('2', function (licenseArray) {

                (consoleLog) ? console.log('2') : '';

                async.eachSeries(licenseArray, function (element, callback) {

                    var license = element.license;

                    userLicenseManagerModel.find({'warehouseId': warehouseId, 'name': license, 'activeStatus': 1}).exec(function (err, licenseManagerRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (licenseManagerRow.length != 0) {

                            callback({message: 'Records with this license already found! Error while configuring licenses.', status: 'error', statusCode: '404'});
                        } else {

                            var newLicense = new userLicenseManagerModel();
                            newLicense.warehouseId = warehouseId;
                            newLicense.timeCreated = timeInInteger;
                            newLicense.name = license;

                            newLicense.save(function (err, returnData) {
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

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: ' License configured into system.', status: 'success', statusCode: '201'});
                    }
                });
            });

            // End
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';

                res.json(response);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Get license Header
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/license-header/')

        .post(function (req, res, next) {

            var consoleProcess = 1;

            (consoleProcess) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim(); // MongoId of the warehouse

            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            // Get allocated licenses
            flowController.on('START', function () {

                (consoleProcess) ? console.log('START') : '';

                userLicenseManagerModel.count({'warehouseId': warehouseId, 'status': 'ALLOCATED', 'activeStatus': 1}, function (err, allocatedLicensesCount) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var allocatedLicenses = allocatedLicensesCount;
                        flowController.emit('1', allocatedLicenses);
                    }
                });
            });

            // Total licenses
            flowController.on('1', function (allocatedLicenses) {

                (consoleProcess) ? console.log('1') : '';

                userLicenseManagerModel.count({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, totalLicensesCount) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var totalIssued = totalLicensesCount;

                        flowController.emit('2', allocatedLicenses, totalIssued);
                    }
                });
            });

            // Total IMEI numbers available/Devices
            flowController.on('2', function (allocatedLicenses, totalIssued) {

                (consoleProcess) ? console.log('2') : '';

                technicalDetailsModel.count({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceCount) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        var noOfDevice = deviceCount;

                        flowController.emit('3', allocatedLicenses, totalIssued, noOfDevice)
                    }
                });
            });

            // Send IMEI serial number wise
            flowController.on('3', function (allocatedLicenses, totalIssued, noOfDevice) {

                (consoleProcess) ? console.log('3') : '';

                var imeiNumber = [];

                technicalDetailsModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, technicalRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (technicalRow == 0) {

                        flowController.emit('ERROR', {message: 'No IMEI numbers available.', status: 'error', statusCode: '404'});
                    } else {
                        var count = 1;

                        async.eachSeries(technicalRow, function (element, callback) {

                            var data = {
                                serialNumber: count++,
                                imeiNumber: element.imeiNumber
                            };
                            imeiNumber.push(data);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('4', allocatedLicenses, totalIssued, noOfDevice, imeiNumber);
                            }
                        });
                    }
                });
            });

            // Call & get license details
            flowController.on('4', function (usedLicenses, totalLicenses, totalDevices, imeiNumber) {

                (consoleProcess) ? console.log('4') : '';

                clientsModel.findOne({'activeStatus': 1}, function (err, clientRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (clientRow == null) {

                        flowController.emit('ERROR', {message: 'Client details not found in system! Contact avancer.', status: 'error', statusCode: '404'});
                    } else {

                        var requestifyUrl = clientRow.licenseUrl + 'licenseCheck/' + totalLicenses + '/' + usedLicenses + '/' + totalDevices;

                        requestify.get(requestifyUrl).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {

                                flowController.emit('END', usedLicenses, totalLicenses, totalDevices, imeiNumber, result.data[0].user);
                            }

                            if (result.status === 'error') {

                                flowController.emit('ERROR', result);
                            }
                        });
                    }
                });
            });

            // End
            flowController.on('END', function (allocatedLicenses, totalIssued, noOfDevice, imeiNumber, totalAssigned) {

                (consoleProcess) ? console.log('END') : '';

                var data = {
                    allocatedLicenses: allocatedLicenses,
                    totalIssued: totalIssued,
                    noOfDevice: noOfDevice,
                    lastSync: "22-08-17",
                    serverIssued: totalAssigned,
                    deviceIMEI: imeiNumber
                };

                var response = {message: 'Operation Successful', data: data, status: 'success', statusCode: '200'};
                res.json(response);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleProcess) ? console.log('ERROR') : '';
                (consoleProcess) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;