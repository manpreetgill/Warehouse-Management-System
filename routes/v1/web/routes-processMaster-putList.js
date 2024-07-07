var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var MagicIncrement = require('magic-increment');
var requestify = require('requestify');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
var round10 = require('round10').round10;
//---------------------------------------------------------------------------------------------------------------------------
var pathPutList = './logs/dailyLog/putListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var deviceMasterModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var deviceAreaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation.js');
var deviceTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//----------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var dashboardService = require('../../../service-factory/dashboardService.js');
var logger = require('../../../logger/logger.js');
// Get all putlist details
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/read/putList/:warehouseId/')

        .get(function (req, res, next) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim();
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            //
            var flowController = new EventEmitter();
            //
            //
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                putListModel.find({'warehouseId': warehouseId, 'status': {'$ne': 31}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No Put-List for the shift/day!', status: 'error', statusCode: '404', data: []});
                    } else {

                        flowController.emit('1', putListRow);
                    }
                });
            });
            //
            //
            flowController.on('1', function (putListRow) {

                (consoleLog) ? console.log('1') : '';

                var putListArray = [];

                async.eachSeries(putListRow, function (element, callback) {

                    putSubListModel.count({'putListId': element._id, 'activeStatus': 1}, function (err, totalcount) {

                        var putlist_data = {
                            id: element._id,
                            name: element.name,
                            status: element.status,
                            deviceName: (element.resourceAssigned.length != 0) ? element.resourceAssigned[0].deviceId : '',
                            userName: (element.assignedTo) ? element.assignedTo : '',
                            putRate: (element.pickRate) ? element.pickRate : '',
                            sequence: element.sequence,
                            lineItem: totalcount,
                            orderNumber: element.orderNumber
                        };

                        putListArray.push(putlist_data);
                        setImmediate(callback);
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', putListArray);//{message: "Operation Successful.", data: putListArray, status: 'success', statusCode: '200'});
                    }
                });
            });
            //
            //
            flowController.on('2', function (putListArray) {

                (consoleLog) ? console.log('2') : '';

                finalArray = [];

                async.eachSeries(putListArray, function (element, callback) {

                    if (element.userName == '') {

                        finalArray.push(element);
                        setImmediate(callback);
                    } else {

                        userModel.findOne({'_id': element.userName, 'activeStatus': 1}, function (err, userRow) {

                            var putlist_data = {
                                id: element.id,
                                name: element.name,
                                status: element.status,
                                deviceName: element.deviceName,
                                userName: (userRow == null) ? '' : userRow.firstName + ' ' + userRow.lastName,
                                putRate: element.putRate,
                                sequence: element.sequence,
                                lineItem: element.lineItem,
                                orderNumber: element.orderNumber
                            };

                            finalArray.push(putlist_data);
                            setImmediate(callback);
                        });
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', finalArray);//{message: "Operation Successful.", data: putListArray, status: 'success', statusCode: '200'});
                    }
                });
            });
            //
            //
            flowController.on('3', function (finalArray) {

                (consoleLog) ? console.log('3') : '';

                finalArray2 = [];

                async.eachSeries(finalArray, function (element, callback) {

                    if (element.deviceName == '') {

                        finalArray2.push(element);
                        setImmediate(callback);
                    } else {

                        deviceMasterModel.findOne({'_id': element.deviceName, 'activeStatus': 1}, function (err, deviceMasterRow) {
                            if (err) {

                            } else if (deviceMasterRow == null) {

                                setImmediate(callback);
                            } else {
                                var putlist_data = {
                                    id: element.id,
                                    name: element.name,
                                    status: element.status,
                                    deviceName: (deviceMasterRow.name) ? deviceMasterRow.name : '',
                                    userName: element.userName,
                                    putRate: element.putRate,
                                    sequence: element.sequence,
                                    lineItem: element.lineItem,
                                    orderNumber: element.orderNumber
                                };

                                finalArray2.push(putlist_data);
                                setImmediate(callback);
                            }
                        });
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('4', finalArray2);//
                    }
                });
            });
            //
            //
            flowController.on('4', function (finalArray2) {

                (consoleLog) ? console.log('4') : '';

                flowController.emit('END', {message: "Operation Successful.", data: finalArray2, status: 'success', statusCode: '200'});
            });
            //
            //
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });
            //
            //
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-READ',
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
// Create PutList
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/create/putList/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var createdBy = req.body.createdBy.trim();

            var date = moment(new Date()).format('DD/MM/YY');

            var consoleLog = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                var newPutList = new putListModel();

                var putListName = 'PUT' + moment(new Date()).format('DDMM') + '0001';

                putListModel.findOne({'warehouseId': warehouseId, 'date': date}).sort({'name': -1}).exec(function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow != null) {

                        newPutListName = MagicIncrement.inc(putListRow.name);
                        newPutListSequence = MagicIncrement.inc(putListRow.sequence);

                        newPutList.warehouseId = warehouseId;
                        newPutList.name = newPutListName;
                        newPutList.date = date;
                        newPutList.sequence = newPutListSequence;
                        newPutList.timeCreated = timeInInteger;
                        newPutList.createdBy = createdBy;

                        newPutList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOG', newPutListName, newPutListSequence);
                                flowController.emit('END', {message: "New Put-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                            }
                        });

                    } else {

                        newPutList.warehouseId = warehouseId;
                        newPutList.name = putListName;
                        newPutList.date = date;
                        newPutList.sequence = 1;
                        newPutList.createdBy = createdBy;
                        newPutList.timeCreated = timeInInteger;

                        newPutList.save(function (err, insertedRecordDetails) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('LOG', putListName, 1);
                                flowController.emit('END', {message: "New Put-List added into the system!", data: insertedRecordDetails._id, status: 'success', statusCode: '201'});
                            }
                        });
                    }
                });
            });

            flowController.on('LOG', function (putListName, newPutListSequence) {

                if (createdBy == 'INTERFACE') {

                    fs.appendFile(pathPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTLIST' + ',' + 'INTERFACE' + ',' + putListName + ',' + newPutListSequence + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                        if (err) {
                            // append failed
                            res.json({message: 'Error while adding PutList. ' + err, status: 'error', statusCode: '500'});
                        } else {

                            console.log('append file in log');
                        }
                    });
                } else {
                    userModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (userRow == null) {

                            flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                        } else {

                            username = (userRow.username) ? userRow.username : '';

                            fs.appendFile(pathPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTLIST' + ',' + username + ',' + putListName + ',' + newPutListSequence + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                if (err) {
                                    // append failed
                                    res.json({message: 'Error while adding PutList. ' + err, status: 'error', statusCode: '500'});
                                } else {

                                    console.log('append file in log');
                                }
                            });
                        }
                    });
                }
            });
            //
            //
            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-CREATE',
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
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Merge Putlist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/update/merge-putLists/')

        .patch(function (req, res) {

            var warehouseId = req.body.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListIdArray = req.body.hasOwnProperty('putListIdArray') ? req.body.putListIdArray : [];

            var baseUrl = req.body.baseUrl.trim();//'http://localhost:2000/avancer'; 

            var arrPutList = [];

            var date = moment(new Date()).format('DD/MM/YY');

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var mergePickList_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(putListIdArray, function (element, callback) {

                        putListModel.findOne({'_id': element, 'date': date, 'status': 0, 'activeStatus': 1}, function (err, putListRow) {
                            if (err) {

                                reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (putListRow == null) {

                                reject({message: 'Merge not allowed! Only unassigned Picklist\'s can be merged.', status: 'error', statusCode: '304'});
                            } else {

                                arrPutList.push(String(putListRow._id));
                                setImmediate(callback);
                            }
                        });
                    }, function (err) {

                        if (err) {

                            reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            resolve(arrPutList);
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

            flowController.on('1', function (putListIdData) {

                var putSubArr = [];

                var iteration = function (element, callbackDone) {

                    putSubListModel.find({'putListId': element, 'activeStatus': 1}, function (err, putSubListRow) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow.length == 0) {

                            flowController.emit('ERROR', {message: 'Data missing! PickList records tampered/removed from system.', status: 'error', statusCode: '304'});
                        } else {
                            async.eachSeries(putSubListRow, function (element, callback) {

                                putSubArr.push(String(element._id));
                                setImmediate(callback);
                            }, function (err) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    setTimeout(function () {
                                        callbackDone();
                                    }, 100);
                                }
                            });
                        }
                    });
                };

                async.eachSeries(putListIdData, iteration, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', putListIdData, putSubArr);
                    }
                });
            });

            flowController.on('2', function (putListIdData, putSubListIdData) {

                var requestifyUrl = baseUrl + '/v1/processMaster/web/pickList/configuration/create/putList/';

                requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {

                        flowController.emit('3', putListIdData, putSubListIdData, result.data);
                    }
                    if (result.status === 'error') {

                        flowController.emit('ERROR', {message: 'Unable to create pick-sublist! Try again later.', status: 'error', statusCode: '304'});
                    }
                });
            });

            flowController.on('3', function (putListIdData, putSubListIdData, newPutList) {

                var mergeStatus_promise = new Promises(function (resolve, reject) {

                    async.eachSeries(putListIdData, function (element, callback) {

                        putListModel.update(
                                {'_id': element},
                                {'$set': {'activeStatus': 3}},
                                function (err) {

                                    if (err) {
                                        // error while adding records
                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        putSubListModel.update(
                                                {'pickListId': element},
                                                {'$set': {'putListId': newPutList}},
                                                {multi: true},
                                                function (err) {

                                                    if (err) {
                                                        // error while adding records
                                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
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

                    flowController.emit('4', putListIdData, putSubListIdData, newPutList);
                }, function (promise1_rejectedData) {

                    flowController.emit('ERROR', promise1_rejectedData);
                }).catch(function (exception) {

                    res.json(exception);
                });
            });

            flowController.on('4', function (putListIdData, putSubListIdData, newPutList) {

                var pickListIdArr = [];

                async.eachSeries(putListIdData, function (element, callback) {

                    pickListIdArr.push(element);
                    setImmediate(callback);
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        putListModel.update(
                                {'_id': newPutList},
                                {'$set': {'mergedPickLists': pickListIdArr, 'pickSubLists': putSubListIdData}},
                                function (err) {
                                    if (err) {
                                        // error while adding records
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END');
                                    }
                                });
                    }
                });
            });

            flowController.on('END', function () {

                result = {message: ' Putlists merged into the system.', status: 'success', statusCode: '200'};

                res.json(result);
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-MERGE',
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
//----------------------------------------------------------------------------------------------------------------------------
// Update order number to put list
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/updateOrderNumber/putLists/')

        .patch(function (req, res) {

            var warehouseId = req.body.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();

            var materialHandlingUnit = (req.body.hasOwnProperty('materialHandlingUnit')) ? req.body.materialHandlingUnit : [];

            var listType = req.body.listType.trim().toUpperCase();

            var orderNumber = (req.body.hasOwnProperty('orderNumber')) ? req.body.orderNumber : [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, putListRowUpdate) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (putListRowUpdate == null)
                        flowController.emit('ERROR', {message: 'Putlist not found in system.', status: 'error', statusCode: '304'});
                    else
                        flowController.emit('1', putListRowUpdate);
                });
            });

            flowController.on('1', function () {

                var query = {'_id': putListId};
                var update = {'$set': {'orderNumber': orderNumber, 'materialHandlingUnit': materialHandlingUnit, 'listType': listType}};
                var option = {multi: true};

                putListModel.update(query, update, option, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('1');
                });
            });

            flowController.on('2', function () {

                putSubListModel.find({'putListId': putListId, 'activeStatus': 1}, function (err, putListSubRowUpdate) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListSubRowUpdate == null) {

                        flowController.emit('ERROR', {message: 'Data missing! PutSubList records tampered/removed from system.', status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': putListId};
                        var update = {'$set': {'orderNumber': orderNumber}};
                        var option = {multi: true};

                        putSubListModel.update(query, update, option, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: 'put Sub List Update into system!', status: 'success', statusCode: 201});
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
//----------------------------------------------------------------------------------------------------------------------------
// Get the resource availability (Event Emitter)
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/get/resource-availability/:warehouseId/:putListId/')

        .get(function (req, res) {

            var putListId = req.params.putListId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                deviceAreaAllocationArray = [];

                deviceAreaAllocationModel.find({'warehouseId': warehouseId, 'process': 'PICK', 'activeStatus': 1}, function (err, deviceAreaAllocationRow) {
                    if (err) {

                        flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                    } else if (deviceAreaAllocationRow.length == 0) {

                        flowController.emit('error', ({message: "No devices configured for pick process", status: 'error', statusCode: '500'}));
                    } else {

                        async.eachSeries(deviceAreaAllocationRow, function (element, callback) {

                            var temp = {

                                deviceId: element.deviceId,
                                putListId: putListId // Zone Ids
                            };
                            deviceAreaAllocationArray.push(temp);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                            } else {

                                flowController.emit('2', deviceAreaAllocationArray);
                            }
                        });
                    }
                });
            });

            // Get area and process allocated to device
            flowController.on('2', function (deviceAreaAllocationArray) {

                var deviceArray = [];

                async.eachSeries(deviceAreaAllocationArray, function (element, callback) {

                    deviceMasterModel.findOne({'_id': element.deviceId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, deviceMasterRow) {

                        if (err) {

                            flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                        } else if (deviceMasterRow == null) {

                            var data = {
                                deviceId: element.deviceId,
                                targetCapacity: '',
                                deviceName: "",
                                putListId: putListId,
                                availableCapacity: ""
                            };
                            deviceArray.push(data);
                            setImmediate(callback);
                        } else {

                            var data = {
                                deviceId: element.deviceId,
                                targetCapacity: (deviceMasterRow.targetCapacity) ? deviceMasterRow.targetCapacity : '',
                                deviceName: deviceMasterRow.name,
                                putListId: putListId,
                                availableCapacity: deviceMasterRow.availableCapacity
                            };
                            deviceArray.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                    } else {

                        flowController.emit('3', deviceArray);
                    }
                });
            });

            // Get online status of users on the device
            flowController.on('3', function (deviceArray) {

                var onlineStatusOfDeviceArray = [];

                var date = moment(new Date()).format('DD/MM/YY');

                async.eachSeries(deviceArray, function (element, callback) {

                    deviceTrackingModel.findOne({'deviceId': element.deviceId, 'date': date, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, trackingRow) {// -1 for latest

                        if (err) {

                            flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                        } else if (trackingRow == null) {

                            setImmediate(callback);
                        } else {
                            var isOnline = (trackingRow != null) ? (trackingRow.status != 'LOGOUT') ? 'YES' : 'NO' : 'NO';
                            var userId = (isOnline == 'YES') ? trackingRow.userId : '';

                            var temp = {

                                deviceId: element.deviceId,
                                deviceName: (element.deviceName) ? element.deviceName : '',
                                targetCapacity: (element.targetCapacity) ? element.targetCapacity : '',
                                availableCapacity: (element.availableCapacity) ? element.availableCapacity : '',
                                isOnline: isOnline,
                                userId: userId,
                                putListId: element.putListId

                            };
                            onlineStatusOfDeviceArray.push(temp);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                    } else {

                        flowController.emit('4', onlineStatusOfDeviceArray);
                    }
                });
            });

            flowController.on('4', function (combinationArray) {

                var allowedDevicesArray = [];

                async.eachSeries(combinationArray, function (element, callback) {

                    putListModel.findOne({'_id': element.putListId, 'resourceAssigned.deviceId': element.deviceId, 'activeStatus': 1}, function (err, trackingRow) {// -1 for latest
                        if (err) {

                            flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                        } else if (trackingRow == null) {

                            setImmediate(callback);
                        } else {

                            var conbinData = {

                                deviceId: element.deviceId,
                                deviceName: element.deviceName,
                                targetCapacity: element.targetCapacity || '',
                                availableCapacity: element.availableCapacity,
                                allocatedCapacity: "12", //elementId.capacityAssigned,
                                isOnline: element.isOnline,
                                userId: element.userId,
                                username: ''
                            };

                            allowedDevicesArray.push(conbinData);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                    } else {

                        flowController.emit('5', allowedDevicesArray);
                    }
                });
            });

            flowController.on('5', function (userNameCombination) {

                var userNameArr = [];

                async.eachSeries(userNameCombination, function (element, callback) {

                    if (element.isOnline == 'YES') {

                        userModel.find({'_id': element.userId}, function (err, zoneIdRow) {

                            async.eachSeries(zoneIdRow, function (elementZone, callbackDone) {

                                var finalData = {
                                    deviceId: element.deviceId,
                                    deviceName: element.deviceName,
                                    targetCapacity: (element.targetCapacity) ? element.targetCapacity : '',
                                    isOnline: element.isOnline,
                                    username: elementZone.username,
                                    userId: element.userId,
                                    // zone:element3.zone,
                                    availableCapacity: element.availableCapacity,

                                };
                                userNameArr.push(finalData);
                                callbackDone();
                            }, function (err) {

                                if (err) {

                                    callback(err);
                                } else {

                                    setImmediate(callback);
                                }
                            });
                        });

                    } else {
                        var finalData = {
                            deviceId: element.deviceId,
                            deviceName: element.deviceName,
                            targetCapacity: element.targetCapacity,
                            isOnline: element.isOnline,
                            username: element.username,
                            userId: element.userId,
                            availableCapacity: element.availableCapacity
                        };

                        userNameArr.push(finalData);
                        setImmediate(callback);
                    }
                }, function (err) {

                    if (err) {

                        flowController.emit('error', ({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'}));
                    } else {

                        flowController.emit('end', userNameArr);
                    }
                });
            });

            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-RESOURCE-AVAILABILITY',
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

            flowController.on('end', function (args_coming_from_6) {
                res.json({message: 'Operation Successful', status: 'success', statusCode: 200, data: args_coming_from_6});
            });

            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Update status of putlist as pending for pending-backlog
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/update-status/pending-backlog/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var backloggedBy = req.body.backloggedBy;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var putListArr = [];

                putListModel.find({'warehouseId': warehouseId, 'status': {$lt: 21}, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('error', {message: 'Can\'t update! Putlist modified/delete from the system!', status: 'error', statusCode: '304'});
                    } else {

                        async.eachSeries(putListRow, function (element, callback) {

                            putListModel.update(
                                    {'_id': element._id, 'warehouseId': warehouseId},
                                    {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
                                    function (err) {
                                        if (err) {
                                            // error while adding records
                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            putListArr.push(element._id);
                                            setImmediate(callback);
                                        }
                                    });
                        }, function (err) {

                            if (err) {

                                flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('1', putListArr);
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('1', function (putListArrData) {

                async.eachSeries(putListArrData, function (element, callback) {

                    putSubListModel.findOne({'putListId': element, 'activeStatus': 1}, function (err, putSubListRow) {

                        if (err) {

                            flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (putSubListRow == null) {

                            setImmediate(callback);
                            // flowController.emit('error', {message: 'Can\'t update! Putlist modified/delete from the system!', status: 'error', statusCode: '304'});
                        } else {

                            putSubListModel.update(
                                    {'putListId': element},
                                    {'$set': {'status': 41, 'timeBacklogged': timeInInteger, 'backloggedBy': backloggedBy}},
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

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else {

                        flowController.emit('end');
                    }
                });
            });
            //
            //
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-PENDING-BACKLOG',
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

            flowController.on('end', function () {

                res.json({message: "Day end process completed! However some putlist line items are In Progress/Pending for drop.", status: 'success', statusCode: '200'});
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Get the putList header (Event Emitter)
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/get/putListHeader/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 0;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var arrHeader = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
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
            //
            flowController.on('1', function (startTime, endTime) {
                (showConsole) ? console.log('1') : '';

                var totalPutRate = 0;

                putListModel.find({'warehouseId': warehouseId,  'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {
                        flowController.emit('2', startTime, endTime, 0, 0);
//                        var putListCreated = {
//                            //Global
//                            putListCreated: 0,
//                            putListUnassigned: 0,
//                            putListAssigned: 0,
//                            putListInprogress: 0,
//                            putListDone: 0,
//                            putListSkipped: 0,
//                            putListBackLog: 0,
//                            //Line
//                            putSubListPending: 0,
//                            putSubListInprogress: 0,
//                            putSubListPendingfordrop: 0,
//                            putSubListDone: 0,
//                            putSubListSkip: 0,
//                            putSubListBacklog: 0,
//                            //
//                            averageResourse: 0,
//                            averagePutListRate: 0
//                        };
//                        arrHeader.push(putListCreated);
//                        flowController.emit('end');
                    } else {

                        var deviceIdArr = [];

                        async.waterfall([

                            function (waterfallcallback) {

                                async.eachSeries(putListRow, function (element, callback) {

                                    if (element.resourceAssigned.length == 0) {

                                        setImmediate(callback);
                                    } else {

                                        deviceId = element.resourceAssigned[0].deviceId;
                                        deviceIdArr.push(deviceId);
                                        setImmediate(callback);
                                    }
                                }, function (err) {

                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        waterfallcallback(null, deviceIdArr);
                                    }
                                });
                            }, function (deviceIdArr, waterfallcallback) {

                                putListModel.count({'timeCompleted': {'$gte': startTime}, 'activeStatus': 1}, function (err, putDoneCount) {

                                    if (err) {

                                        waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                    } else {

                                        var finalPutRate = round10((putDoneCount / ((timeInInteger - startTime) / 3600)), -2);
                                        waterfallcallback(null, deviceIdArr, finalPutRate);
                                    }
                                });
                            }
                        ], function (err, deviceIdArr, finalPutRate) {
                            // result now equals 'done'
                            if (err) {

                            } else {

                                flowController.emit('2.1', startTime, endTime, deviceIdArr, finalPutRate);
                            }
                        });
                    }
                });
            });
            //
            //
            flowController.on('2.1', function (startTime, endTime, deviceIdArr, finalPutRate) {
                (showConsole) ? console.log('2.1') : '';
                var deviceCount = 0;

                uniqueArray = deviceIdArr.filter(function (elem, pos) {
                    return deviceIdArr.indexOf(elem) == pos;
                });
                async.eachSeries(uniqueArray, function (element, callback) {

                    deviceTrackingModel.findOne({deviceId: element, 'timeCreated': {$gt: startTime, $lt: endTime}, 'status': 'LOGIN', 'activeStatus': 1}).sort({'timestamp': -1}).exec(function (err, DeviceTrackRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (DeviceTrackRow == null) {

                            setImmediate(callback);
                        } else {

                            deviceCount++;
                            setImmediate(callback);
                        }
                    });

                }, function (err) {
                    if (err) {

                    } else {
                        flowController.emit('2', startTime, endTime, deviceCount, finalPutRate);
                    }
                });
            });
            //
            //
            flowController.on('2', function (startTime, endTime, deviceCount, finalPutRate) {

                (showConsole) ? console.log('2') : '';
                var object = {};
                async.waterfall([
                    //current day 
                    function (waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1}, function (err, putListCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putListCreated = putListCount;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //putListUnssigned Total
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 1}, function (err, putListUnssignedCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putListUnassigned = putListUnssignedCount;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //putListAssigned Total
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 21}, function (err, putListAssignedCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putListAssigned = putListAssignedCount;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //PutInprogress total
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 25}, function (err, Inprogresscount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                object.putListInprogress = Inprogresscount;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //putListDone current
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'timeCompleted': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, putListcountDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putListDone = putListcountDone;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //putListSkipped total
                    //DoneSkipped 
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 35}, function (err, DoneSkippedCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putListDoneSkipped = DoneSkippedCount;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //PutListbackLog total
                    function (object, waterfallcallback) {

                        putListModel.count({'warehouseId': warehouseId, 'activeStatus': 1, 'status': 41}, function (err, backLogCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                object.putListBackLog = backLogCount;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //1 - Pending
                    //putSubList Total
                    function (object, waterfallcallback) {

                        putSubListModel.count({'activeStatus': 1, 'status': 1}, function (err, putSubListPending) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListPending = putSubListPending;

                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //25 - Inprogress
                    //putSubList total
                    function (object, waterfallcallback) {

                        putSubListModel.count({'activeStatus': 1, 'status': 25}, function (err, putSubListInprogress) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListInprogress = putSubListInprogress;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //27 - Pendingfordrop
                    //putSubList total
                    function (object, waterfallcallback) {

                        putSubListModel.count({'activeStatus': 1, 'status': 27}, function (err, putSubListPendingfordrop) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListPendingfordrop = putSubListPendingfordrop;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //31 - Done
                    //putSubList current
                    function (object, waterfallcallback) {

                        putSubListModel.count({'timeEnded': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 31}, function (err, putSubListDone) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListDone = putSubListDone;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //33 - Skip
                    //putSubList current
                    function (object, waterfallcallback) {

                        putSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 33}, function (err, putSubListSkip) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListSkip = putSubListSkip;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //41 - Backlog
                    //putSubList current
                    function (object, waterfallcallback) {

                        putSubListModel.count({'timeCreated': {$gt: startTime, $lt: endTime}, 'activeStatus': 1, 'status': 41}, function (err, putSubListBacklog) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                object.putSubListBacklog = putSubListBacklog;
                                waterfallcallback(null, object);
                            }
                        });
                    },
                    //result
                    function (object, waterfallcallback) {


                        object.averageResourse = deviceCount;
                        object.averagePutListRate = finalPutRate;
                        arrHeader.push(object);
                        waterfallcallback(null, arrHeader);
                    }

                ], function (err) {
                    // result now equals 'done'
                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('end');
                    }
                });
            });
            //
            //
            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-LIST-HEADER',
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

                res.json({data: arrHeader, message: 'Operation Successful', status: 'success', statusCode: 304});
            });
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
module.exports = router;