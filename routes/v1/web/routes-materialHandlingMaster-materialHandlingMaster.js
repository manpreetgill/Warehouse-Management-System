var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var materialHandlingMasterModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingMaster/collection-materialHandlingMaster.js');
var materialHandlingComppnentsModel = require('../../../models/mongodb/materialHandlingMaster-materialHandlingComponents/collection-materialHandlingComponents.js');
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
var alertService = require('../../../service-factory/alertService.js');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
// Get Material Handling Equipment 
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/materialHandlingMaster/web/materialHandlingMaster/configuration/readAll/materialHandlingMaster/:warehouseId/')

        .get(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var flowController = new EventEmitter();

            var arrMaterialHandling = [];
            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                materialHandlingMasterModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, materialHandlingMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (materialHandlingMasterRow.length == 0) {

                        flowController.emit('ERROR', {message: "material handling master name not in system!", status: 'error', statusCode: '304', data: []});
                    } else {

                        async.eachSeries(materialHandlingMasterRow, function (element, callback) {
                            var userData = {
                                id: element._id,
                                name: element.name,
                                quantity: element.quantity,
                                availableQuantity: element.availableQuantity
                            };
                            arrMaterialHandling.push(userData);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: arrMaterialHandling, status: 'success', statusCode: '200'});
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
                    MODULE: 'READALL-MATERIALHANDLING',
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
//-----------------------------------------------------------------------------------------------------------------------------------------
// Add Material Handling Equipment
//-----------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/materialHandlingMaster/web/materialHandlingMaster/configuration/create/materialHandlingMaster/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var name = req.body.name.trim().toUpperCase();
            var quantity = req.body.quantity.trim();
            var availableQuantity = req.body.availableQuantity.trim();
            var createdBy = req.body.createdBy.trim();

            var flowController = new EventEmitter();

            var newMaterialHandlingMaster = new materialHandlingMasterModel();

            newMaterialHandlingMaster.warehouseId = warehouseId;
            newMaterialHandlingMaster.name = name; // Name of material handling unit
            newMaterialHandlingMaster.quantity = quantity; // Available quantity of material handling unit
            newMaterialHandlingMaster.availableQuantity = availableQuantity; // Once assigned to areas/zone the quantity will get decreased
            newMaterialHandlingMaster.timeCreated = timeInInteger;
            newMaterialHandlingMaster.createdBy = createdBy;


            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                materialHandlingMasterModel.find({'name': name, 'activeStatus': 1}, function (err, materialHandlingMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (materialHandlingMasterRow.length != 0) {

                        flowController.emit('ERROR', {message: "material handling master name already in system!", status: 'error', statusCode: '304'});
                    } else {

                        if (materialHandlingMasterRow.length == 0) {

                            newMaterialHandlingMaster.save(function (err, returnData) {
                                if (err) {

                                    flowController.emit('ERROR', {message: 'CAN\'T INSERT INTERNAL SERVER ERROR, UNKNOWN SERVER ERROR HAS OCCURRED!!!!!' + err, status: 'error', statusCode: '500'});
                                } else {

                                    //                                var materialHandlingMasterId = returnData._id;
                                    //
                                    //                                var promise_creatematerialHandlingComponents = new Promises(function (resolve, reject) {
                                    //
                                    //                                    for (var i = 1; i <= quantity; i++) {
                                    //
                                    //                                        var temp = {};
                                    //
                                    //                                        var nameAddressCode = function_getSystemAddressCode(i, 1);
                                    //
                                    //                                        var nameAuto = name + nameAddressCode;
                                    //
                                    //                                        temp.name = nameAuto;
                                    //                                        temp.materialHandlingMasterId = materialHandlingMasterId;
                                    //
                                    //                                        systemAddressArray.push(temp);
                                    //                                    }
                                    //                                    resolve(systemAddressArray);
                                    //                                });
                                    //
                                    //                                promise_creatematerialHandlingComponents.then(function (promise2_resolvedData) {
                                    //
                                    //                                    promise2_resolvedData.forEach(function (insertRow) {
                                    //
                                    //                                        var materialHandlingComppnentsModel = new materialHandlingComppnentsModel;
                                    //                                    });
                                    //                                });
                                    flowController.emit('END', {message: "material handling master  save into system!", status: 'success', statusCode: '201'});
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
                    MODULE: 'CREATE-MATERIALHANDLING',
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
// Update Material Handling Equipment
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/materialHandlingMaster/web/materialHandlingMaster/configuration/update/materialHandlingMaster/')

        .patch(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();
            var materialHandlingMasterId = req.body.materialHandlingMasterId.trim();
            var name = req.body.name.trim().toUpperCase();
            var quantity = req.body.quantity.trim();
            var availableQuantity = req.body.availableQuantity.trim();
            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                materialHandlingMasterModel.findOne({'_id': materialHandlingMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, materialHandlingMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (materialHandlingMasterRow == null) {

                        flowController.emit('ERROR', {message: "material handling master name does not exist in system!", status: 'error', statusCode: '304'});
                    } else {

                        materialHandlingMasterRow.name = name; // Name of material handling unit
                        materialHandlingMasterRow.quantity = quantity; // Available quantity of material handling unit
                        materialHandlingMasterRow.availableQuantity = availableQuantity; // Once assigned to areas/zone the quantity will get decreased
                        materialHandlingMasterRow.modifiedBy = modifiedBy;
                        materialHandlingMasterRow.timeModified = timeInInteger;

                        materialHandlingMasterModel.find({'name': name, 'activeStatus': 1}, function (err, materialHandlingMasterRowUp) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (materialHandlingMasterRowUp.length != 0) {

                                flowController.emit('ERROR', {message: "material handling master name already in system!", status: 'error', statusCode: '304'});
                            } else {

                                materialHandlingMasterRow.save(function (err) {
                                    if (err) {

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "material handling master  save into system!", status: 'success', statusCode: '201'});
                                    }
                                });
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
                    MODULE: 'UPDATE-MATERIALHANDLING',
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
// Remove Material Handling Equipment
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/materialHandlingMaster/web/materialHandlingMaster/configuration/delete/materialHandlingMaster/:warehouseId/:materialHandlingMasterId/')

        .delete(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();
            var materialHandlingMasterId = req.params.materialHandlingMasterId.trim();
            var modifiedBy = timeInInteger;
            //// Need to do various validations at the time of UI updation
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                materialHandlingMasterModel.findOne({'_id': materialHandlingMasterId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, materialHandlingMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (materialHandlingMasterRow == null) {

                        flowController.emit('ERROR', {message: "material handling master name does not exist in system!", status: 'error', statusCode: '304'});
                    } else {

                        if (materialHandlingMasterRow != null) {

                            materialHandlingMasterModel.update({'_id': materialHandlingMasterId, 'warehouseId': warehouseId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}}, function (err, userRow) {
                                if (err) {

                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('END', {message: 'Material Handling removed from the system!', status: 'success', statusCode: '201'});
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
                    MODULE: 'DELETE-MATERIALHANDLING',
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