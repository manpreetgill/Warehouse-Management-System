var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var virtualLocationsModel = require('../../../models/mongodb/locationMaster-virtualLocationStore/collection-virtualLocationStore.js');
var logger = require('../../../logger/logger.js');
var errorLogService = require('../../../service-factory/errorLogService');
//---------------------------------------------------------------------------------------------------------------------------
// Get All Virtual locations
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/virtual-location/:warehouseId/')

        .get(function (req, res, next) {

            var showConsole = 1;

           var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            (showConsole) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var virtualLocationArray = [];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                virtualLocationsModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, virtualLocationRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualLocationRow.length == 0) {

                        flowController.emit('ERROR', {message: "No Virtual Locations found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(virtualLocationRow, function (element, callback) {

                            var virtualLocationData = {
                                warehouseId: element.warehouseId,
                                virtualLocationStoreId: String(element._id),
                                name: element.name,
                                comments: element.comments,
                                typeOfVirtualStore: element.typeOfVirtualStore,
                                timeCreated: element.timeCreated
                            };
                            virtualLocationArray.push(virtualLocationData);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: virtualLocationArray, status: 'success', statusCode: '200'});
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
                    MODULE: 'READ-VIRTUAL-LOCATION',
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
// Create virtual locations (AUTO API)
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualLocation/configuration/create/virtual-store/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();//MongoId of warehouse

            var typeOfVirtualStoreArray = [
                {'typeName': 'IL', 'name': 'INVENTORY-LOSS'},
                {'typeName': 'EI', 'name': 'EXPECTED-INVENTORY'},
                {'typeName': 'ID', 'name': 'INVENTORY-DATA-ERROR'},
                {'typeName': 'BR', 'name': 'BOX-REJECT'}
            ];

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                async.eachSeries(typeOfVirtualStoreArray, function (element, callback) {

                    virtualLocationsModel.findOne({'name': element.name, 'activeStatus': 1}, function (err, virtualLocationRow) {

                        if (err) {

                            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                        } else if (virtualLocationRow != null) {

                            setImmediate(callback);
                        } else {

                            var newVirtualLocation = new virtualLocationsModel();

                            newVirtualLocation.warehouseId = warehouseId;
                            newVirtualLocation.name = element.name;
                            newVirtualLocation.typeName = element.typeName;
                            newVirtualLocation.timeCreated = timeInInteger;
                            newVirtualLocation.activeStatus = 1;

                            newVirtualLocation.save(function (err) {
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

                        flowController.emit('ERROR', {message: "Virtual store successful!", status: 'success', statusCode: '201'});
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
                    MODULE: 'CREATE-VIRTUAL-LOCATION',
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
// Create virtual locations
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualLocation/action/create/virtual-store/')

        .post(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();//MongoId of warehouse

            var name = req.body.name.trim();

            var comments = req.body.comments.trim();

            var typeOfVirtualStore = req.body.typeOfVirtualStore.trim();

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';
                virtualLocationsModel.findOne({'name': name, 'activeStatus': 1}, function (err, virtualLocationRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualLocationRow != null) {

                        flowController.emit('ERROR', {message: 'Virtual location with same name already configured! Duplication not allowed.', status: 'error', statusCode: '304'});
                    } else {

                        var newVirtualLocation = new virtualLocationsModel();

                        newVirtualLocation.warehouseId = warehouseId;
                        newVirtualLocation.name = name;
                        newVirtualLocation.comments = comments;
                        newVirtualLocation.typeOfVirtualStore = typeOfVirtualStore;
                        newVirtualLocation.timeCreated = timeInInteger;
                        newVirtualLocation.activeStatus = 1;

                        newVirtualLocation.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "New virtual location added into the system!", status: 'success', statusCode: '201'});
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
                    MODULE: 'CREATE-VIRTUAL-LOCATION',
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
// Add item to virtual location
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualLocation/action/update-add/virtual-location/')// Add

        .put(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var virtualLocationStoreId = req.body.virtualLocationStoreId.trim();// Item categoryId

            var assignedItemStoreId = req.body.assignedItemStoreId.trim();// Item sub-categoryId

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                virtualLocationsModel.findOne({'_id': virtualLocationStoreId, 'assignedItemStoreId': assignedItemStoreId, 'activeStatus': 1}, function (err, virtualLocationRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualLocationRow != null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! item already present in virtual item store.", status: 'error', statusCode: '304'});
                    } else {

                        if (virtualLocationRow == null) {

                            virtualLocationsModel.update({'_id': virtualLocationStoreId}, {'$addToSet': {'assignedItemStoreId': assignedItemStoreId, 'timeUpdated': timeInInteger}}, function (err) {
                                if (err) {
                                    // error while adding records
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('END', {message: "Item added to virtual item store.", status: 'success', statusCode: '200'});
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
                    MODULE: 'UPDATE-VIRTUAL-LOCATION',
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
// Remove item from virtual location
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/virtualLocation/action/update-remove/virtual-location/')

        .put(function (req, res) {

            var showConsole = 1;

            (showConsole) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var virtualLocationStoreId = req.body.virtualLocationStoreId.trim();// Item categoryId

            var assignedItemStoreId = req.body.assignedItemStoreId.trim();// Item sub-categoryId

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (showConsole) ? console.log('START') : '';

                virtualLocationsModel.findOne({'_id': virtualLocationStoreId, 'assignedItemStoreId': assignedItemStoreId}, function (err, virtualLocationRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (virtualLocationRow == null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! item is not part of virtual item store.", status: 'error', statusCode: '304'});
                    } else {

                        virtualLocationsModel.update({'_id': virtualLocationStoreId}, {'$pull': {'assignedItemStoreId': assignedItemStoreId, 'timeUpdated': timeInInteger}}, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Item removed from virtual item store.", status: 'success', statusCode: '200'});
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
                    MODULE: 'REMOVE-VIRTUAL-LOCATION',
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