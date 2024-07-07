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
var pathPickList = './logs/dailyLog/pickListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var deviceAreaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
var function_locationMaster = require('../../../functionSet/function-locationMaster.js');
//---------------------------------------------------------------------------------------------------------------------------
var pickListService = require('../../../service-factory/pickListService');
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
// GET Picklist 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/read/pickList/:warehouseId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.body) : '';

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                pickListModel.find({'warehouseId': warehouseId, 'status': {'$ne': 31}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}).sort({'sequence': 1}).exec(function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No Pick-List available for the shift/day!', data: [], status: 'error', statusCode: '404'});
                    } else {

                        var pickListArray = [];

                        async.eachSeries(pickListRow, function (element, callback) {

                            var picklist_data = {
                                pickListId: element._id,
                                name: element.name,
                                status: element.status,
                                priority: (element.hopperPriority == 1) ? 'HIGH' : 'NORMAL',
                                sequence: element.sequence,
                                orderNumber: element.orderNumber,
                                resourceAssigned: element.resourceAssigned,
                                assignedBy: element.hasOwnProperty('resourceAssigned') ? element.resourceAssigned : "",
                                pickRate: element.hasOwnProperty('pickRate') ? element.pickRate : ""
                            };

                            pickListArray.push(picklist_data);

                            setImmediate(callback);

                        }, function (err) {
                            if (err) {

                                console.log('Error1');
                            } else {
                                flowController.emit('1', pickListArray);
                            }
                        });
                    }
                });
            });

            // 
            flowController.on('1', function (pickListArray) {

                (consoleLog) ? console.log('1') : '';

                var finalPickListArray = [];

                async.eachSeries(pickListArray, function (element, callback) {

                    pickSubListModel.count({'pickListId': element.pickListId, 'activeStatus': 1}, function (err, pickSubListCount) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            element.lineItem = pickSubListCount;

                            finalPickListArray.push(element);

                            setImmediate(callback);
                        }
                    });

                }, function (err) {
                    if (err) {

                        console.log('Error2');
                    } else {
                        flowController.emit('2', finalPickListArray);
                    }
                });
            });

            // Filter and get only device Id in array
            flowController.on('2', function (finalPickListArray) {

                (consoleLog) ? console.log('2') : '';

                async.eachSeries(finalPickListArray, function (element, callback) {

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
                        flowController.emit('3', finalPickListArray);
                    }
                });
            });

            // Get users online on device
            flowController.on('3', function (finalPickListArray) {

                (consoleLog) ? console.log('3') : '';

                async.eachSeries(finalPickListArray, function (finalPickSubListRow, callbackDone) {

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

                        flowController.emit('4', finalPickListArray);
                    }
                });
            });

            // Get username if userId is not null
            flowController.on('4', function (finalPickListArray) {

                (consoleLog) ? console.log('4') : '';

                async.eachSeries(finalPickListArray, function (finalPickSubListRow, callbackDone) {

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

                        flowController.emit('5', finalPickListArray);
                    }
                });
            });

            // Move to end
            flowController.on('5', function (finalPickListArray) {

                (consoleLog) ? console.log('5') : '';

                flowController.emit('END', finalPickListArray);
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
router.route('/v1/processMaster/web/pickList/configuration/create/pickList/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var createdBy = req.body.createdBy.trim();

            var date = moment(new Date()).format('DD/MM/YY');
            var consoleLog = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';
                var newPickList = new pickListModel();

                var pickListName = 'PIK' + moment(new Date()).format('DDMM') + '0001';

                pickListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow != null) {

                        newPickListName = MagicIncrement.inc(pickListRow.name);
                        newPickListSequence = MagicIncrement.inc(pickListRow.sequence);
                        newPickList.warehouseId = warehouseId;
                        newPickList.name = newPickListName;
                        newPickList.sequence = newPickListSequence;
                        newPickList.hopperPriority = 2;
                        newPickList.date = date;
                        newPickList.createdBy = createdBy;
                        newPickList.timeCreated = timeInInteger;

                        newPickList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOG', newPickListName, newPickListSequence);
                                flowController.emit('END', {message: "New Pick-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                            }
                        });
                    } else {
                        if (pickListRow == null) {

                            newPickList.warehouseId = warehouseId;
                            newPickList.name = pickListName;
                            newPickList.date = date;
                            newPickList.sequence = 1;
                            newPickList.hopperPriority = 2;
                            newPickList.createdBy = createdBy;
                            newPickList.timeCreated = timeInInteger;
                            newPickList.save(function (err, insertedRecordDetails) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('LOG', pickListName, 1);
                                    flowController.emit('END', {message: "New Pick-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                                }
                            });
                        }
                    }
                });
            });
            //
            //
            flowController.on('LOG', function (pickListName, newPickListSequence) {

                usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathPickList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PICKLIST' + ',' + username + ',' + pickListName + ',' + newPickListSequence + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
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
// Update order number to picklist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/updateOrderNumber/pickLists/')

        .patch(function (req, res) {

            consoleVar = 1;
            (consoleVar) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var warehouseId = req.body.warehouseId.trim();
            var pickListId = req.body.pickListId.trim();
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

                pickListModel.findOne({'_id': pickListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, pickListRowUpdate) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRowUpdate == null) {

                        flowController.emit('ERROR', {message: 'Data missing! Picklist records tampered/removed from system.', status: 'error', statusCode: '304'});
                    } else {

                        pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListCount) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                var orderNumberArray = [];
                                if (orderNumber)
                                    orderNumberArray.push(orderNumber);

                                pickListName = pickListRowUpdate.name;
                                var query = {'_id': pickListId};
                                var update;

                                if (pickListRowUpdate.mergedPickLists.length != 0) {

                                    update = {'$set': {'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};
                                } else if (pickSubListCount == 0 && pickListRowUpdate.materialHandlingUnit.length == 0) {

                                    update = {'$set': {'orderNumber': orderNumberArray, 'materialHandlingUnit': materialHandlingUnit, 'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};

                                } else {

                                    update = {'$set': {'orderNumber': orderNumberArray, 'listType': listType, 'hopperPriority': hopperPriority, 'modifiedBy': modifiedBy}};
                                }
                                pickListModel.update(query, update, function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('1', pickListName);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            //update
            flowController.on('1', function (pickListName) {

                (consoleVar) ? console.log('1') : '';

                pickSubListModel.count({'pickListId': pickListId, 'activeStatus': 1}, function (err, pickSubListCount) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListCount == 0) {

                        flowController.emit('LOG', pickListName);
                        flowController.emit('END', {message: 'Pick List Update into System!', status: 'success', statusCode: 201});
                    } else {

                        pickSubListModel.find({'pickListId': pickListId, 'assignedBy': {$exists: false}, 'activeStatus': 1}, function (err, pickListSubRowUpdate) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickListSubRowUpdate.length == 0) {

                                flowController.emit('ERROR', {message: 'Data missing! PickSubList records tampered/removed from system.', status: 'error', statusCode: '304'});
                            } else {

                                var query = {'pickListId': pickListId};
                                var update = {'$set': {'orderNumber': orderNumber, 'hopperPriority': hopperPriority}};

                                pickSubListModel.update(query, update, {multi: true},
                                        function (err) {

                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('LOG', pickListName);
                                                flowController.emit('END', {message: 'Pick List And Pick Sub List  Update into system!', status: 'success', statusCode: 201});
                                            }
                                        }); //end update
                            }
                        });
                    }
                });
            });

            flowController.on('LOG', function (pickListName) {

                (consoleVar) ? console.log('LOG') : '';
                usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userRow == null) {

                        flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                    } else {

                        username = (userRow.username) ? userRow.username : '';

                        fs.appendFile(pathPickList, '\n' + 'WEB' + ',' + 'UPDATE' + ',' + 'PICKLIST' + ',' + username + ',' + pickListName + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
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
router.route('/v1/processMaster/web/pickList/configuration/update/merge-pickLists/')

        .patch(function (req, res) {
            var consoleVar = 0;
            (consoleVar) ? console.log(req.body) : '';

            var warehouseId = req.body.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var pickListIdArray = req.body.hasOwnProperty('pickListIdArray') ? req.body.pickListIdArray : [];
            var baseUrl = req.body.baseUrl.trim(); //'http://localhost:2000/avancer';

            var createdBy = req.body.createdBy.trim();
            var arrPickList = [];
            var date = moment(new Date()).format('DD/MM/YY');

            var flowController = new EventEmitter();
            //
            flowController.on('START', function () {

                (consoleVar) ? console.log('START') : '';

                var mergePickList_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(pickListIdArray, function (element, callback) {

                        pickListModel.findOne({'_id': element,'status': 1, 'activeStatus': 1}, function (err, pickListRow) {
                            if (err) {

                                callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (pickListRow == null) {

                                callback({message: 'Merge not allowed! Only unassigned Picklist\'s can be merged.', status: 'error', statusCode: '304'});
                            } else {

                                arrPickList.push({pickListId: String(pickListRow._id), orderNumber: pickListRow.orderNumber});
                                setImmediate(callback);
                            }
                        });
                    }, function (err) {

                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {

                            resolve(arrPickList);
                        }
                    });
                });
                mergePickList_promise.then(function (promise1_resolvedData) {

                    flowController.emit('1', promise1_resolvedData);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    res.json(exception);
                });
            });
            //
            //
            flowController.on('1', function (pickListIdData) {
                (consoleVar) ? console.log('1') : '';

                var pickSubArr = [];

                var iteration = function (element, callbackDone) {

                    pickSubListModel.find({'pickListId': element.pickListId, 'activeStatus': 1}, function (err, pickSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow.length == 0) {

                            flowController.emit('ERROR', {message: 'Can not merage Blank PickList In this Operation .', status: 'error', statusCode: '304'});
                        } else {

                            async.eachSeries(pickSubListRow, function (element, callback) {

                                pickSubArr.push(String(element._id));
                                setImmediate(callback);
                            }, function (err) {

                                if (err) {

                                    callbackDone(err);
                                } else {

                                    setTimeout(function () {
                                        setImmediate(callbackDone);
                                    }, 10);
                                }
                            });
                        }
                    });
                };
                async.eachSeries(pickListIdData, iteration, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('2', pickListIdData, pickSubArr);
                    }
                });
            });
            //
            //
            flowController.on('2', function (pickListIdData, pickSubListIdData) {

                (consoleVar) ? console.log('2') : '';

                var requestifyUrl = baseUrl + '/v1/processMaster/web/pickList/configuration/create/pickList/';
                requestify.post(requestifyUrl, {warehouseId: warehouseId, createdBy: createdBy}).then(function (response) {

                    var result = response.getBody();
                    if (result.status === 'success') {

                        flowController.emit('3', pickListIdData, pickSubListIdData, result.data);
                    }
                    if (result.status === 'error') {

                        flowController.emit('ERROR', {message: 'Unable to create pick-sublist! Try again later.', status: 'error', statusCode: '304'});
                    }
                });
            });
            //
            //
            flowController.on('3', function (pickListIdData, pickSubListIdData, newPickList) {
                (consoleVar) ? console.log('3') : '';

                var mergeStatus_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(pickListIdData, function (element, callback) {

                        pickListModel.update({'_id': element.pickListId}, {'$set': {'activeStatus': 3}},
                                function (err) {

                                    if (err) {
                                        // error while adding records
                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        pickSubListModel.update({'pickListId': element.pickListId}, {'$set': {'pickListId': newPickList}}, {multi: true},
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

                    flowController.emit('4', pickListIdData, pickSubListIdData, newPickList);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    res.json(exception);
                });
            });
            //
            //
            flowController.on('4', function (pickListIdData, pickSubListIdData, newPickList) {
                (consoleVar) ? console.log('4') : '';

                async.eachSeries(pickListIdData, function (element, callbackDone) {

                    if (element.orderNumber.length == 0) {

                        var query = {'_id': newPickList};
                        var update = {'$addToSet': {'mergedPickLists': element.pickListId}};
                        pickListModel.update(query, update,
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

                            var query = {'_id': newPickList};
                            var update = {'$addToSet': {'mergedPickLists': element.pickListId, orderNumber: element1}};

                            pickListModel.update(query, update,
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

                        async.eachSeries(pickSubListIdData, function (element, callbackDone) {

                            pickListModel.update({'_id': newPickList}, {'$addToSet': {'pickSubLists': element}},
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

                                flowController.emit('5', newPickList);
                            }
                        });
                    }
                });
            });
            //
            // Update final sequence
            flowController.on('5', function (newPickList) {

                (consoleVar) ? console.log('5') : '';

                pickSubListModel.find({'pickListId': newPickList, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, pickSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickSubListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Data missing! PickList records tampered/removed from system.', status: 'error', statusCode: '304'});
                    } else {

                        var count = 0;

                        async.eachSeries(pickSubListRow, function (element, callbackDone) {
                            count++;
                            var query = {'_id': element._id, 'activeStatus': 1};
                            var update = {'$set': {'sequence': count}};

                            pickSubListModel.update(query, update, function (err) {
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
router.route('/v1/processMaster/web/pickList/configuration/get/pickListHeader/:warehouseId/')

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

                pickListModel.find({'warehouseId': warehouseId, 'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        flowController.emit('2', startTime, endTime, 0, 0);
                        // flowController.emit('error', {message: 'pickList data remove from system!!', status: 'error', statusCode: '404'});
                    } else {

                        var deviceIdArr = [];
                        async.waterfall([

                            function (waterfallcallback) {

                                async.eachSeries(pickListRow, function (element, callback) {

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

                                pickSubListModel.count({'timeEnded': {'$gte': startTime}, 'activeStatus': 1}, function (err, pickDoneCount) {

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

                        pickListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, pickTotalCreated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated);
                            }
                        });
                    },
                    //pickUnassigned total
                    function (pickTotalCreated, waterfallcallback) {

                        pickListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 1}, function (err, pickUnassigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned);
                            }
                        });
                    },
                    //pickAssigned total
                    function (pickTotalCreated, pickUnassigned, waterfallcallback) {

                        pickListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 21}, function (err, pickAssigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned);
                            }
                        });
                    },
                    //pickDone current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, waterfallcallback) { //Done

                        pickListModel.count({'warehouseId': warehouseId, 'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone);
                            }
                        });
                    },
                    //pickActivited total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, waterfallcallback) { //Activited

                        pickListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 11}, function (err, pickActivited) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited);
                            }
                        });
                    },
                    //pickSubCreated current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, waterfallcallback) {

                        pickSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, pickSubCreated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated);
                            }
                        });
                    },
                    //pickSubDone current day
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, waterfallcallback) {

                        pickSubListModel.count({'timeEnded': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, pickSubDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone);
                            }
                        });
                    },
                    //pickSubAssigned total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 21}, function (err, pickSubAssigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned);
                            }
                        });
                    },
                    //pickSubSkipped total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 33}, function (err, pickSubSkipped) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped);
                            }
                        });
                    },
                    //pickSubUnassigned total
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 1}, function (err, pickSubUnassigned) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned);
                            }
                        });
                    },
                    //pickSubWithdrawn
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 5}, function (err, pickSubWithdrawn) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn);
                            }
                        });
                    },
                    //pickSubActivated
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 11}, function (err, pickSubActivated) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated);
                            }
                        });
                    },
                    //pickSubInprogress
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 25}, function (err, pickSubInprogress) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress);
                            }
                        });
                    },
                    //pickSubPendingfordrop
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, waterfallcallback) {

                        pickSubListModel.count({'activeStatus': 1, 'status': 27}, function (err, pickSubPendingfordrop) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop);
                            }
                        });
                    },
                    //pickSubDoneSkipped  
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, waterfallcallback) {

                        pickSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 35}, function (err, pickSubDoneSkipped) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped);
                            }
                        });
                    },
                    //pickSubDonePartial    
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, waterfallcallback) {

                        pickSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 37}, function (err, pickSubDonePartial) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial);
                            }
                        });
                    },
                    //pickSubbackLog   
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, waterfallcallback) {

                        pickSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 41}, function (err, pickSubbackLog) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog);
                            }
                        });
                    },
                    //5 - Withdrawn 
                    function (pickTotalCreated, pickUnassigned, pickAssigned, pickDone, pickActivited, pickSubCreated, pickSubDone, pickSubAssigned, pickSubSkipped, pickSubUnassigned, pickSubWithdrawn, pickSubActivated, pickSubInprogress, pickSubPendingfordrop, pickSubDoneSkipped, pickSubDonePartial, pickSubbackLog, waterfallcallback) {

                        pickListModel.count({'activeStatus': 1, 'status': 5}, function (err, pickWithdrawn) {
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

                        pickListModel.count({'activeStatus': 1, 'status': 25}, function (err, pickInprogress) {
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

                        pickListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 35}, function (err, pickDoneSkipped) {
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

                        pickListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 41}, function (err, pickBacklog) {
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

                        var pickListCreated = {

                            pickListCreated: pickTotalCreated,
                            pickListUnassigned: pickUnassigned,
                            pickListAssigned: pickAssigned,
                            pickListDone: pickDone,
                            pickListActivated: pickActivited,
                            pickWithdrawn: pickWithdrawn,
                            pickInprogress: pickInprogress,
                            pickDoneSkipped: pickDoneSkipped,
                            pickBacklog: pickBacklog,
                            //pickSublist
                            lineItemsCreated: pickSubCreated,
                            pickSubUnassigned: pickSubUnassigned, //1
                            pickSubActivated: pickSubActivated, //11
                            pickSubWithdrawn: pickSubWithdrawn, //5
                            pickSubListPending: pickSubAssigned, //21
                            pickSubInprogress: pickSubInprogress,
                            pickSubPendingfordrop: pickSubPendingfordrop,
                            pickSubDoneSkipped: pickSubDoneSkipped,
                            pickSubDonePartial: pickSubDonePartial,
                            pickSubListDone: pickSubDone, //31
                            pickListSkipped: pickSubSkipped, //33
                            pickSubbackLog: pickSubbackLog,
                            //deviceCount
                            averageResourse: deviceCount,
                            averagePickrate: finalPickRate
                        };
                        arrHeader.push(pickListCreated);
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
router.route('/v1/processMaster/web/pickList/action/update-status/activate/')
        //
        .patch(function (req, res) {

            var dataObject = req.body;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            pickListService.updateStatusToInActivate(dataObject, function (err, response) {
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
                    io.sockets.emit('pickList', '#pickList');
                    console.log('+++++++++++++++++++++++++++++++++++++ Picklist Socket Emit End ++++++++++++++++++++++++++++++');
                    res.json(response);
                }
            });
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update picklist status to  pending-backlog at day-end
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickList/action/update-status/pending-backlog/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var flowController = new EventEmitter();
            var warehouseId = req.body.warehouseId.trim();
            var backloggedBy = req.body.backloggedBy.trim();

            flowController.on('START', function () {
                // Get all lists other than those done and those backlogged previously
                pickListModel.find({'warehouseId': warehouseId, 'status': {'$ne': 31}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}, function (err, pickListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No list available for processing at day end!', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('1', pickListRow);
                    }
                });
            });
            //
            //
            flowController.on('1', function (pickListRow) {

                var inProcessPicklistId = [];
                var inProcessPicklists = [];
                async.eachSeries(pickListRow, function (element, callback) {

                    pickSubListModel.find({'pickListId': element._id, 'activeStatus': 1}, function (err, pickSubListRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (pickSubListRow.length == 0) {

                            setImmediate(callback);
                        } else {

                            var inProcessPickSublist = [];
                            async.eachSeries(pickSubListRow, function (element2, callback2) {

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

                                    pickSubListModel.update({'_id': pickSibListId}, {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
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
                                        temp.pickList = element.name;
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

                        flowController.emit('2', pickListRow, inProcessPicklistId, inProcessPicklists);
                    }
                });
            });
            //
            //
            flowController.on('2', function (pickListRow, inProcessPicklistId, inProcessPicklists) {

                async.eachSeries(pickListRow, function (element, callback) {

                    var pickListId = String(element._id);
                    if (inProcessPicklistId.indexOf(pickListId) != -1) {

                        setImmediate(callback);
                    } else {

                        pickListModel.update({'_id': element._id}, {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
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
                    var result = {message: 'Day end process completed! However some picklist line items are In Progress/Pending for drop.', status: 'success', data: inProcessPicklists, statusCode: '200'};
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