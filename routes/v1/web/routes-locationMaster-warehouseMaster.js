var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var warehouseMasterModel = require('../../../models/mongodb/locationMaster-warehouseMaster/collection-warehouseMaster.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
var alertService = require('../../../service-factory/alertService.js');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
// Get warehouse details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/warehouse/:clientId/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var clientId = req.params.clientId.trim(); // MongoId of the warehouse

            var flowController = new EventEmitter();
            var warehouseMastersArray = [];

            // Find all the active rows in the item category collection 
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                warehouseMasterModel.findOne({'clientId': clientId, 'activeStatus': 1}, function (err, warehouseMasterRow) {

                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: "No warehouse configured into the system!", status: 'error', statusCode: '404'});
                    } else {

                        var warehouse = {};
                        warehouse.id = warehouseMasterRow._id;
                        warehouse.name = warehouseMasterRow.name;
                        warehouse.configName = warehouseMasterRow.configName;

                        warehouseMastersArray.push(warehouse);

                        flowController.emit('END', {message: "Operation Successful.", data: warehouseMastersArray, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-WAREHOUSE',
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
// Add warehouse
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/warehouse/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var clientId = req.body.clientId.trim(); //58f89ffd2f2dab5efcc56045

            var name = req.body.name.trim().toUpperCase();

            var configName = req.body.configName.trim();

            var autoBackLogTime = req.body.autoBackLogTime.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.find({'activeStatus': 1}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow.length != 0) {

                        flowController.emit('ERROR', {message: 'Warehouse already exist! More than one warehouse not supported yet.', status: 'success', statusCode: '304'});
                    } else {

                        var autoBackLog = autoBackLogTime.toString().split(":");

                        var newWarehouse = new warehouseMasterModel();

                        newWarehouse.clientId = clientId;
                        newWarehouse.name = name;
                        newWarehouse.configName = configName;
                        newWarehouse.autoBackLogTimeHours = autoBackLog[0];
                        newWarehouse.autoBackLogTimeMinutes = autoBackLog[1];
                        newWarehouse.timeCreated = timeInInteger;

                        newWarehouse.save(function (err, result) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'Your new warehouse is ready to proceed!', status: 'success', data: result._id, statusCode: '201'});
                            }
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
                    MODULE: 'CREATE-WAREHOUSE',
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
// Modify warehouse details
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/warehouse/')

        .put(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var newName = req.body.newName.trim().toUpperCase();

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.find({'name': newName}, function (err, warehouseMastersRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMastersRow.length != 0) {

                        flowController.emit('ERROR', {message: 'Can not update with the same name!', status: 'success', statusCode: '304'});
                    } else {

                        if (warehouseMastersRow.length == 0) {

                            warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {

                                warehouseMasterRow.name = newName;
                                warehouseMasterRow.timeModified = timeInInteger;
                                warehouseMasterRow.modifiedBy = modifiedBy;

                                warehouseMasterRow.save(function (err) {

                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: 'Warehouse details updated!', status: 'success', statusCode: '200'});
                                    }
                                });
                            });
                        }
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
                    MODULE: 'UPDATE-WAREHOUSE',
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
// Add area into warehouse
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/updateArea/warehouse/')

        .put(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var numberOfArea = req.body.numberOfArea.trim();

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {
                        if (warehouseMasterRow != null) {

                            var previousNumberOfAreaAdd = parseInt(warehouseMasterRow.numberOfArea);
                            previousNumberOfAreaAdd += parseInt(numberOfArea);
                            warehouseMasterRow.numberOfArea = previousNumberOfAreaAdd;
                            warehouseMasterRow.timeModified = timeInInteger;
                            warehouseMasterRow.modifiedBy = modifiedBy;

                            warehouseMasterRow.save(function (err) {

                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('END', {message: 'Warehouse details updated!', status: 'success', statusCode: '200'});
                                }
                            });
                        }
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
                    MODULE: 'UPDATE-AREA-WAREHOUSE',
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
// Modify warehouse target parameters
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/updateprocess/warehouse/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            warehouseId = req.body.warehouseId.trim();
            targetPickLines = req.body.targetPickLines.trim();
            targetPutLines = req.body.targetPutLines.trim();
            targetOrderCycleTime = req.body.targetOrderCycleTime.trim();
            targetOrderCompletion = req.body.targetOrderCompletion.trim();
            targetInventoryHandWeight = req.body.targetInventoryHandWeight.trim();
            targetWarehouseUtilization = req.body.targetWarehouseUtilization.trim();
            // targetDevices = req.body.targetDevices.trim();
            targetBackOrder = req.body.targetBackOrder.trim();
            targetOrderFillRate = req.body.targetOrderFillRate.trim();
            targetInventoryHandPrice = req.body.targetInventoryHandPrice.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        warehouseMasterRow.targetPickLines = targetPickLines;
                        warehouseMasterRow.targetPutLines = targetPutLines;
                        warehouseMasterRow.targetOrderCycleTime = targetOrderCycleTime;
                        warehouseMasterRow.targetOrderCompletion = targetOrderCompletion;
                        warehouseMasterRow.targetInventoryHandWeight = targetInventoryHandWeight;
                        warehouseMasterRow.targetWarehouseUtilization = targetWarehouseUtilization;
                        //warehouseMasterRow.targetDevices = targetDevices;
                        warehouseMasterRow.targetBackOrder = targetBackOrder;
                        warehouseMasterRow.targetOrderFillRate = targetOrderFillRate;
                        warehouseMasterRow.targetInventoryHandPrice = targetInventoryHandPrice;

                        warehouseMasterRow.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: 'warehouse Updated in system!!', status: 'success', statusCode: '200'});
                            }
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
                    MODULE: 'UPDATE-PROCESS-WAREHOUSE',
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
//------------------------------------------------------------------------------------------------------------------------
// Get warehouse target parameters 
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/updateprocess/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            var warehouseArr = [];

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.findOne({'_id': warehouseId}, function (err, warehouseMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: 'warehouse does not exist in system!!', status: 'error', statusCode: '404'});
                    } else {

                        var data = {
                            targetPickLines: warehouseMasterRow.targetPickLines,
                            targetPutLines: warehouseMasterRow.targetPutLines,
                            targetOrderCycleTime: warehouseMasterRow.targetOrderCycleTime,
                            targetOrderCompletion: warehouseMasterRow.targetOrderCompletion,
                            targetInventoryHandWeight: warehouseMasterRow.targetInventoryHandWeight,
                            targetWarehouseUtilization: warehouseMasterRow.targetWarehouseUtilization,
                            //warehouseMasterRow.targetDevices = targetDevices;
                            targetBackOrder: warehouseMasterRow.targetBackOrder,
                            targetOrderFillRate: warehouseMasterRow.targetOrderFillRate,
                            targetInventoryHandPrice: warehouseMasterRow.targetInventoryHandPrice
                        };
                        warehouseArr.push(data);
                        flowController.emit('END', {message: "Operation Successful.", data: warehouseArr, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-PROCESS-WAREHOUSE',
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
// GET Warehouse By ConfigName
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/getWarehouseByConfigName/:configName/')

        .get(function (req, res, next) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var configName = req.params.configName.trim();

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                warehouseMasterModel.findOne({'configName': configName, 'activeStatus': 1}, function (err, warehouseMasterRow) {

                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (warehouseMasterRow == null) {

                        flowController.emit('ERROR', {message: "No warehouse configured into the system!", status: 'error', statusCode: '404'});
                    } else {

                        var warehouse = {};
                        warehouse.id = warehouseMasterRow._id;
                        warehouse.name = warehouseMasterRow.name;

                        flowController.emit('END', {message: "Operation Successful.", data: warehouse, status: 'success', statusCode: '200'});
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
                    MODULE: 'CONFIG-PROCESS-WAREHOUSE',
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
module.exports = router;