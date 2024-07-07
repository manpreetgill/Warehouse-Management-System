var express = require('express');
var router = express.Router();
var requestify = require('requestify');
var events = require('events');
var EventEmitter = events.EventEmitter;
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
//------------------------------------------------------------------------------------------------------------------------
var pickListModel = require('../../../models/mongodb/processMaster-pickList/collection-pickList.js');
var pickSubListModel = require('../../../models/mongodb/processMaster-pickSubList/collection-pickSubList.js');
var putListModel = require('../../../models/mongodb/processMaster-putList/collection-putList.js');
var putSubListModel = require('../../../models/mongodb/processMaster-putSubList/collection-putSubList.js');
var zoneMasterModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var itemStoresModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var locationStoreModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
var deviceAreaAllocationModel = require('../../../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
//------------------------------------------------------------------------------------------------------------------------
var pickListService = require('../../../service-factory/pickListService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------
// Get All putlist and send to device
//---------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/putList/configuration/get/description/:deviceId/')

        .get(function (req, res) {

            var showConsole = 0;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var deviceId = req.params.deviceId.trim();

            var flowController = new EventEmitter();

            // Check if device has allowed PUT activity
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                deviceAreaAllocationModel.findOne({'deviceId': deviceId, 'process': 'PUT', 'activeStatus': 1}, function (err, deviceAreaAllocationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (deviceAreaAllocationRow == null) {

                        flowController.emit('ERROR', {message: 'No zones allocated for device to process PUT Activity.', status: 'error', pickMobile: 'false', statusCode: '304'});
                    } else {

                        flowController.emit('1');
                    }
                });
            });

            // Get putlists reserved by device or free
            flowController.on('1', function () {

                (showConsole) ? console.log('1') : '';

                putListArray = [];

                putListModel.find({'resourceAssigned.deviceId': deviceId, 'status': {'$lt': 31}, 'activeStatus': 1}).sort({'timeCreated': 1}).exec(function (err, putListModelRow) {
                    if (err) {

                        flowController.emit('ERROR', ({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'}));
                    } else if (putListModelRow.length == 0) {
                        // Skip putlist process
                        flowController.emit('1.1', putListArray);
                    } else {

                        async.eachSeries(putListModelRow, function (element, callback) {

                            putSubListModel.find({'putListId': element._id, 'activeStatus': 1}, function (err, putSubListModelRow) {
                                if (err) {

                                    callback(err);
                                } else if (putSubListModelRow.length == 0) {

                                    setImmediate(callback);
                                } else {

                                    var temp = {};
                                    temp.putListId = element._id;
                                    temp.name = element.name;
                                    temp.putRate = element.putRate;
                                    putListArray.push(temp);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('1.1', putListArray);
                        });
                    }
                });
            });

            // Get putlists reserved by device or free
            flowController.on('1.1', function (putListArray) {

                (showConsole) ? console.log('1.1') : '';

                putListNewArray = putListArray;

                putListModel.find({'resourceAssigned.0': {$exists: false}, 'status': {'$lt': 31}, 'activeStatus': 1}).sort({'timeCreated': 1}).exec(function (err, putListModelRow) {
                    if (err) {

                        flowController.emit('ERROR', ({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'}));
                    } else if (putListModelRow.length == 0) {
                        // Skip putlist process
                        flowController.emit('1.2', putListNewArray);
                    } else {

                        async.eachSeries(putListModelRow, function (element, callback) {

                            putSubListModel.find({'putListId': element._id, 'activeStatus': 1}, function (err, putSubListModelRow) {
                                if (err) {

                                    callback(err);
                                } else if (putSubListModelRow.length == 0) {

                                    setImmediate(callback);
                                } else {

                                    var temp = {};
                                    temp.putListId = element._id;
                                    temp.name = element.name;
                                    temp.putRate = element.putRate;
                                    putListNewArray.push(temp);
                                    setImmediate(callback);
                                }
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else
                                flowController.emit('1.2', putListNewArray);
                        });
                    }
                });
            });

            // Get putlists reserved by device or free
            flowController.on('1.2', function (putListArray) {

                (showConsole) ? console.log('1.2') : '';

                if (putListArray.length == 0) {

                    flowController.emit('END', {message: 'There are no activated putlists available!', status: 'error', statusCode: '404'});
                } else {

                    flowController.emit('2', putListArray);
                }
            });

            // Get details of putlist
            flowController.on('2', function (putListArray) {

                (showConsole) ? console.log('2') : '';

                var putSublistArray = [];

                async.eachSeries(putListArray, function (element, callbackDone) {

                    putSubListModel.find({'putListId': element.putListId, 'activeStatus': 1}, function (err, putSubListModelRow) {

                        if (err) {

                            callbackDone({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else {

                            async.eachSeries(putSubListModelRow, function (result, callback) {

                                var itemStoreId = result.itemStoreId[0];

                                itemStoresModel.findOne({'_id': itemStoreId, 'activeStatus': 1}, function (err, itemStoreRow) {
                                    if (err) {

                                        callback(err);
                                    } else if (itemStoreRow == null) {

                                        setImmediate(callback);
                                    } else {

                                        var temp = {
                                            putListId: result.putListId,
                                            putSubListId: result._id,
                                            lot: 0,
                                            name: element.name,
                                            pickRate: (('pickRate' in result) && (result.pickRate !== undefined)) ? element.pickRate : 0, // element.pickRate, 
                                            itemType: 'PALLET',
                                            itemValue: result.palletNumber,
                                            itemCode: result.itemCode,
                                            serialNumberArray: [],
                                            itemDescription: result.itemDescription,
                                            itemQuantity: result.requiredQuantity,
                                            palletNumber: (('palletNumber' in result) && (result.palletNumber !== undefined)) ? result.palletNumber : '',
                                            customPalletNumber: "",
                                            pickLocation: "CYBERLINE",
                                            dropLocation: (result.dropLocationAddress) ? result.dropLocationAddress : '',
                                            palletType: (itemStoreRow.randomFields[0].palletType) ? itemStoreRow.randomFields[0].palletType : '',
                                            orderNumber: (itemStoreRow.orderNumber) ? itemStoreRow.orderNumber : '',
                                            status: result.status,
                                            pickedQuantity: (('pickedQuantity' in result) && (result.pickedQuantity !== undefined)) ? result.pickedQuantity : 0
                                        };

                                        putSublistArray.push(temp);
                                        setImmediate(callback);
                                    }
                                });
                            }, function (err) {
                                if (err)
                                    callbackDone(err);
                                else
                                    setImmediate(callbackDone);
                            });
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('3', {data: putSublistArray, message: 'Operation Successful', status: 'success', statusCode: '200'});
                    }
                });
            });

            // Calling End
            flowController.on('3', function (putSublistArray) {

                flowController.emit('END', putSublistArray);
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

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// Get All picklist and send to device
//---------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/get/description/:deviceId/')

        .get(function (req, res) {

            var consoleLog = 0;
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var deviceId = req.params.deviceId.trim();

            var flowController = new EventEmitter();

            // Check if device has allowed PUT activity
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                deviceAreaAllocationModel.findOne({'deviceId': deviceId, 'process': 'PICK', 'activeStatus': 1}, function (err, deviceAreaAllocationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (deviceAreaAllocationRow == null) {

                        flowController.emit('ERROR', {message: 'No zones allocated for device to process PICK Activity.', status: 'error', pickMobile: 'false', statusCode: '304'});
                    } else {

                        flowController.emit('1');
                    }
                });
            });

            // Check if device allowed picklist     
            flowController.on('1', function () {

                (consoleLog) ? console.log('1') : '';

                pickListArray = [];
                //console.log({'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'status': {$nin: [31, 35]}}}, 'activeStatus': 1}, {'name': 1, 'pickRate': 1, 'resourceAssigned.$': 1, 'timeCreated': 1});
                pickListModel.find({'resourceAssigned': {'$elemMatch': {'deviceId': deviceId, 'status': {$nin: [31, 35]}}}, 'activeStatus': 1}, {'name': 1, 'pickRate': 1, 'resourceAssigned': 1, 'timeCreated': 1}).sort({'timeCreated': 1}).exec(function (err, pickListModelRow) {
                    if (err) {

                        flowController.emit('error', ({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'}));
                    } else if (pickListModelRow.length == 0) {

                        flowController.emit('end', {message: "There are no activated picklists available!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(pickListModelRow, function (element2, callback2) {

                            var resourceAssigned = element2.resourceAssigned;

                            async.eachSeries(resourceAssigned, function (element, callback) {

                                if (element.deviceId != deviceId) {

                                    setImmediate(callback);
                                } else if (element.status == 31) {

                                    setImmediate(callback);
                                } else {

                                    pickSubListModel.find({'pickListId': String(element2._id), 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': element.lot, 'reasonToForceDone': {$exists: false}, 'activeStatus': 1}, function (err, pickSubListModelRow) {
                                        if (err) {

                                            callback(err);
                                        } else if (pickSubListModelRow.length == 0) {

                                            setImmediate(callback);
                                        } else {

                                            tempArray = [];
                                            tempArray.push(element);

                                            var temp = {};
                                            temp.pickListId = String(element2._id);
                                            temp.resourceAssigned = tempArray;
                                            temp.timeCreated = element2.timeCreated;
                                            temp.name = element2.name;
                                            temp.pickRate = element2.pickRate;

                                            pickListArray.push(temp);
                                            setImmediate(callback);
                                        }
                                    });
                                }
                            }, function (err) {
                                if (err)
                                    flowController.emit('ERROR', err);
                                else
                                    setImmediate(callback2);
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', err);
                            else if (pickListArray.length == 0)
                                flowController.emit('end', {message: 'No Picklist available for you..', status: 'error', statusCode: '404'});
                            else
                                flowController.emit('2', pickListArray);
                        });
                    }
                });
            });

            // Find picklist
            flowController.on('2', function (pickListArray) {

                console.log(JSON.stringify(pickListArray));

                (consoleLog) ? console.log('2') : '';

                var pickSublistArray = [];

                async.eachSeries(pickListArray, function (element, callback) {

                    async.eachSeries(element.resourceAssigned, function (element2, callback2) {

                        pickSubListModel.find({'pickListId': element.pickListId, 'resourceAssigned.deviceId': deviceId, 'resourceAssigned.lot': element2.lot, 'reasonToForceDone': {$exists: false}, 'activeStatus': 1}, function (err, pickSubListModelRow) {

                            async.eachSeries(pickSubListModelRow, function (result, callback3) {

                                var itemStoreId = result.itemStoreId[0];

                                itemStoresModel.findOne({'_id': itemStoreId, 'activeStatus': 1}, function (err, itemStoreRow) {

                                    if (err) {

                                        callback3({message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                                    } else if (itemStoreRow == null) {

                                        setImmediate(callback3);
                                    } else {
                                        var temp = {
                                            pickListId: result.pickListId,
                                            pickSubListId: result._id,
                                            sequenceId: result.sequence,
                                            lot: element2.lot,
                                            name: element.name + '_' + element2.lot,
                                            pickRate: ('pickRate' in element) && (element.pickRate !== undefined) ? element.pickRate : 0, // element.pickRate,
                                            targetRate: 0,
                                            currentRate: 0,
                                            itemType: result.itemType,
                                            itemValue: result.itemValue,
                                            itemCode: result.itemCode,
                                            serialNumberArray: result.serialNumberArray,
                                            itemDescription: result.itemDescription,
                                            itemQuantity: result.requiredQuantity,
                                            palletNumber: (result.itemType === 'PALLET') ? result.itemValue : '',
                                            customPalletNumber: ('customPalletNumber' in result) && (result.customPalletNumber !== undefined) ? result.customPalletNumber : '',
                                            pickLocation: result.pickLocationAddress,
                                            dropLocation: result.dropLocationAddress,
                                            palletType: (result.itemType === 'PALLET') ? result.palletType : '',
                                            palletSize: (result.itemType === 'PALLET') ? result.palletSize : '',
                                            orderNumber: (itemStoreRow.orderNumber) ? itemStoreRow.orderNumber : 0,
                                            status: result.status,
                                            pickedQuantity: (('pickedQuantity' in result) && (result.pickedQuantity !== undefined)) ? result.pickedQuantity : 0
                                        };

                                        pickSublistArray.push(temp);
                                        setImmediate(callback3);
                                    }
                                });
                            }, function (err) {
                                if (err)
                                    callback2({message: err, status: 'error', statusCode: '404'});
                                else
                                    setImmediate(callback2);
                            });
                        });
                    }, function (err) {
                        if (err)
                            callback({message: err, status: 'error', statusCode: '404'});
                        else
                            setImmediate(callback);
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '404'});
                    else
                        flowController.emit('3', pickSublistArray);
                });
            });

            //
            flowController.on('3', function (pickSublistArray) {

                (consoleLog) ? console.log('3') : '';

                flowController.emit('end', {data: pickSublistArray, message: 'Operation Successful', status: 'success', statusCode: '200'});
            });

            //
            flowController.on('end', function (result) {

                (consoleLog) ? console.log('end') : '';

                res.json(result);
            });

            //
            flowController.on('error', function (error) {

                (consoleLog) ? console.log('error') : '';

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // To be kept at the end always
            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// Get Put-Pick combination API
//---------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/web/pickList/configuration/description/pickList-putList/')

        .post(function (req, res) {

            var consoleVar = 0;

            (consoleVar) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceId = req.body.deviceId.trim();

            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                async.waterfall([
                    // Get All Picklist
                    function (picklistCallback) {

                        var requestifyUrl = baseUrl + '/v1/processMaster/web/pickList/configuration/get/description/' + deviceId + '/';

                        requestify.get(requestifyUrl).then(function (response) {

                            var result = response.getBody();

                            //console.log('Picklist result' + JSON.stringify(result));

                            if (result.status === 'success') {

                                picklistCallback(null, result);
                            }

                            if (result.status === 'error') {

                                picklistCallback(null, result);
                            }
                        });
                    },
                    // Get All Putlist
                    function (picklistData, putListCallback) {

                        var requestifyUrl = baseUrl + '/v1/processMaster/web/putList/configuration/get/description/' + deviceId + '/';

                        requestify.get(requestifyUrl).then(function (response) {

                            var result = response.getBody();

                            //console.log('Putlist result' + result);

                            if (result.status === 'success') {

                                putListCallback(null, picklistData, result);
                            }

                            if (result.status === 'error') {

                                putListCallback(null, picklistData, result);
                            }
                        });
                    },
                    // Combine All
                    function (picklistData, putlistData, finalCallback) {

                        resultDataArray = [];

                        resultDataObject = {};

                        // Picklist
                        resultDataObject.pickList = (picklistData.status == 'success') ? picklistData.data.length : 0;
                        resultDataObject.pickListData = (picklistData.status == 'success') ? picklistData.data : [];
                        // Putlist
                        resultDataObject.putList = (putlistData.status == 'success') ? putlistData.data.length : 0;
                        resultDataObject.putListData = (putlistData.status == 'success') ? putlistData.data : [];

                        resultDataArray.push(resultDataObject);

                        finalCallback(null, resultDataArray);
                    }
                    // Done
                ], function (err, result) {
                    if (err)
                        flowController.emit('ERROR', err);
                    else
                        flowController.emit('END', {activity: result, message: 'Operation Successful', status: 'success', statusCode: 200});
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
//------------------------------------------------------------------------------------------------------------------------
// Get all zones for mobile
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/mobile/location/action/read/all-zone/:warehouseId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            var zoneIdArr = [];

            flowController.on('START', function () {

                locationStoreModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, locationRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (locationRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No locations details available in system!', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationRow, function (element, callback) {

                            zoneIdArr.push({zoneId: element.zoneId, customerAddress: element.customerAddress, function: element.function});
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('1', zoneIdArr);
                        });
                    }
                });
            });

            flowController.on('1', function (getZoneId) {

                var arrZoneName = [];

                async.eachSeries(getZoneId, function (element, callback) {

                    zoneMasterModel.findOne({'_id': element.zoneId, activeStatus: 1}, function (err, zoneRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (zoneRow == null) {

                            flowController.emit('ERROR', {message: 'Zone details not found in system', status: 'error', statusCode: '404'});
                        } else {

                            var data = {};
                            data.zoneName = zoneRow.zone;
                            data.customerAddress = element.customerAddress;
                            data.function = element.function;

                            arrZoneName.push(data);
                            setImmediate(callback);
                        }
                    });

                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('2', arrZoneName);
                });
            });

            flowController.on('2', function (arrZoneName) {

                var arrZoneType = [];

                async.eachSeries(arrZoneName, function (element, callback) {

                    ruleEngineModel.findOne({'location': element.customerAddress, activeStatus: 1}, function (err, ruleEngineRow) {

                        if (err) {

                            flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                        } else if (ruleEngineRow == null) {

                            // Add alert here!
                            setImmediate(callback);
                        } else {

                            var data = {};
                            data.palletType = ruleEngineRow.palletType;
                            data.palletSize = ruleEngineRow.palletSize;
                            data.customerAddress = element.customerAddress;
                            data.zoneName = element.zoneName;
                            data.function = element.function;

                            arrZoneType.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', arrZoneType);
                });
            });

            flowController.on('END', function (result) {

                res.json({message: 'Operation Successfully', data: result, status: 'success', statusCode: '201'});
            });

            flowController.on('ERROR', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// Remove conflicted putlists from device
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/putList/action/truncate/conflict-assignment/:deviceId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceId = req.params.deviceId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                putListModel.find({'$and': [{'resourceAssigned.0': {'$exists': true}, 'resourceAssigned.deviceId': {'$ne': deviceId}}], 'activeStatus': 1}, function (err, putListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (putListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: 'Operation Successful!', status: 'success', statusCode: '200'});
                    } else {

                        conflictPutListArray = [];

                        async.eachSeries(putListRow, function (element, callback) {

                            var temp = {};
                            temp.putListId = element._id;
                            temp.putListName = element.name;
                            temp.deviceId = element.resourceAssigned[0].deviceId;

                            conflictPutListArray.push(temp);
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {data: conflictPutListArray, message: 'Operation Successful!', status: 'success', statusCode: '200'});
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
//------------------------------------------------------------------------------------------------------------------------
// Remove Withdrawn picklists/line-items
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickList/action/truncate/withdrawn-assignment/:deviceId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var deviceId = req.params.deviceId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                pickListModel.find({'resourceAssigned.deviceId': deviceId, 'activeStatus': 1}, function (err, pickListRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: 'INTERNAL SERVER ERROR ' + err, status: 'error', statusCode: '500'});
                    } else if (pickListRow.length == 0) {

                        flowController.emit('ERROR', {data: [], message: 'Operation Successful!', status: 'success', statusCode: '200'});
                    } else {

                        conflictPutListArray = [];

                        async.eachSeries(pickListRow, function (element, callback) {

                            var temp = {};
                            temp.pickListId = element._id;
                            temp.pickListName = element.name;
                            temp.deviceId = element.resourceAssigned[0].deviceId;

                            conflictPutListArray.push(temp);
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {data: conflictPutListArray, message: 'Operation Successful!', status: 'success', statusCode: '200'});
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
//------------------------------------------------------------------------------------------------------------------------
// Assign line items to device
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickList/action/request-picklist/initial-lot/')

        .post(function (req, res) {

            var showConsole = 1;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var dataObject = req.body;

            var date = moment(new Date()).format('DD/MM/YY');

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log("START") : '';

                flowController.emit('1');
                flowController.emit('2');
            });
            //
            //
            flowController.on('1', function () {

                (showConsole) ? console.log("1") : '';

                pickListService.updateStatusToAssign(dataObject, function (err, response) {
                    if (err)
                        res.json(err);
                    else
                        res.json(response);
                });
            });
            //
            //
            flowController.on('2', function () {

                (showConsole) ? console.log("2") : '';

                devicesTrackingModel.find({userId: dataObject.userId, deviceId: dataObject.deviceId, status: "LOGIN", date: date, "activeStatus": 1}).sort({'timeCreated': -1}).exec(function (err, devicesTrackingRow) {
                    if (err) {

                        console.log({message: 'INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!', status: 'error', statusCode: '500'});
                    } else if (devicesTrackingRow.length == 0) {

                        console.log({data: [], "recordsTotal": 0, "recordsFiltered": 0, message: "devicesTracking data missing! Data tampered/removed from system.", status: 'error', statusCode: '404'});
                    } else {

                        if (devicesTrackingRow[0].status == "LOGIN") {

                            var query = {_id: devicesTrackingRow[0]._id, 'userId': dataObject.userId, deviceId: dataObject.deviceId};
                            var update = {'selectedMHE': dataObject.materialHandlingUnit};

                            devicesTrackingModel.update(query, update, function (err, devicesTracking) {
                                if (err)
                                    console.log("err" + err);
                                else
                                    console.log("success");
                            });
                        } else {

                            console.log("err");
                        }
                    }
                });
            });

            flowController.on('END', function (result) {
                //res.json(result);
                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});
            });

            flowController.on('ERROR', function (error) {

                logger.error(err.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//------------------------------------------------------------------------------------------------------------------------
// Assign line items to device
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/processMaster/mobile/pickList/action/request-picklist/next-lot/')

        .post(function (req, res) {

            var dataObject = req.body;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            pickListService.assignNextLot(dataObject, function (err, response) {
                if (err) {
                    logger.error(err.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                    res.json(err);
                } else {

                    res.json(response);
                }
            });
        });
//
//
module.exports = router;