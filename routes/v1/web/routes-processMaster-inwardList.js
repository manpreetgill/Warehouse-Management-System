var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var MagicIncrement = require('magic-increment');
var requestify = require('requestify');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
var fs = require('fs');
var round10 = require('round10').round10;
//---------------------------------------------------------------------------------------------------------------------------
var pathInwardList = './logs/dailyLog/inwardListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var inwardListModel = require('../../../models/mongodb/processMaster-inwardList/collection-inwardList.js');
var inwardSubListModel = require('../../../models/mongodb/processMaster-inwardSubList/collection-inwardSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var deviceAreaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
var function_locationMaster = require('../../../functionSet/function-locationMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
var inwardListService = require('../../../service-factory/inwardListService');
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
// GET Picklist 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/read/inwardList/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.body) : '';

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                inwardListModel.find({'warehouseId': warehouseId, 'status': {'$ne': 31}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}).sort({'sequence': 1}).exec(function (err, inwardListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No Pick-List available for the shift/day!', data: [], status: 'error', statusCode: '404'});
                    } else {

                        var inwardListArray = [];

                        async.eachSeries(inwardListRow, function (element, callback) {

                            var inwardList_data = {
                                inwardListId: element._id,
                                name: element.name,
                                status: element.status,
                                priority: (element.hopperPriority == 1) ? 'HIGH' : 'NORMAL',
                                sequence: element.sequence,
                                orderNumber: element.orderNumber,
                                resourceAssigned: element.resourceAssigned,
                                assignedBy: element.hasOwnProperty('resourceAssigned') ? element.resourceAssigned : "",
                                pickRate: element.hasOwnProperty('pickRate') ? element.pickRate : ""
                            };

                            inwardListArray.push(inwardList_data);

                            setImmediate(callback);

                        }, function (err) {
                            if (err) {

                                console.log('Error1');
                            } else {
                                flowController.emit('1', inwardListArray);
                            }
                        });
                    }
                });
            });

            // 
            flowController.on('1', function (inwardListArray) {

                (consoleLog) ? console.log('1') : '';

                var finalInwardListArray = [];

                async.eachSeries(inwardListArray, function (element, callback) {

                    inwardSubListModel.count({'inwardListId': element.inwardListId, 'activeStatus': 1}, function (err, inwardSubListCount) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            element.lineItem = inwardSubListCount;

                            finalInwardListArray.push(element);

                            setImmediate(callback);
                        }
                    });

                }, function (err) {
                    if (err) {

                        console.log('Error2');
                    } else {
                        flowController.emit('2', finalInwardListArray);
                    }
                });
            });

            // Filter and get only device Id in array
            flowController.on('2', function (finalInwardListArray) {

                (consoleLog) ? console.log('2') : '';

                async.eachSeries(finalInwardListArray, function (element, callback) {

                    var resourceAssigned = element.resourceAssigned;

                    if (resourceAssigned.length <= 0) {

                        setImmediate(callback);
                    } else {

                        deviceIdArray = [];
                        var uniArray = [];
                        async.eachSeries(resourceAssigned, function (element2, callback2) {

                            if (uniArray.indexOf(element2.deviceId) == -1) {

                                uniArray.push(element2.deviceId);

                                deviceMasterModel.findOne({'_id': element2.deviceId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                                    if (err) {

                                        callback2({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else if (deviceMasterRow == null) {

                                        callback2();
                                    } else {

                                        var object = {deviceId: element2.deviceId, deviceName: deviceMasterRow.name};

                                        deviceIdArray.push(object);

                                        callback2();
                                    }
                                });
                            } else {

                                callback2();
                            }
                        }, function (err) {
                            if (err) {

                                console.log('Error3');
                            } else {

                                element.resourceAssigned = deviceIdArray;
                                setImmediate(callback);
                            }
                        });
                    }

                }, function (err) {
                    if (err) {

                        console.log('Error4' + err);
                    } else {
                        flowController.emit('3', finalInwardListArray);
                    }
                });
            });

            // Get users online on device
            flowController.on('3', function (finalInwardListArray) {

                (consoleLog) ? console.log('3') : '';

                async.eachSeries(finalInwardListArray, function (finalPickSubListRow, callbackDone) {

                    var resourceAssigned = finalPickSubListRow.resourceAssigned;

                    if (resourceAssigned.length <= 0) {

                        callbackDone();

                    } else {

                        var deviceObjectArray = [];
                        var uniArray = [];
                        var date = moment(new Date()).format('DD/MM/YY');

                        async.eachSeries(resourceAssigned, function (element, callbackDone2) {

                            if (uniArray.indexOf(element.deviceId) == -1) {
                                uniArray.push(element.deviceId);
                                deviceTrackingModel.findOne({'deviceId': element.deviceId, 'date': date, 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, deviceTrackingRow) {

                                    if (err) {
                                        console.log('ERROR: Device tracking unable to fetch' + err);
                                    } else {

                                        var userId = (deviceTrackingRow != null) ? (deviceTrackingRow.status != 'LOGOUT') ? deviceTrackingRow.userId : "" : "";

                                        var deviceObject = {
                                            'deviceId': element.deviceId,
                                            'deviceName': element.deviceName,
                                            'userId': userId
                                        };

                                        deviceObjectArray.push(deviceObject);

                                        callbackDone2();
                                    }
                                });
                            } else {

                                callbackDone2();
                            }


                        }, function (err) {

                            if (err) {

                                console.log('Error4' + err);
                            } else {

                                finalPickSubListRow.resourceAssigned = deviceObjectArray;
                                callbackDone();
                            }
                        });
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('4', finalInwardListArray);
                    }
                });
            });

            // Get username if userId is not null
            flowController.on('4', function (finalInwardListArray) {

                (consoleLog) ? console.log('4') : '';

                async.eachSeries(finalInwardListArray, function (finalPickSubListRow, callbackDone) {

                    var resourceAssigned = finalPickSubListRow.resourceAssigned;

                    if (resourceAssigned.length <= 0) {

                        callbackDone();

                    } else {
                        deviceObjectArray = [];

                        async.eachSeries(resourceAssigned, function (element, callbackDone2) {

                            if (element.userId == "") {

                                callbackDone2();
                            } else {

                                usersModel.findOne({'_id': element.userId, 'activeStatus': 1}, function (err, userRow) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        element.userName = userRow.firstName + ' ' + userRow.lastName;

                                        deviceObjectArray.push(element);

                                        callbackDone2();
                                    }
                                });
                            }
                        }, function (err) {

                            if (err) {

                                console.log('Error4' + err);
                            } else {

                                finalPickSubListRow.resourceAssigned = deviceObjectArray;
                                callbackDone();
                            }
                        });
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('5', finalInwardListArray);
                    }
                });
            });

            // Move to end
            flowController.on('5', function (finalInwardListArray) {

                (consoleLog) ? console.log('5') : '';

                flowController.emit('END', finalInwardListArray);
            });

            // End
            flowController.on('END', function (result) {

                res.json({message: "Operation Successful.", data: result, 'status': 'success', 'statusCode': 200});
            });

            // ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-READ',
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

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Create Picklist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/create/inwardList/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var createdBy = req.body.createdBy.trim();

            var date = moment(new Date()).format('DD/MM/YY');
            var consoleLog = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';
                var newInwardSubList = new inwardListModel();

                var inwardListName = 'INW' + moment(new Date()).format('DDMM') + '0001';

                inwardListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, inwardListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRow != null) {

                        newInwardSubListName = MagicIncrement.inc(inwardListRow.name);
                        newInwardSubListSequence = MagicIncrement.inc(inwardListRow.sequence);
                        newInwardSubList.warehouseId = warehouseId;
                        newInwardSubList.name = newInwardSubListName;
                        newInwardSubList.sequence = newInwardSubListSequence;
                        newInwardSubList.hopperPriority = 2;
                        newInwardSubList.date = date;
                        newInwardSubList.createdBy = createdBy;
                        newInwardSubList.timeCreated = timeInInteger;

                        newInwardSubList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOG', newInwardSubListName, newInwardSubListSequence);
                                flowController.emit('END', {message: "New Pick-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                            }
                        });
                    } else {
                        if (inwardListRow == null) {

                            newInwardSubList.warehouseId = warehouseId;
                            newInwardSubList.name = inwardListName;
                            newInwardSubList.date = date;
                            newInwardSubList.sequence = 1;
                            newInwardSubList.hopperPriority = 2;
                            newInwardSubList.createdBy = createdBy;
                            newInwardSubList.timeCreated = timeInInteger;
                            newInwardSubList.save(function (err, insertedRecordDetails) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('LOG', inwardListName, 1);
                                    flowController.emit('END', {message: "New Pick-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                                }
                            });
                        }
                    }
                });
            });
            //
            //
            flowController.on('LOG', function (inwardListName, newInwardSubListSequence) {

                usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathInwardList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PICKLIST' + ',' + username + ',' + inwardListName + ',' + newInwardSubListSequence + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file in log');
                            }
                        });
                    }
                });
            });
            //
            // END
            flowController.on('END', function (result) {

                res.json(result);
            });
            //
            // ERROR
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-CREATE',
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
            // START
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Update order number to inwardList
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/updateOrderNumber/inwardLists/')

        .patch(function (req, res) {

            consoleVar = 0;
            (consoleVar) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var inwardListId = req.body.inwardListId.trim();
            var materialHandlingUnit = (req.body.hasOwnProperty('materialHandlingUnit')) ? req.body.materialHandlingUnit : [];
            var listType = req.body.listType.trim().toUpperCase();
            var orderNumber = req.body.orderNumber.trim();
            var hopperPriority = req.body.hopperPriority.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();
            //
            // Get item master details based on inputs & forward to next flow
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                inwardListModel.findOne({'_id': inwardListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, inwardListRowUpdate) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRowUpdate == null) {

                        flowController.emit('ERROR', {message: 'Data missing! Picklist records tampered/removed from system.', status: 'error', statusCode: '304'});
                    } else {

                        inwardSubListModel.count({'inwardListId': inwardListId, 'activeStatus': 1}, function (err, inwardSubListCount) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                inwardListName = inwardListRowUpdate.name;
                                var query = {'_id': inwardListId};
                                var update;

                                if (inwardListRowUpdate.mergedInwardLists.length != 0) {

                                    update = {'$set': {'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};
                                } else if (inwardSubListCount == 0 && inwardListRowUpdate.materialHandlingUnit.length == 0) {

                                    update = {'$set': {'orderNumber': orderNumber, 'materialHandlingUnit': materialHandlingUnit, 'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};

                                } else {

                                    update = {'$set': {'orderNumber': orderNumber, 'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};
                                }
                                inwardListModel.update(query, update, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('1', inwardListName);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //update
            flowController.on('1', function (inwardListName) {

                (consoleVar) ? console.log('1') : '';

                inwardSubListModel.count({'inwardListId': inwardListId, 'activeStatus': 1}, function (err, inwardSubListCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListCount == 0) {

                        flowController.emit('LOG', inwardListName);
                        flowController.emit('END', {message: 'Pick List Update into System!', status: 'success', statusCode: 201});
                    } else {

                        inwardSubListModel.find({'inwardListId': inwardListId, 'assignedBy': {$exists: false}, 'activeStatus': 1}, function (err, inwardListSubRowUpdate) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (inwardListSubRowUpdate.length == 0) {

                                flowController.emit('ERROR', {message: 'Data missing! PickSubList records tampered/removed from system.', status: 'error', statusCode: '304'});
                            } else {

                                var query = {'inwardListId': inwardListId};
                                var update = {'$set': {'orderNumber': orderNumber, 'hopperPriority': hopperPriority}};

                                inwardSubListModel.update(query, update, {multi: true},
                                        function (err) {

                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('LOG', inwardListName);
                                                flowController.emit('END', {message: 'Pick List And Pick Sub List  Update into system!', status: 'success', statusCode: 201});
                                            }
                                        }); //end update
                            }
                        });
                    }
                });
            });

            flowController.on('LOG', function (inwardListName) {

                (consoleVar) ? console.log('LOG') : '';
                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathInwardList, '\n' + 'WEB' + ',' + 'UPDATE' + ',' + 'PICKLIST' + ',' + username + ',' + inwardListName + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                            if (err) {
                                // append failed
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                console.log('append file in log');
                            }
                        });
                    }
                });
            });
            // End
            flowController.on('END', function (result) {

                res.json(result);
            });
            // Error Handling
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-ODER-UPDATE',
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
            // Initializer
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Merge Picklist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/update/merge-inwardLists/')

        .patch(function (req, res) {
            var consoleVar = 0;
            (consoleVar) ? console.log(req.body) : '';

            var warehouseId = req.body.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var inwardListIdArray = req.body.hasOwnProperty('inwardListIdArray') ? req.body.inwardListIdArray : [];
            var baseUrl = req.body.baseUrl.trim(); //'http://localhost:2000/avancer';

            var createdBy = req.body.createdBy.trim();
            var arrInwardList = [];
            var date = moment(new Date()).format('DD/MM/YY');

            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                var mergeInwardList_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(inwardListIdArray, function (element, callback) {

                        inwardListModel.findOne({'_id': element, 'date': date, 'status': 1, 'activeStatus': 1}, function (err, inwardListRow) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (inwardListRow == null) {

                                callback({message: 'Merge not allowed! Only unassigned Picklist\'s can be merged.', status: 'error', statusCode: '304'});
                            } else {

                                arrInwardList.push({inwardListId: String(inwardListRow._id), orderNumber: inwardListRow.orderNumber});
                                setImmediate(callback);
                            }
                        });
                    }, function (err) {

                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {

                            resolve(arrInwardList);
                        }
                    });
                });
                mergeInwardList_promise.then(function (promise1_resolvedData) {

                    flowController.emit('1', promise1_resolvedData);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    res.json(exception);
                });
            });
            //
            //
            flowController.on('1', function (inwardListIdData) {
                (consoleVar) ? console.log('1') : '';

                var pickSubArr = [];

                var iteration = function (element, callbackDone) {

                    inwardSubListModel.find({'inwardListId': element.inwardListId, 'activeStatus': 1}, function (err, inwardSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (inwardSubListRow.length == 0) {

                            flowController.emit('ERROR', {message: 'Can not merage Blank InwardList In this Operation .', status: 'error', statusCode: '304'});
                        } else {

                            async.eachSeries(inwardSubListRow, function (element, callback) {

                                pickSubArr.push(String(element._id));
                                setImmediate(callback);
                            }, function (err) {

                                if (err) {

                                    callbackDone(err);
                                } else {

                                    setTimeout(function () {

                                        setImmediate(callbackDone);
                                    }, 100);
                                }
                            });
                        }
                    });
                };
                async.eachSeries(inwardListIdData, iteration, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('2', inwardListIdData, pickSubArr);
                    }
                });
            });
            //
            //
            flowController.on('2', function (inwardListIdData, inwardSubListIdData) {

                (consoleVar) ? console.log('2') : '';

                var requestifyUrl = baseUrl + '/v1/processMaster/web/inwardList/configuration/create/inwardList/';
                requestify.post(requestifyUrl, {warehouseId: warehouseId, createdBy: createdBy}).then(function (response) {

                    var result = response.getBody();
                    if (result.status === 'success') {

                        flowController.emit('3', inwardListIdData, inwardSubListIdData, result.data);
                    }
                    if (result.status === 'error') {

                        flowController.emit('ERROR', {message: 'Unable to create pick-sublist! Try again later.', status: 'error', statusCode: '304'});
                    }
                });
            });
            //
            //
            flowController.on('3', function (inwardListIdData, inwardSubListIdData, newInwardSubList) {
                (consoleVar) ? console.log('3') : '';

                var mergeStatus_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(inwardListIdData, function (element, callback) {

                        inwardListModel.update({'_id': element.inwardListId}, {'$set': {'activeStatus': 3}},
                                function (err) {

                                    if (err) {
                                        // error while adding records
                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        inwardSubListModel.update({'inwardListId': element.inwardListId}, {'$set': {'inwardListId': newInwardSubList}}, {multi: true},
                                                function (err) {

                                                    if (err) {
                                                        // error while adding records
                                                        callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                    } else {

                                                        setImmediate(callback);
                                                    }
                                                });
                                    }
                                });
                    }, function (err) {

                        if (err) {

                            reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            resolve();
                        }
                    });
                });
                mergeStatus_promise.then(function (promise1_resolvedData) {

                    flowController.emit('4', inwardListIdData, inwardSubListIdData, newInwardSubList);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    res.json(exception);
                });
            });
            //
            //
            flowController.on('4', function (inwardListIdData, inwardSubListIdData, newInwardSubList) {
                (consoleVar) ? console.log('4') : '';

                async.eachSeries(inwardListIdData, function (element, callbackDone) {

                    if (element.orderNumber.length == 0) {

                        var query = {'_id': newInwardSubList};
                        var update = {'$addToSet': {'mergedInwardLists': element.inwardListId}};
                        inwardListModel.update(query, update,
                                function (err) {
                                    if (err) {
                                        // error while adding records
                                        callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        callbackDone();

                                    }
                                });
                    } else {

                        async.eachSeries(element.orderNumber, function (element1, callbackDone1) {

                            var query = {'_id': newInwardSubList};
                            var update = {'$addToSet': {'mergedInwardLists': element.inwardListId, orderNumber: element1}};

                            inwardListModel.update(query, update,
                                    function (err) {
                                        if (err) {
                                            // error while adding records
                                            callbackDone1({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            callbackDone1();

                                        }
                                    });
                        }, function (err) {
                            if (err) {

                                callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                callbackDone();
                            }
                        });
                    }
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(inwardSubListIdData, function (element, callbackDone) {

                            inwardListModel.update({'_id': newInwardSubList}, {'$addToSet': {'inwardSubLists': element}},
                                    function (err) {
                                        if (err) {
                                            // error while adding records
                                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            callbackDone();
                                        }
                                    });
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('5', newInwardSubList);
                            }
                        });
                    }
                });
            });
            //
            // Update final sequence
            flowController.on('5', function (newInwardSubList) {

                (consoleVar) ? console.log('5') : '';

                inwardSubListModel.find({'inwardListId': newInwardSubList, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, inwardSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Data missing! InwardList records tampered/removed from system.', status: 'error', statusCode: '304'});
                    } else {

                        var count = 0;

                        async.eachSeries(inwardSubListRow, function (element, callbackDone) {
                            count++;
                            var query = {'_id': element._id, 'activeStatus': 1};
                            var update = {'$set': {'sequence': count}};

                            inwardSubListModel.update(query, update, function (err) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    callbackDone();
                                }
                            });
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                            } else {

                                flowController.emit('END');
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('END', function () {

                (consoleVar) ? console.log('END') : '';

                result = {message: 'Picklists merged into the system.', status: 'success', statusCode: '200'};
                res.json(result);
            });
            //
            //
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-MERGED',
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
// Picklist dashboard headers
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/configuration/get/inwardListHeader/:warehouseId/')

        .get(function (req, res) {
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.params.warehouseId.trim();
            var arrHeader = [];

            var flowController = new EventEmitter();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            flowController.on('START', function () {
                console.log('START');
                warehouseMasterModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('error', {message: 'warehouse data remove from system!!', status: 'error', statusCode: '404'});
                    } else {

                        var endTime;
                        var startTime;

                        var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
                        var startTimeIn = moment.unix(timeInInteger).format("HH:mm");
                        var endTimeIn = warehouseRow.autoBackLogTimeHours + ':' + warehouseRow.autoBackLogTimeMinutes;

                        var currentTime = moment(startTimeIn, 'h:mm');
                        var dayEndTime = moment(endTimeIn, 'h:mm');

                        if (currentTime.isBefore(dayEndTime)) {
                            var date1 = moment(new Date()).format('YYYY-MM-DD');
                            timestamp = moment(date1).unix();
                            endTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                            startTime = parseInt(endTime) - 86400;
                        } else {
                            var date1 = moment(new Date()).format('YYYY-MM-DD');
                            timestamp = moment(date1).unix();
                            startTime = parseInt(timestamp) + parseInt(warehouseRow.autoBackLogTimeHours) * 60 * 60 + parseInt(warehouseRow.autoBackLogTimeMinutes) * 60;
                            endTime = parseInt(startTime) + 86400;
                        }

                        flowController.emit('1', startTime, endTime);
                    }
                });
            });
            //pickRate
            flowController.on('1', function (startTime, endTime) {
                console.log('1');

                inwardListModel.find({'warehouseId': warehouseId, 'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, inwardListRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRow.length == 0) {

                        flowController.emit('2', startTime, endTime, 0, 0);
                        // flowController.emit('error', {message: 'inwardList data remove from system!!', status: 'error', statusCode: '404'});
                    } else {

                        var deviceIdArr = [];
                        async.waterfall([

                            function (waterfallcallback) {

                                async.eachSeries(inwardListRow, function (element, callback) {

                                    if (element.resourceAssigned.length == 0) {

                                        callback();
                                    } else {

                                        deviceId = element.resourceAssigned[0].deviceId;
                                        deviceIdArr.push(deviceId);
                                        callback();
                                    }
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deviceIdArr);
                                    }
                                });
                            },
                            function (deviceIdArr, waterfallcallback) {

                                inwardSubListModel.count({'timeEnded': {'$gte': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                    } else {

                                        var finalPickRate = round10((pickDoneCount / ((timeInInteger - startTime) / 3600)), -2);
                                        waterfallcallback(null, deviceIdArr, finalPickRate);
                                    }
                                });
                            }
                        ], function (err, deviceIdArr, finalPickRate) {
                            // result now equals 'done'
                            if (err) {

                            } else {

                                flowController.emit('2.1', startTime, endTime, deviceIdArr, finalPickRate);
                            }

                        });
                    }
                });
            });
            //deviceCount
            flowController.on('2.1', function (startTime, endTime, deviceIdArr, finalPickRate) {

                var deviceCount = 0;
                uniqueArray = deviceIdArr.filter(function (elem, pos) {
                    return deviceIdArr.indexOf(elem) == pos;
                });
                async.eachSeries(uniqueArray, function (element, callback) {

                    deviceTrackingModel.findOne({deviceId: element, 'timeCreated': {$gt: startTime, $lt: endTime}, 'status': 'LOGIN', 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, DeviceTrackRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (DeviceTrackRow == null) {

                            callback();
                        } else {

                            deviceCount++;
                            callback();
                        }
                    });
                }, function (err) {
                    if (err) {

                    } else {

                        flowController.emit('2', startTime, endTime, deviceCount, finalPickRate);
                    }
                });
            });
            //pick List Header
            flowController.on('2', function (startTime, endTime, deviceCount, finalPickRate) {

                console.log('2');

                async.waterfall([
                    //pickTotalCreated current day
                    function (waterfallcallback) {

                        inwardListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, pickTotalCreated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated);
                            }
                        });
                    },
                    //pickUnassigned total
                    function (pickTotalCreated, waterfallcallback) {

                        inwardListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 1}, function (err, pickUnassigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned);
                            }
                        });
                    },
                    //pickAssigned total
                    function (pickTotalCreated, pickUnassigned, waterfallcallback) {

                        inwardListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 21}, function (err, pickAssigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned);
                            }
                        });
                    },
                    //pickDone current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, waterfallcallback) { //Done

                        inwardListModel.count({'warehouseId': warehouseId, 'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone);
                            }
                        });
                    },
                    //pickActivited total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, waterfallcallback) { //Activited

                        inwardListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 11}, function (err, pickActivited) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited);
                            }
                        });
                    },
                    //pickSubCreated current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, waterfallcallback) {

                        inwardSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, pickSubCreated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated);
                            }
                        });
                    },
                    //pickSubDone current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, waterfallcallback) {

                        inwardSubListModel.count({'timeEnded': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickSubDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone);
                            }
                        });
                    },
                    //pickSubAssigned total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 21}, function (err, pickSubAssigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned);
                            }
                        });
                    },
                    //pickSubSkipped total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 33}, function (err, pickSubSkipped) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped);
                            }
                        });
                    },
                    //pickSubUnassigned total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 1}, function (err, pickSubUnassigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned);
                            }
                        });
                    },
                    //pickSubWithdrawn
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 5}, function (err, pickSubWithdrawn) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn);
                            }
                        });
                    },
                    //pickSubActivated
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 11}, function (err, pickSubActivated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated);
                            }
                        });
                    },
                    //pickSubInprogress
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 25}, function (err, pickSubInprogress) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress);
                            }
                        });
                    },
                    //pickSubPendingfordrop
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, waterfallcallback) {

                        inwardSubListModel.count({'activeStatus': 1, 'status': 27}, function (err, pickSubPendingfordrop) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop);
                            }
                        });
                    },
                    //pickSubDoneSkipped  
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, waterfallcallback) {

                        inwardSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 35}, function (err, pickSubDoneSkipped) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped);
                            }
                        });
                    },
                    //pickSubDonePartial    
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, waterfallcallback) {

                        inwardSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 37}, function (err, pickSubDonePartial) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial);
                            }
                        });
                    },
                    //pickSubbackLog   
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, waterfallcallback) {

                        inwardSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 41}, function (err, pickSubbackLog) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog);
                            }
                        });
                    },
                    //5 - Withdrawn 
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, waterfallcallback) {

                        inwardListModel.count({'activeStatus': 1, 'status': 5}, function (err, pickWithdrawn) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null,
                                        pickTotalCreated, pickUnassigned, pickAssigned, pickDone,
                                        pickActivited, pickSubCreated,
                                        pickSubDone, pickSubAssigned, pickSubSkipped,
                                        pickSubUnassigned, pickSubWithdrawn, pickSubActivated,
                                        pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped,
                                        pickSubDonePartial, pickSubbackLog, pickWithdrawn);
                            }
                        });
                    },
                    //25 - Inprogress 
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, pickWithdrawn, waterfallcallback) {

                        inwardListModel.count({'activeStatus': 1, 'status': 25}, function (err, pickInprogress) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null,
                                        pickTotalCreated, pickUnassigned, pickAssigned, pickDone,
                                        pickActivited, pickSubCreated,
                                        pickSubDone, pickSubAssigned, pickSubSkipped,
                                        pickSubUnassigned, pickSubWithdrawn, pickSubActivated,
                                        pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped,
                                        pickSubDonePartial, pickSubbackLog, pickWithdrawn, pickInprogress);
                            }
                        });
                    },
                    //35 - DoneSkipped 
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, pickWithdrawn, pickInprogress, waterfallcallback) {

                        inwardListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 35}, function (err, pickDoneSkipped) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null,
                                        pickTotalCreated, pickUnassigned, pickAssigned, pickDone,
                                        pickActivited, pickSubCreated,
                                        pickSubDone, pickSubAssigned, pickSubSkipped,
                                        pickSubUnassigned, pickSubWithdrawn, pickSubActivated,
                                        pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped,
                                        pickSubDonePartial, pickSubbackLog, pickWithdrawn, pickInprogress, pickDoneSkipped);
                            }
                        });
                    },

                    //41 – Backlog  
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, pickWithdrawn, pickInprogress, pickDoneSkipped, waterfallcallback) {

                        inwardListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 41}, function (err, pickBacklog) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null,
                                        pickTotalCreated, pickUnassigned, pickAssigned, pickDone,
                                        pickActivited, pickSubCreated,
                                        pickSubDone, pickSubAssigned, pickSubSkipped,
                                        pickSubUnassigned, pickSubWithdrawn, pickSubActivated,
                                        pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped,
                                        pickSubDonePartial, pickSubbackLog, pickWithdrawn, pickInprogress, pickDoneSkipped, pickBacklog);
                            }
                        });
                    },
                    //result
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated,
                            pickSubDone, pickSubAssigned, pickSubSkipped,
                            pickSubUnassigned, pickSubWithdrawn,
                            pickSubActivated, pickSubInprogress, pickSubPendingfordrop,
                            pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, pickWithdrawn,
                            pickInprogress, pickDoneSkipped, pickBacklog, waterfallcallback) {

                        var inwardListCreated = {

                            inwardListCreated: pickTotalCreated,
                            inwardListUnassigned: pickUnassigned,
                            inwardListAssigned: pickAssigned,
                            inwardListDone: pickDone,
                            inwardListActivated: pickActivited,
                            pickWithdrawn: pickWithdrawn,
                            pickInprogress: pickInprogress,
                            pickDoneSkipped: pickDoneSkipped,
                            pickBacklog: pickBacklog,
                            //pickSublist
                            lineItemsCreated: pickSubCreated,
                            pickSubUnassigned: pickSubUnassigned, //1
                            pickSubActivated: pickSubActivated, //11
                            pickSubWithdrawn: pickSubWithdrawn, //5
                            inwardSubListPending: pickSubAssigned, //21
                            pickSubInprogress: pickSubInprogress,
                            pickSubPendingfordrop: pickSubPendingfordrop,
                            pickSubDoneSkipped: pickSubDoneSkipped,
                            pickSubDonePartial: pickSubDonePartial,
                            inwardSubListDone: pickSubDone, //31
                            inwardListSkipped: pickSubSkipped, //33
                            pickSubbackLog: pickSubbackLog,
                            //deviceCount
                            averageResourse: deviceCount,
                            averagePickrate: finalPickRate
                        };
                        arrHeader.push(inwardListCreated);
                        waterfallcallback(null, arrHeader);
                    }

                ], function (err, result) {
                    // result now equals 'done'
                    if (err) {

                    } else {

                        flowController.emit('end');
                    }
                });
            });
            //
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-HEADER',
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
            flowController.on('end', function () {

                res.json({data: arrHeader, message: 'Operation Successful', status: 'success', statusCode: 304});
            });
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Picklist activation
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/inwardList/action/update-status/activate/')
        //
        .patch(function (req, res) {

            var dataObject = req.body;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            inwardListService.updateStatusToInActivate(dataObject, function (err, response) {
                if (err) {

                    logger.error(err.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                    var dataObject = {
                        MODULE: 'PICK-LIST-ACTIVATED',
                        ERRORMESSAGE: err.message
                    };
                    errorLogService.createErrorLog(dataObject, function (err, response) {
                        if (err) {
                            console.log('Entered error ');
                        } else {
                            console.log('Entered success ');
                        }
                    });
                    res.json(err);
                } else {

                    io = req.app.get('io');
                    console.log('+++++++++++++++++++++++++++++++++++++ Picklist Socket Emit Start ++++++++++++++++++++++++++++');
                    io.sockets.emit('inwardList', '#inwardList');
                    console.log('+++++++++++++++++++++++++++++++++++++ Picklist Socket Emit End ++++++++++++++++++++++++++++++');
                    res.json(response);
                }
            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update inwardList status to  pending-backlog at day-end
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/inwardList/action/update-status/pending-backlog/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            var warehouseId = req.body.warehouseId.trim();
            var backloggedBy = req.body.backloggedBy.trim();

            flowController.on('START', function () {
                // Get all lists other than those done and those backlogged previously
                inwardListModel.find({'warehouseId': warehouseId, 'status': {'$ne': 31}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}, function (err, inwardListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (inwardListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No list available for processing at day end!', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1', inwardListRow);
                    }
                });
            });
            //
            //
            flowController.on('1', function (inwardListRow) {

                var inProcessPicklistId = [];
                var inProcessPicklists = [];
                async.eachSeries(inwardListRow, function (element, callback) {

                    inwardSubListModel.find({'inwardListId': element._id, 'activeStatus': 1}, function (err, inwardSubListRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (inwardSubListRow.length == 0) {

                            setImmediate(callback);
                        } else {

                            var inProcessPickSublist = [];
                            async.eachSeries(inwardSubListRow, function (element2, callback2) {

                                var pickSibListId = element2._id;
                                if (element2.status === 31) { // done

                                    setImmediate(callback2);
                                } else if (element2.status === 27) { // pending for drop

                                    inProcessPickSublist.push(element2.name);
                                    setImmediate(callback2);
                                } else if (element2.status === 25) { // In progress

                                    inProcessPickSublist.push(element2.name);
                                    setImmediate(callback2);
                                } else {

                                    inwardSubListModel.update({'_id': pickSibListId}, {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
                                            function (err) {
                                                if (err) {

                                                    callback2(err);
                                                } else {

                                                    setImmediate(callback2);
                                                }
                                            });
                                }
                            }, function (err) {

                                if (err) {

                                    callback(err);
                                } else {

                                    if (inProcessPickSublist.length == 0) {

                                        setImmediate(callback);
                                    } else {

                                        var temp = {};
                                        temp.inwardList = element.name;
                                        inProcessPicklists.push(temp);
                                        inProcessPicklistId.push(String(element._id));
                                        setImmediate(callback);
                                    }
                                }
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('2', inwardListRow, inProcessPicklistId, inProcessPicklists);
                    }
                });
            });
            //
            //
            flowController.on('2', function (inwardListRow, inProcessPicklistId, inProcessPicklists) {

                async.eachSeries(inwardListRow, function (element, callback) {

                    var inwardListId = String(element._id);
                    if (inProcessPicklistId.indexOf(inwardListId) != -1) {

                        setImmediate(callback);
                    } else {

                        inwardListModel.update({'_id': element._id}, {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
                                function (err) {
                                    if (err) {

                                        callback(err);
                                    } else {

                                        setImmediate(callback);
                                    }
                                });
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', inProcessPicklists);
                    }
                });
            });
            //
            //
            flowController.on('END', function (inProcessPicklists) {

                if (inProcessPicklists.length != 0) {
                    var result = {message: 'Day end process completed! However some inwardList line items are In Progress/Pending for drop.', status: 'success', data: inProcessPicklists, statusCode: '200'};
                } else {
                    var result = {message: 'Day end process completed!', status: 'success', data: [], statusCode: '200'};
                }
                res.json(result);
            });
            //
            //
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PICK-LIST-PENDING-BACKLOG',
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
module.exports = router;