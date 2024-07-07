var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var warehouseMastersModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
var areaMastersModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var sideMastersModel = require('../../../models/mongodb/locationMaster-sideMaster/collection-sideMaster.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
//---------------------------------------------------------------------------------------------------------------------------
var errorLogService = require('../../../service-factory/errorLogService');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get Side Data
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/side/:levelId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var levelId = req.params.levelId;

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var arrSide = [];
            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                locationStoresModel.find({'levelId': levelId, 'activeStatus': 1}).sort({'systemAddress': 1}).exec(function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow.length == 0) {

                        flowController.emit('ERROR', {message: 'SIDE missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(locationStoreRow, function (element, callback) {

                            var data = {};
                            data.locationStoreId = element._id;
                            data.systemAddress = element.systemAddress;
                            data.customerAddress = element.customerAddress;

                            arrSide.push(data);
                            setImmediate(callback);
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {data: arrSide, status: 'success', statusCode: '201'});
                        });
                    }
                });
            });
            
            //END 
            flowController.on('END', function (result) {

                (showConsole) ? console.log('END') : '';
                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'READ-SIDE',
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
            
            //instlize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Create Side
//-------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/side/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var levelId = req.body.levelId.trim();

            var numberOfLocation = parseInt(req.body.numberOfLocation.trim());

            var createdBy = req.body.createdBy.trim();

            var systemAddressArray = [];

            var flowController = new EventEmitter();
            // Get Level data
            flowController.on('START', function () {

                levelMastersModel.findOne({'_id': levelId, 'activeStatus': 1}, function (err, levelMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Level missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var lineId = levelMasterRow.lineId;
                        var levelCodeString = levelMasterRow.levelCodeString;
                        flowController.emit('1', lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Line data
            flowController.on('1', function (lineId, levelId, levelCodeString) {

                lineMastersModel.findOne({'_id': lineId, 'activeStatus': 1}, function (err, lineMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Line missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var zoneId = lineMasterRow.zoneId;
                        flowController.emit('2', zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Zone data
            flowController.on('2', function (zoneId, lineId, levelId, levelCodeString) {

                zoneMastersModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Zone missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var areaId = zoneMasterRow.areaId;
                        flowController.emit('3', areaId, zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Area data
            flowController.on('3', function (areaId, zoneId, lineId, levelId, levelCodeString) {

                areaMastersModel.findOne({'_id': areaId, 'activeStatus': 1}, function (err, areaMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Area missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var warehouseId = areaMasterRow.warehouseId;
                        flowController.emit('4', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Side data
            flowController.on('4', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString) {

                sideMastersModel.find({"levelId": levelId, 'activeStatus': 1}, function (err, sideMastersRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (sideMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'The locations for this level already configured! Can\'t reconfigure again.', status: 'error', statusCode: '304'});
                    } else {

                        var newSideMaster = new sideMastersModel();

                        newSideMaster.levelId = levelId;
                        newSideMaster.numberOfLocation = numberOfLocation;
                        newSideMaster.timeCreated = timeInInteger;

                        newSideMaster.save(function (err, returnData) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                var sideId = returnData._id;

                                flowController.emit('5', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId);
                            }
                        });
                    }
                });
            });

            // Get System addresses
            flowController.on('5', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId) {

                systemAddressArray = [];

                for (var i = 1; i <= numberOfLocation; i++) {

                    var temp = {};

                    var systemAddressCode = function_getSystemAddressCode(i, 4);

                    var systemAddress = levelCodeString + systemAddressCode;

                    temp.systemAddressCode = i;
                    temp.systemAddress = systemAddress;
                    temp.sideId = sideId;

                    systemAddressArray.push(temp);

                    if (systemAddressArray.length === numberOfLocation) {

                        flowController.emit('6', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, systemAddressArray);
                    }
                }
            });

            // Add locations
            flowController.on('6', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, systemAddressArray, sequence) {

                var locationPropertiesArray = [];

                var locationPropertiesObject = {};
                locationPropertiesObject.userDefinedCapacity = '0';
                locationPropertiesObject.maxLength = "";
                locationPropertiesObject.maxWidth = "";
                locationPropertiesObject.maxHeight = "";
                locationPropertiesObject.maxDiameter = "";
                locationPropertiesObject.maxWeight = "";
                locationPropertiesObject.minLength = "";
                locationPropertiesObject.minWidth = "";
                locationPropertiesObject.minHeight = "";
                locationPropertiesObject.minDiameter = "";
                locationPropertiesObject.minWeight = "";

                locationPropertiesArray.push(locationPropertiesObject);

                async.eachSeries(systemAddressArray, function (element, callbackDone) {

                    var sideId = element.sideId;
                    var systemAddress = element.systemAddress;
                    var systemAddressCode = element.systemAddressCode;

                    locationStoresModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).sort({'sequenceId': -1}).exec(function (err, locationStoreRow) {

                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            var newSequence = (locationStoreRow.length != 0) ? parseInt(locationStoreRow[0].sequenceId) + 1 : 1;

                            locationStoresModel.find({'sideId': sideId, 'systemAddress': systemAddress, 'activeStatus': 1}).exec(function (err, locationStoreRow) {

                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow.length != 0) {

                                    callbackDone({message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                                } else {

                                    var newLocationStore = new locationStoresModel();

                                    newLocationStore.warehouseId = warehouseId;
                                    newLocationStore.areaId = areaId;
                                    newLocationStore.zoneId = zoneId;
                                    newLocationStore.lineId = lineId;
                                    newLocationStore.levelId = levelId;
                                    newLocationStore.sideId = sideId;
                                    newLocationStore.systemAddress = systemAddress;
                                    newLocationStore.systemAddressCode = systemAddressCode;
                                    newLocationStore.sequenceId = newSequence;
                                    newLocationStore.locationProperties = locationPropertiesArray;
                                    newLocationStore.availableCapacity = 0;
                                    newLocationStore.timeCreated = timeInInteger;
                                    newLocationStore.createdBy = createdBy;

                                    newLocationStore.save(function (err) {
                                        if (err)
                                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callbackDone);
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('END', {message: 'Locations configured.', status: 'success', statusCode: '304'});
                });
            });

            // End
            flowController.on('END', function (result) {

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-SIDE-ADD',
                    ERRORMESSAGE: error.message
                };
                errorLogService.createErrorLog(dataObject, function (err, response) {
                    if (err)
                        console.log('Entered error ');
                    else
                        console.log('Entered success ');
                });
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//---------------------------------------------------------------------------------------------------------------------------
// Check whether warehouse is completely configured or not
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/checkWarehouseConfiguration/:warehouseId/')

        .get(function (req, res) {

            var warehouseId = req.params.warehouseId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                warehouseMastersModel.findOne({'_id': warehouseId, 'activeStatus': 1}, function (err, warehouseRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse data missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var numberOfArea = warehouseRow.numberOfArea;
                        flowController.emit('1', numberOfArea);
                    }
                });
            });

            flowController.on('1', function (numberOfArea) {

                areaMastersModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, areaRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No area configured under warehouse.', status: 'error', statusCode: '404'});
                    } else if (areaRow.length != numberOfArea) {

                        flowController.emit('ERROR', {message: 'Warehouse Incomplete! Area issue.', status: 'error', statusCode: '304'});
                    } else {

                        var totalZone = 0;

                        async.eachSeries(areaRow, function (element, callback) {

                            totalZone = totalZone + element.numberOfZone;
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('2', totalZone);
                        });
                    }
                });
            });

            flowController.on('2', function (totalZone) {

                zoneMastersModel.find({'activeStatus': 1}, function (err, zoneRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No zone configured under warehouse.', status: 'error', statusCode: '404'});
                    } else if (zoneRow.length != totalZone) {

                        flowController.emit('ERROR', {message: 'Configuration incomplete! Zone issue.', status: 'error', statusCode: '304'});
                    } else {

                        var totalLine = 0;

                        async.eachSeries(zoneRow, function (element, callback) {

                            totalLine = totalLine + element.numberOfLine;
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('3', totalLine);
                        });
                    }
                });
            });

            flowController.on('3', function (totalLine) {

                lineMastersModel.find({'activeStatus': 1}, function (err, lineRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No line configured under warehouse.', status: 'error', statusCode: '404'});
                    } else if (lineRow.length != totalLine) {

                        flowController.emit('ERROR', {message: 'Configuration incomplete! Line issue.', status: 'error', statusCode: '304'});
                    } else {

                        var totalLevel = 0;

                        async.eachSeries(lineRow, function (element, callback) {

                            totalLevel = totalLevel + element.numberOfLevel;
                            setImmediate(callback);

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('4', totalLevel);
                        });
                    }
                });
            });

            flowController.on('4', function (totalLevel) {

                levelMastersModel.find({'activeStatus': 1}, function (err, levelRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No level configured under warehouse.', status: 'error', statusCode: '404'});
                    } else if (levelRow.length != totalLevel) {

                        flowController.emit('ERROR', {message: 'Configuration incomplete! Level issue.', status: 'error', statusCode: '304'});
                    } else {

                        flowController.emit('SEQ');
                    }
                });
            });

            flowController.on('SEQ', function () {

                locationStoresModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).lean().sort({systemAddress: 1}).exec(function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                    } else {

                        var count = 0;

                        async.eachSeries(locationStoreRow, function (element, callback) {

                            count++;
                            var locationStoreId = element._id;
                            locationStoresModel.findOne({_id: locationStoreId, 'warehouseId': warehouseId, 'activeStatus': 1}).exec(function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow == null) {

                                    callback({message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                                } else {

                                    locationStoreRow.sequenceId = count;
                                    locationStoreRow.save(function (err) {
                                        if (err)
                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callback);
                                    });
                                }
                            });
                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('END', {message: 'Warehouse completely configured!', status: 'success', statusCode: '200'});
                        });
                    }
                });
            });

            flowController.on('END', function (result) {

                res.json(result);
            });

            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-CHECK_WAREHOUSE_CONFIGURATION-READ',
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
// Read locations side
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/readLocationSide/:locationStoreId/')

        .get(function (req, res) {

            var locationStoreId = req.params.locationStoreId.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();
            // Get Level data
            flowController.on('START', function () {

                locationStoresModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('ERROR', {message: 'location store Id missing or modified.', status: 'error', statusCode: '404'});
                    } else {

                        var arr = [];

                        var idData = {
                            areaId: locationStoreRow.areaId,
                            zoneId: locationStoreRow.zoneId,
                            lineId: locationStoreRow.lineId,
                            levelId: locationStoreRow.levelId,
                            customerAddress: locationStoreRow.customerAddress
                        };
                        arr.push(idData);
                        flowController.emit('1', arr);
                    }
                });
            });

            flowController.on('1', function (arrData) {

                var areaArr = [];

                async.eachSeries(arrData, function (element, callback) {

                    areaMastersModel.findOne({'_id': element.areaId, 'activeStatus': 1}, function (err, areaRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (areaRow == null) {

                            setImmediate(callback);
                        } else {

                            var data = {
                                areaName: areaRow.area,
                                areaId: element.areaId,
                                zoneId: element.zoneId,
                                lineId: element.lineId,
                                levelId: element.levelId,
                                customerAddress: element.customerAddress
                            };
                            areaArr.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    else
                        flowController.emit('2', areaArr);
                });
            });

            flowController.on('2', function (arrData) {

                var zoneArr = [];

                async.eachSeries(arrData, function (element, callback) {

                    zoneMastersModel.findOne({'_id': element.zoneId, 'activeStatus': 1}, function (err, zoneRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (zoneRow == null) {

                            setImmediate(callback);
                        } else {

                            var data = {
                                areaName: element.areaName,
                                areaId: element.areaId,
                                zoneName: zoneRow.zone,
                                zoneId: element.zoneId,
                                lineId: element.lineId,
                                levelId: element.levelId,
                                customerAddress: element.customerAddress
                            };
                            zoneArr.push(data);
                            setImmediate(callback);
                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', zoneArr);
                    }
                });
            });

            flowController.on('3', function (arrData) {

                var lineArr = [];

                async.eachSeries(arrData, function (element, callback) {

                    lineMastersModel.findOne({'_id': element.lineId, 'activeStatus': 1}, function (err, lineRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (lineRow == null) {
                            setImmediate(callback);
                        } else {

                            var data = {
                                areaName: element.areaName,
                                areaId: element.areaId,
                                zoneName: element.zoneName,
                                zoneId: element.zoneId,
                                lineName: lineRow.line,
                                lineId: element.lineId,
                                levelId: element.levelId,
                                customerAddress: element.customerAddress
                            };
                            lineArr.push(data);
                            setImmediate(callback);

                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('4', lineArr);
                    }
                });
            });

            flowController.on('4', function (arrData) {

                var levelArr = [];

                async.eachSeries(arrData, function (element, callback) {

                    levelMastersModel.findOne({'_id': element.levelId, 'activeStatus': 1}, function (err, levelRow) {
                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (levelRow == null) {

                            setImmediate(callback);
                        } else {

                            var data = {
                                areaName: element.areaName,
                                areaId: element.areaId,
                                zoneName: element.zoneName,
                                zoneId: element.zoneId,
                                lineName: element.lineName,
                                lineId: element.lineId,
                                levelName: levelRow.level,
                                levelId: element.levelId,
                                customerAddress: element.customerAddress
                            };
                            levelArr.push(data);
                            setImmediate(callback);

                        }
                    });
                }, function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', levelArr);
                    }
                });
            });

            flowController.on('END', function (result) {

                res.json({data: result, message: 'Opertion Suceesfully.', status: 'success', statusCode: '304'});
            });

            flowController.on('ERROR', function (error) {

                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                var dataObject = {
                    MODULE: 'LOCATION-LOCATION_SIDE-READ',
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
//Add new side in warehouse

//---------------------------------------------------------------------------------------------------------------------------
// update Side
//-------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/side/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var levelId = req.body.levelId.trim();

            var numberOfLocation = parseInt(req.body.numberOfLocation.trim());

            var modifiedBy = req.body.modifiedBy.trim();

            var systemAddressArray = [];

            var flowController = new EventEmitter();

            // Get Level data
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                levelMastersModel.findOne({'_id': levelId, 'activeStatus': 1}, function (err, levelMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (levelMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Level missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var lineId = levelMasterRow.lineId;
                        var levelCodeString = levelMasterRow.levelCodeString;
                        flowController.emit('1', lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Line data
            flowController.on('1', function (lineId, levelId, levelCodeString) {

                (consoleLog) ? console.log('1') : '';

                lineMastersModel.findOne({'_id': lineId, 'activeStatus': 1}, function (err, lineMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (lineMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Line missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else if (lineMasterRow != null) {

                        var zoneId = lineMasterRow.zoneId;
                        flowController.emit('2', zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Zone data
            flowController.on('2', function (zoneId, lineId, levelId, levelCodeString) {

                (consoleLog) ? console.log('2') : '';

                zoneMastersModel.findOne({'_id': zoneId, 'activeStatus': 1}, function (err, zoneMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (zoneMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Zone missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var areaId = zoneMasterRow.areaId;
                        flowController.emit('3', areaId, zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Area data
            flowController.on('3', function (areaId, zoneId, lineId, levelId, levelCodeString) {

                (consoleLog) ? console.log('3') : '';

                areaMastersModel.findOne({'_id': areaId, 'activeStatus': 1}, function (err, areaMasterRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (areaMasterRow == null) {

                        flowController.emit('ERROR', {message: 'Area missing! Details tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var warehouseId = areaMasterRow.warehouseId;
                        flowController.emit('4', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString);
                    }
                });
            });

            // Get Side data
            flowController.on('4', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString) {
                (consoleLog) ? console.log('4') : '';

                sideMastersModel.findOne({"levelId": levelId, 'activeStatus': 1}, function (err, sideMastersRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (sideMastersRow == null) {

                        flowController.emit('ERROR', {message: 'The locations for this level already configured! Can\'t reconfigure again.', status: 'error', statusCode: '304'});
                    } else {

                        var sideId = String(sideMastersRow._id);
                        var newNumberOfLocation = parseInt(sideMastersRow.numberOfLocation) + parseInt(numberOfLocation);

                        var query = {'levelId': levelId};
                        var update = {'$set': {'numberOfLocation': newNumberOfLocation, timeModified: timeInInteger}};

                        sideMastersModel.update(query, update, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: "Technical error occurred! " + err, status: 'error', statusCode: '500'});
                            else
                                flowController.emit('5', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId);
                        });
                    }
                });
            });

            //
            flowController.on('5', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId) {

                (consoleLog) ? console.log('5') : '';

                locationStoresModel.find({areaId: areaId, 'levelId': levelId, 'activeStatus': 1}).sort({'systemAddress': -1}).exec(function (err, locationStoreRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow.length == 0) {

                        flowController.emit('ERROR', {message: 'SIDE missing! Records tampered/removed from system.', status: 'error', statusCode: '404'});
                    } else {

                        var lastlocationAddress = locationStoreRow[0].systemAddress;
                        flowController.emit('6', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, lastlocationAddress);
                    }
                });
            });

            // Get System addresses
            flowController.on('6', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, lastlocation) {

                (consoleLog) ? console.log('6') : '';

                systemAddressArray = [];

                var systemAddressArr = [];
                var last2 = lastlocation.slice(-2);

                for (var i = 1; i <= numberOfLocation; i++) {

                    var temp = {};
                    if (systemAddressArray.length == 0) {

                        var systemAddress;
                        var systemAddressCode = parseInt(last2) + 1;
                        systemAddressArray.push(systemAddressCode);

                        if (last2 > 99 && last <= 999) {

                            systemAddress = levelCodeString + "0" + systemAddressCode;
                        } else if (last2 > 999) {

                            systemAddress = levelCodeString + systemAddressCode;
                        } else {

                            var zeroToAppend = (systemAddressCode <= 9) ? '000' : '00';
                            systemAddress = levelCodeString + zeroToAppend + systemAddressCode;
                        }

                        temp.systemAddressCode = systemAddressCode;
                        temp.systemAddress = systemAddress;
                        temp.sideId = sideId;
                        systemAddressArr.push(temp);

                    } else {

                        last = systemAddressArray.slice(-1)[0];

                        var systemAddressCode = parseInt(last) + 1;

                        systemAddressArray.push(systemAddressCode);

                        if (last > 99 && last <= 999) {

                            var systemAddress = levelCodeString + "0" + systemAddressCode;
                        } else if (last > 999) {

                            var systemAddress = levelCodeString + systemAddressCode;
                        } else {

                            var zeroToAppend = (systemAddressCode <= 9) ? '000' : '00';
                            var systemAddress = levelCodeString + zeroToAppend + systemAddressCode;
                        }

                        temp.systemAddressCode = systemAddressCode;
                        temp.systemAddress = systemAddress;
                        temp.sideId = sideId;
                        systemAddressArr.push(temp);
                    }

                    if (systemAddressArr.length === numberOfLocation) {

                        flowController.emit('7', warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, systemAddressArr);
                    }
                }
            });

            // Add locations
            flowController.on('7', function (warehouseId, areaId, zoneId, lineId, levelId, levelCodeString, sideId, systemAddressArray) {

                (consoleLog) ? console.log('7') : '';

                var locationPropertiesArray = [];

                var locationPropertiesObject = {};
                locationPropertiesObject.userDefinedCapacity = '0';
                locationPropertiesObject.maxLength = "";
                locationPropertiesObject.maxWidth = "";
                locationPropertiesObject.maxHeight = "";
                locationPropertiesObject.maxDiameter = "";
                locationPropertiesObject.maxWeight = "";
                locationPropertiesObject.minLength = "";
                locationPropertiesObject.minWidth = "";
                locationPropertiesObject.minHeight = "";
                locationPropertiesObject.minDiameter = "";
                locationPropertiesObject.minWeight = "";

                locationPropertiesArray.push(locationPropertiesObject);

                async.eachSeries(systemAddressArray, function (element, callbackDone) {

                    var sideId = element.sideId;
                    var systemAddress = element.systemAddress;
                    var systemAddressCode = element.systemAddressCode;

                    locationStoresModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).sort({'sequenceId': -1}).exec(function (err, locationStoreRow) {
                        if (err) {

                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else {

                            locationStoresModel.find({'sideId': sideId, 'systemAddress': element.systemAddress, 'activeStatus': 1}).exec(function (err, locationStoreRow) {
                                if (err) {

                                    callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow.length != 0) {

                                    callbackDone({message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                                } else {

                                    var newLocationStore = new locationStoresModel();

                                    newLocationStore.warehouseId = warehouseId;
                                    newLocationStore.areaId = areaId;
                                    newLocationStore.zoneId = zoneId;
                                    newLocationStore.lineId = lineId;
                                    newLocationStore.levelId = levelId;
                                    newLocationStore.sideId = sideId;
                                    newLocationStore.systemAddress = systemAddress;
                                    newLocationStore.systemAddressCode = systemAddressCode;
                                    newLocationStore.locationProperties = locationPropertiesArray;
                                    newLocationStore.availableCapacity = 0;
                                    newLocationStore.timeModified = timeInInteger;
                                    newLocationStore.modifiedBy = modifiedBy;

                                    newLocationStore.save(function (err) {
                                        if (err)
                                            callbackDone({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callbackDone);
                                    });
                                }
                            });
                        }
                    });
                }, function (err) {
                    if (err)
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '304'});
                    else
                        flowController.emit('SEQ', warehouseId);
                });
            });

            //reset sequence
            flowController.on('SEQ', function (warehouseId) {

                (consoleLog) ? console.log('sequence') : '';

                locationStoresModel.find({'warehouseId': warehouseId, 'activeStatus': 1}).lean().sort({systemAddress: 1}).exec(function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow.length == 0) {

                        flowController.emit('ERROR', {message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                    } else {

                        var count = 0;
                        async.eachSeries(locationStoreRow, function (element, callback) {

                            count++;

                            var locationStoreId = element._id;

                            locationStoresModel.findOne({_id: locationStoreId, 'warehouseId': warehouseId, 'activeStatus': 1}).exec(function (err, locationStoreRow) {

                                if (err) {

                                    callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (locationStoreRow.length == 0) {

                                    callback({message: 'Records with this system address found! Error while configuring location store.', status: 'error', statusCode: '404'});
                                } else {

                                    locationStoreRow.sequenceId = count;
                                    locationStoreRow.save(function (err) {
                                        if (err)
                                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        else
                                            setImmediate(callback);
                                    });
                                }
                            });

                        }, function (err) {
                            if (err)
                                flowController.emit('ERROR', {message: err, status: 'success', statusCode: '304'});
                            else
                                flowController.emit('END', {message: 'Locations configured.', status: 'success', statusCode: '304'});
                        });
                        //
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
                var dataObject = {
                    MODULE: 'LOCATION-SIDE-UPDATE',
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

            // Initialize
            flowController.emit('START');
        });
//
//
var function_getSystemAddressCode = function (num, places) {

    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
};
//
//
module.exports = router;