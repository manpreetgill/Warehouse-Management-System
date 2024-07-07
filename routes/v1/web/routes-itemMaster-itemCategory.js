var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var logger = require('../../../logger/logger.js');
//------------------------------------------------------------------------------------------------------------------------
// API to get all the item categories from the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/itemCategory/:warehouseId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse
            // Find all the active rows in the item category collection
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemCategorysModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemCategorysRow) {

                    var itemCategorysArray = [];

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemCategorysRow.length == 0) {

                        flowController.emit('ERROR', {message: "No item-categories found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(itemCategorysRow, function (element, callback) {

                            var itemCategory = {};

                            itemCategory.id = element._id;
                            itemCategory.name = element.name;

                            itemCategorysArray.push(itemCategory);

                            setImmediate(callback);

                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "Error occurred " + err, status: 'error', statusCode: '404'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: itemCategorysArray, status: 'success', statusCode: '200'});
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
//------------------------------------------------------------------------------------------------------------------------
// API to create the Item Category into the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/itemCategory/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var itemCategoryName = req.body.itemCategoryName.trim().toUpperCase();// Name of Item Category - Trim extra spaces - Make uppercase

            var itemCategorys = new itemCategorysModel();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemCategorysModel.findOne({'name': itemCategoryName, 'activeStatus': 1}, function (err, itemCategorysRow) {// Make it uppercase

                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemCategorysRow != null) {
                        // Data already present in database || 304 - not modified
                        flowController.emit('ERROR', {message: "Already Present! Same category not allowed.", status: 'error', statusCode: '304'});
                    } else {

                        itemCategorys.warehouseId = warehouseId;
                        itemCategorys.name = itemCategoryName;
                        itemCategorys.timeCreated = timeInInteger;

                        itemCategorys.save(function (err) {

                            if (err) {// error while adding records                                
                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('END', {message: "New Item Category added.", status: 'success', statusCode: '201'});
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
//------------------------------------------------------------------------------------------------------------------------
// API to update the Name of Item category into the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/update/itemCategory/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// Parameter from body

            var itemCategoryId = req.body.itemCategoryId.trim();// Item categoryId

            var newName = req.body.newName.trim().toUpperCase();// Parameter from body

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemCategorysModel.findOne({'name': newName, 'activeStatus': 1}, function (err, itemCategorysRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemCategorysRow != null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! Item category with new name already present.", status: 'error', statusCode: '304'});
                    } else {

                        var query = {'_id': itemCategoryId, 'warehouseId': warehouseId};
                        var update = {'$set': {'name': newName, 'timeModified': timeInInteger}};

                        itemCategorysModel.update(query, update, function (err) {
                            if (err) {
                                // error while adding records
                                flowController.emit('ERROR', {message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                            } else {
                                flowController.emit('END', {message: "Category details updated!", status: 'success', statusCode: '200'});
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
//------------------------------------------------------------------------------------------------------------------------
// API to delete the Item Category from the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/delete/itemCategory/:warehouseId/:itemCategoryId/')

        .delete(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var itemCategoryId = req.params.itemCategoryId.trim();// MongoId of the category

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemCategorysModel.findOne({'_id': itemCategoryId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, itemCategorysRow) {

                    if (err) {// Serverside error

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        itemMasterModel.find({'category': itemCategoryId}, function (err, itemMasterRow) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow != 0) {

                                flowController.emit('ERROR', {message: "Category can not be deleted! This category is in use.", status: 'error', statusCode: '404'});
                            } else {

                                var query = {'_id': itemCategoryId, 'warehouseId': warehouseId, 'activeStatus': 1};
                                var update = {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}};

                                itemCategorysModel.update(query, update, function (err) {
                                    if (err) {// error while adding records

                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('END', {message: "Item category removed from system!", status: 'success', statusCode: '200'});
                                    }
                                });
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
module.exports = router;