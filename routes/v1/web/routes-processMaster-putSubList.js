var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
var fs = require('fs');
//---------------------------------------------------------------------------------------------------------------------------
var pathSubPutList = './logs/dailyLog/putSubListLogs/log.txt';
//---------------------------------------------------------------------------------------------------------------------------
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var deviceMastersModel = require('../../../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
//---------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
// Get Put Sublist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putSubList/configuration/read/putSubList/:putListId/')

        .get(function (req, res, next) {

            var putListId = req.params.putListId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putSubListArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putSubListModel.find({'putListId': putListId, 'activeStatus': 1}, function (err, putListSubRow) {

                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (putListSubRow.length == 0)
                        flowController.emit('ERROR', {message: "No Put-Sublist configured in the system yet!", status: 'error', statusCode: '404', data: []});
                    else
                        flowController.emit('1', putListSubRow);
                });
            });

            flowController.on('1', function (putListSubRow) {

                async.eachSeries(putListSubRow, function (element, callback) {

                    var putSublist = {

                        putSubListId: element._id,
                        sequence: element.sequence,
                        itemCode: element.itemCode,
                        itemDescription: element.itemDescription,
                        palletNumber: element.hasOwnProperty('palletNumber') + ' (' + element.itemStoreId.length + ' Items)' ? element.palletNumber : '',
                        requiredQuantity: element.requiredQuantity,
                        putQuantity: element.putQuantity,
                        pickedLocation: element.pickLocationAddress,
                        dropLocation: element.dropLocationAddress,
                        pickedQuantity: element.hasOwnProperty('pickedQuantity') ? element.pickedQuantity : 0,
                        status: element.status
                    };

                    putSubListArray.push(putSublist);
                    setImmediate(callback);
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: "Operation Successful.", data: putSubListArray, status: 'success', statusCode: '200'});
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
// Create put sublist 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putSubList/configuration/create/putSubList/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();// MongoId of the waarehouse
            var itemDescription = req.body.itemDescription.trim();// MongoId of the user type
            var itemCode = req.body.itemCode.trim(); //Warehouse Operator, Desktop Operator etc in capital letter
            var requiredQuantity = req.body.requiredQuantity.trim();// UserId who created this user
            var dropLocationAddress = req.body.dropLocationAddress.trim();
            var createdBy = req.body.createdBy.trim();

            var showConsole = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemMasterModel.find({'itemCode': itemCode, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (itemMasterRow.length == 0) {

                        res.json({message: 'itemCode does not exist in system!!', status: 'error', statusCode: '404'});

                    } else {
                        if (itemMasterRow.length != 0) {


                            putSubListModel.find({'putListId': putListId, 'activeStatus': 1}).sort({'sequence': -1}).exec(function (err, putSublistRow) {
                                if (err) {

                                    res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                                } else if (putSublistRow.length == 0) {

                                    var newPutSubList = new putSubListModel();

                                    newPutSubList.putListId = putListId;
                                    newPutSubList.itemDescription = itemDescription;
                                    newPutSubList.itemCode = itemCode;
                                    newPutSubList.requiredQuantity = requiredQuantity;
                                    newPutSubList.sequence = 1;
                                    newPutSubList.dropLocationAddress = dropLocationAddress;
                                    newPutSubList.createdBy = createdBy;

                                    newPutSubList.timeCreated = timeInInteger;

                                    newPutSubList.save(function (err) {
                                        if (err) {

                                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            putListId = putSublistRow.putListId;
                                            itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                            itemDescription = putSublistRow.itemDescription;
                                            orderNumber = (putSublistRow.orderNumber) ? putSublistRow.orderNumber : '';
                                            palletNumber = (putSublistRow.palletNumber) ? putSublistRow.palletNumber : '';
                                            pickLocationAddress = (putSublistRow.pickLocationAddress) ? putSublistRow.pickLocationAddress : '';
                                            dropLocationAddress = (putSublistRow.dropLocationAddress) ? putSublistRow.dropLocationAddress : '';

                                            flowController.emit('LOG', itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId);
                                            flowController.emit('DONE', {message: "New PutSubList added into the system!", status: 'success', statusCode: '201'});
                                        }
                                    });

                                } else {

                                    var arrData = [];
                                    var oldPutSubListSequence = '';

                                    async.eachSeries(putSublistRow, function (element, callback) {

                                        arrData.push(element.sequence);
                                        setImmediate(callback);
                                    }, function (err) {

                                        if (err) {

                                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            oldPutSubListSequence = parseInt(arrData[0]);
                                        }
                                    });

                                    newPutSubListSequence = oldPutSubListSequence + 1;

                                    var newPutSubList = new putSubListModel();

                                    newPutSubList.putListId = putListId;
                                    newPutSubList.itemCode = itemCode;
                                    newPutSubList.itemDescription = itemDescription;
                                    newPutSubList.requiredQuantity = requiredQuantity;
                                    newPutSubList.dropLocationAddress = dropLocationAddress;
                                    newPutSubList.createdBy = createdBy;
                                    newPutSubList.timeCreated = timeInInteger;
                                    newPutSubList.sequence = newPutSubListSequence;

                                    newPutSubList.save(function (err) {
                                        if (err) {

                                            res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            putListId = putSublistRow.putListId;
                                            itemCode = (itemMasterRow.itemCode) ? itemMasterRow.itemCode : '';
                                            itemDescription = putSublistRow.itemDescription;
                                            orderNumber = (putSublistRow.orderNumber) ? putSublistRow.orderNumber : '';
                                            palletNumber = (putSublistRow.palletNumber) ? putSublistRow.palletNumber : '';
                                            pickLocationAddress = (putSublistRow.pickLocationAddress) ? putSublistRow.pickLocationAddress : '';
                                            dropLocationAddress = (putSublistRow.dropLocationAddress) ? putSublistRow.dropLocationAddress : '';

                                            flowController.emit('LOG', itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId);
                                            flowController.emit('DONE', {message: "New PutSubList added into the system!", status: 'success', statusCode: '201'});
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            });
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId) {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        deviceId = '';//(putListRow.resourceAssigned[0].deviceId) ? putListRow.resourceAssigned[0].deviceId : '';

                        usersModel.findOne({'_id': createdBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                            } else {
                                username = (userRow.username) ? userRow.username : '';
                                itemDescriptionSp = itemDescription.replace(/[^a-zA-Z0-9]/g, " ");
                                pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                                fs.appendFile(pathSubPutList, '\n' + 'WEB' + ',' + 'CREATE' + ',' + 'PUTSUBLIST' + ',' + username + ',' + putListRow.name + ',' + itemCode + ',' + itemDescriptionSp + ',' + palletNumber + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddressRegex + ',' + dropLocationAddressRegex + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        // append failed
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        console.log('append putSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';

                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-SUB-LIST-CREATE',
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
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Put Auto route
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/update/auto-route/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var putListId = req.body.putListId.trim();

            var flowController = new EventEmitter();
            // Create picklist
            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        putSubListModel.find({'putListId': putListId, 'activeStatus': 1}, function (err, subListRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (subListRow.length == 0) {

                                flowController.emit('ERROR', {message: 'No Sub-List available!', status: 'error', statusCode: '404'});
                            } else {

                                if (subListRow.length != 0) {

                                    flowController.emit('1', subListRow);

                                }
                            }
                        });
                    }
                });
            });

            flowController.on('1', function (subListRow) {
                var dummyObj = [];

                var customerAddressArray = [];

                async.eachSeries(subListRow, function (element, callback) {

                    dropLocationAddress = element.dropLocationAddress;

                    locationStoreModel.findOne({'customerAddress': dropLocationAddress, 'activeStatus': 1}, function (err, locationListRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (locationListRow == null) {

                            callback({message: 'No Location address available!', status: 'error', statusCode: '404'});

                        } else {

                            systemAddress_data = locationListRow.systemAddress;

                            customerAddressArray.push(systemAddress_data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('2', customerAddressArray.sort());
                    }
                });
            });


            flowController.on('2', function (systemAddressArr) {

                var arrData = [];

                async.eachSeries(systemAddressArr, function (element, callback) {

                    locationStoreModel.findOne({'systemAddress': element, 'activeStatus': 1}, function (err, addressRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                        } else if (addressRow == null) {

                            callback({message: 'No  address available!', status: 'error', statusCode: '404'});

                        } else {

                            arrData.push(addressRow.customerAddress);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', arrData.sort());
                    }
                });
            });

            flowController.on('3', function (systemAddressArr) {

                var iteration = function (element, callbackDone) {

                    putSubListModel.update(
                            {'dropLocationAddress': element, 'activeStatus': 1},
                            {'$set': {'sequence': systemAddressArr.indexOf(element)}}, {multi: true},
                            function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    callbackDone();
                                }
                            });
                };

                async.eachSeries(systemAddressArr, iteration, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('END', {message: 'Sequence updated into the system!', status: 'success', statusCode: '304'});
                    }
                });
            });

            // Error Handling
            flowController.on('END', function (result) {

                res.json(result);
            });
            // Error Handling
            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-SUB-AUTO-ROUTE',
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
// Update put sublist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putSubList/configuration/update/putSubList/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.body.putListId.trim();// MongoId 
            var putSubListId = req.body.putSubListId.trim();// MongoId 
            var itemCode = req.body.itemCode.trim(); //Warehouse Operator, Desktop Operator etc in capital letter
            var itemDescription = req.body.itemDescription.trim();
            var requiredQuantity = req.body.requiredQuantity.trim();// UserId who created this user
            var pickLocationAddress = req.body.pickLocationAddress.trim();
            var dropLocationAddress = req.body.dropLocationAddress.trim();
            var modifiedBy = req.body.createdBy.trim();

            var showConsole = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putSubListModel.findOne({'_id': putSubListId, 'putListId': putListId, 'activeStatus': 1}, function (err, putSubListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                    } else if (putSubListRow == null) {

                        flowController.emit('ERROR', {message: 'No Line items under putlist for the shift/day!', status: 'error', statusCode: '404'});

                    } else {
                        if (putSubListRow != null) {

                            putSubListRow.itemCode = itemCode;
                            putSubListRow.pickLocationAddress = pickLocationAddress;
                            putSubListRow.itemDescription = itemDescription;
                            putSubListRow.requiredQuantity = requiredQuantity;
                            putSubListRow.dropLocationAddress = dropLocationAddress;
                            putSubListRow.timeModified = timeInInteger;
                            putSubListRow.modifiedBy = modifiedBy;

                            putSubListRow.save(function (err) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '404'});
                                } else {

                                    putListId = putSubListRow.putListId;
                                    itemCode = (putSubListRow.itemCode) ? putSubListRow.itemCode : '';
                                    itemDescription = putSubListRow.itemDescription;
                                    orderNumber = (putSubListRow.orderNumber) ? putSubListRow.orderNumber : '';
                                    palletNumber = (putSubListRow.palletNumber) ? putSubListRow.palletNumber : '';
                                    pickLocationAddress = (putSubListRow.pickLocationAddress) ? putSubListRow.pickLocationAddress : '';
                                    dropLocationAddress = (putSubListRow.dropLocationAddress) ? putSubListRow.dropLocationAddress : '';

                                    flowController.emit('LOG', itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId);
                                    flowController.emit('DONE', {message: "New PutSubList added into the system!", status: 'success', statusCode: '201'});
                                }
                            });
                        }
                    }
                });
            });
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId) {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        deviceId = '';//(putListRow.resourceAssigned[0].deviceId) ? putListRow.resourceAssigned[0].deviceId : '';

                        usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                            } else {
                                username = (userRow.username) ? userRow.username : '';
                                itemDescriptionSp = itemDescription.replace(/[^a-zA-Z0-9]/g, " ");
                                pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                                fs.appendFile(pathSubPutList, '\n' + 'WEB' + ',' + 'UPDATE' + ',' + 'PUTSUBLIST' + ',' + username + ',' + putListRow.name + ',' + itemCode + ',' + itemDescriptionSp + ',' + palletNumber + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddressRegex + ',' + dropLocationAddressRegex + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        // append failed
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        console.log('append putSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';

                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-SUB-UPDATE',
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
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Delete Put Sublist
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putSubList/configuration/delete/putSubList/:putListId/:putSubListId/:modifiedBy/')

        .delete(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.params.putListId.trim();
            var putSubListId = req.params.putSubListId.trim();
            var modifiedBy = req.params.modifiedBy.trim();

            var showConsole = 0;
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putSubListModel.findOne({'_id': putSubListId, 'putListId': putListId, 'status': 1, 'activeStatus': 1}, function (err, putListSubRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListSubRow == null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't remove PutSubList! This List is already in use.", status: 'error', statusCode: '304'});
                    } else {

                        if (putListSubRow != null && !putListSubRow.assignedBy) {

                            putSubListModel.update(
                                    {'_id': putSubListId},
                                    {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}},
                                    function (err) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            var itemCode = putListSubRow.itemCode;
                                            putListId = putListSubRow.putListId;
                                            itemCode = (putListSubRow.itemCode) ? putListSubRow.itemCode : '';
                                            itemDescription = putListSubRow.itemDescription;
                                            orderNumber = (putListSubRow.orderNumber) ? putListSubRow.orderNumber : '';
                                            palletNumber = (putListSubRow.palletNumber) ? putListSubRow.palletNumber : '';
                                            pickLocationAddress = (putListSubRow.pickLocationAddress) ? putListSubRow.pickLocationAddress : '';
                                            dropLocationAddress = (putListSubRow.dropLocationAddress) ? putListSubRow.dropLocationAddress : '';

                                            flowController.emit('LOG', itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId);
                                            flowController.emit('DONE', {message: "PutSubList removed from system!!", status: 'success', statusCode: '201'});

                                        }
                                    });

                        } else {
                            flowController.emit('ERROR', {message: "Can't remove PutSubList! This List is already Assigned By system!", status: 'error', statusCode: '304'});
                        }
                    }
                });
            });
            //LOGS APPENDS
            flowController.on('LOG', function (itemCode, itemDescription, palletNumber, orderNumber, pickLocationAddress, dropLocationAddress, putListId) {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (putListRow == null) {

                        flowController.emit('ERROR', {message: 'No Put-List available !', status: 'error', statusCode: '404'});
                    } else {

                        deviceId = '';//(putListRow.resourceAssigned[0].deviceId) ? putListRow.resourceAssigned[0].deviceId : '';

                        usersModel.findOne({'_id': modifiedBy, 'activeStatus': 1}, function (err, userRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (userRow == null) {

                                flowController.emit('ERROR', {message: 'No UserMaster data available !', status: 'error', statusCode: '404'});
                            } else {
                                username = (userRow.username) ? userRow.username : '';
                                itemDescriptionSp = itemDescription.replace(/[^a-zA-Z0-9]/g, " ");
                                pickLocationAddressRegex = pickLocationAddress.replace(/ /g, "_");
                                dropLocationAddressRegex = dropLocationAddress.replace(/ /g, "_");
                                fs.appendFile(pathSubPutList, '\n' + 'WEB' + ',' + 'DELETE' + ',' + 'PUTSUBLIST' + ',' + username + ',' + putListRow.name + ',' + itemCode + ',' + itemDescriptionSp + ',' + palletNumber + ',' + deviceId + ',' + orderNumber + ',' + pickLocationAddressRegex + ',' + dropLocationAddressRegex + ',' + timeInInteger + ',' + moment(new Date()).format('DD/MM/YY-HH:MM:SS'), function (err) {
                                    if (err) {

                                        // append failed
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        console.log('append putSubList file create time');
                                    }
                                });
                            }
                        });
                    }
                });
            });
            // Done
            flowController.on('DONE', function (response) {

                (showConsole) ? console.log('DONE') : '';

                res.json(response);
            });
            //
            // Error Emitter
            flowController.on('ERROR', function (error) {

                (showConsole) ? console.log('ERROR') : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'PUT-SUB-DELETE',
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
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Dashboard data
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/get/putSubListHeader/:putListId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var putListId = req.params.putListId.trim();

            var itemMasterArray = [];

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.findOne({'_id': putListId, 'activeStatus': 1}, function (err, putListRow) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else if (putListRow == null)
                        flowController.emit('ERROR', {message: "Unable to configure! Try again after some time.", status: 'error', statusCode: '500'});
                    else
                        flowController.emit('1', putListRow);
                });
            });

            flowController.on('1', function (putListRow) {

                async.waterfall([
                    //
                    function (waterfallcallback) {

                        if (putListRow.resourceAssigned.length == 0) {

                            waterfallcallback(null, '');
                        } else {

                            deviceId = putListRow.resourceAssigned[0].deviceId;

                            deviceMastersModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceRow) {
                                if (err) {

                                } else if (deviceRow == null) {

                                    waterfallcallback(null, '');

                                } else {
                                    deviceName = (deviceRow.name) ? deviceRow.name : deviceRow.model;

                                    waterfallcallback(null, deviceName);
                                }
                            });
                        }
                    },
                    //
                    function (deviceName, waterfallcallback) {

                        putSubListModel.count({'putListId': putListId, 'activeStatus': 1}, function (err, putSubListCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, deviceName, putSubListCount);
                            }
                        });
                    },
                    //    
                    function (deviceName, putSubListCount, waterfallcallback) {

                        putSubListModel.count({'putListId': putListId, 'activeStatus': 1, 'status': 31}, function (err, putSubLisDoneCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount);
                            }
                        });
                    },
                    // 
                    function (deviceName, putSubListCount, putSubLisDoneCount, waterfallcallback) {

                        if (putListRow.assignedTo) {

                            usersModel.findOne({_id: putListRow.assignedTo, activeStatus: 1}, function (err, userRow) {
                                if (err) {

                                    waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (userRow == null) {

                                    waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount, '');
                                } else {

                                    resourceAssigned = (userRow.username) ? userRow.username : '';

                                    waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned);
                                }
                            });
                        } else {
                            waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount, '');
                        }
                    },
                    //    
                    function (deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned, waterfallcallback) {//Skip

                        putSubListModel.count({'putListId': putListId, 'activeStatus': 1, 'status': 31}, function (err, SkipCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned, SkipCount);
                            }
                        });
                    },
                    //
                    function (deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned, SkipCount, waterfallcallback) {//In progress

                        putSubListModel.count({'putListId': putListId, 'activeStatus': 1, 'status': 25}, function (err, InprogressCount) {
                            if (err) {

                                waterfallcallback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                waterfallcallback(null, deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned, SkipCount, InprogressCount);
                            }
                        });
                    },
                    //
                    function (deviceName, putSubListCount, putSubLisDoneCount, resourceAssigned, SkipCount, InprogressCount, waterfallcallback) {
                        //(element.timeCreated) ? moment.unix(element.timeCreated).format("DD/MMM/YYYY") : ''
                        var putListCreated = {

                            putListName: putListRow.name,
                            status: (putListRow.status == 1) ? 'Unassigned' : '' || (putListRow.status == 21) ? 'Assigned' : '' || (putListRow.status == 25) ? 'In progress' : '' || (putListRow.status == 31) ? 'Done' : '' || (putListRow.status == 35) ? 'Done Skipped ' : '' || (putListRow.status == 41) ? 'Backlog' : '',
                            assigned: InprogressCount,
                            totalLine: putSubListCount,
                            putSubListDone: putSubLisDoneCount,
                            putSubListSkip: SkipCount,
                            timeStarted: (putListRow.timeStarted) ? moment.unix(putListRow.timeStarted).format("DD/MM/YY") : '',
                            timeAssigned: (putListRow.timeAssigned) ? moment.unix(putListRow.timeAssigned).format("DD/MM/YY") : '',
                            timeCompleted: (putListRow.timeCompleted) ? moment.unix(putListRow.timeCompleted).format("DD/MM/YY") : '',
                            listType: putListRow.listType,
                            materialHandlingUnit: putListRow.materialHandlingUnit,
                            orderNumber: putListRow.orderNumber,
                            putRate: (putListRow.putRate) ? putListRow.putRate : 0,
                            resourceAssigned: deviceName,
                            assignedTo: resourceAssigned
                        };
                        waterfallcallback(null, putListCreated);
                    }
                ], function (err, result) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        itemMasterArray.push(result);
                        flowController.emit('END', {data: itemMasterArray, message: 'Operation Successful', status: 'success', statusCode: 200});
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