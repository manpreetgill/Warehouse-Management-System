var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//------------------------------------------------------------------------------------------------------------------------
var itemCategorysModel = require('../../../models/mongodb/itemMaster-itemCategory/collection-itemCategory.js');
var itemSubCategorysModel = require('../../../models/mongodb/itemMaster-itemSubCategory/collection-itemSubCategory.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
//------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
//----------------------------------------------------------------------------------------------------------
// API to get all the item categories from the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/read/itemSubCategory/:itemCategoryId/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemCategoryId = req.params.itemCategoryId.trim();//

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemSubCategorysModel.find({'itemCategoryId': itemCategoryId, 'activeStatus': 1}, function (err, itemSubCategorysRow) {

                    var itemSubCategorysArray = [];

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemSubCategorysRow.length == 0) {

                        flowController.emit('ERROR', {message: "No Sub-Categories under this category found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(itemSubCategorysRow, function (element, callback) {

                            var itemSubCategory = {};
                            itemSubCategory.id = element._id;
                            itemSubCategory.name = element.name;

                            itemSubCategorysArray.push(itemSubCategory);
                            setImmediate(callback);
                        }, function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: itemSubCategorysArray, status: 'success', statusCode: '200'});
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
// API to Read All the Item Category into the database
//------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/readAll/itemSubCategory/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                // Find all the active rows in the item category collection 
                itemSubCategorysModel.find({'activeStatus': 1}, function (err, itemSubCategorysRow) {

                    var itemSubCategorysArray = [];

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemSubCategorysRow.length == 0) {

                        flowController.emit('ERROR', {data: itemSubCategorysArray, message: "No Sub-Categories under this category found!", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(itemSubCategorysRow, function (element, callback) {

                            var itemSubCategory = {};
                            itemSubCategory.id = element._id;
                            itemSubCategory.name = element.name;

                            itemSubCategorysArray.push(itemSubCategory);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: itemSubCategorysArray, status: 'success', statusCode: '200'});
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
router.route('/v1/itemMaster/web/item/configuration/create/itemSubCategory/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemCategoryId = req.body.itemCategoryId.trim();// MongoId of Item Category under which the sub category created 

            var itemSubCategoryName = req.body.itemSubCategoryName.trim().toUpperCase();// Name of Item Category - Trim extra spaces - Make uppercase

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemSubCategorysModel.find({'itemCategoryId': itemCategoryId, 'name': itemSubCategoryName, 'activeStatus': 1}, function (err, itemSubCategorysRow) {// Make it uppercase

                    if (err) {
                        // Serverside error
                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemSubCategorysRow.length != 0) {
                        // Data already present in database || 304 - not modified
                        flowController.emit('ERROR', {message: "Already Present! Same sub-category not allowed.", status: 'error', statusCode: '304'});
                    } else {

                        if (itemSubCategorysRow.length == 0) {
                            // Conflicting assignment - Both sub category and category should not be same
                            itemCategorysModel.findOne({'_id': itemCategoryId, 'name': itemSubCategoryName}, function (err, itemCategorysRow) {

                                if (err) {
                                    // Serverside error
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemCategorysRow != null) {
                                    // Data already present in database || 304 - not modified
                                    flowController.emit('ERROR', {message: "It's conflicting assignment! Same naming for Category and Sub-Category not allowed.", status: 'error', statusCode: '304'});
                                } else {

                                    if (itemCategorysRow == null) {

                                        var itemSubCategorys = new itemSubCategorysModel();

                                        itemSubCategorys.itemCategoryId = itemCategoryId;
                                        itemSubCategorys.name = itemSubCategoryName;
                                        itemSubCategorys.timeCreated = timeInInteger;

                                        itemSubCategorys.save(function (err) {

                                            if (err) {
                                                // error while adding records                                
                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                flowController.emit('END', {message: "New Item Sub-Category added.", status: 'success', statusCode: '201'});
                                            }
                                        });
                                    }
                                }
                            });// Make it uppercase    
                        }
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
router.route('/v1/itemMaster/web/item/configuration/update/itemSubCategory/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemCategoryId = req.body.itemCategoryId.trim();// Item categoryId

            var itemSubCategoryId = req.body.itemSubCategoryId.trim();// Item sub-categoryId

            var itemSubCategoryNewName = req.body.itemSubCategoryNewName.trim().toUpperCase();// Parameter from body Name
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemSubCategorysModel.findOne({'name': itemSubCategoryNewName, 'activeStatus': 1}, function (err, itemSubCategorysRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemSubCategorysRow != null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! Item's sub-category with new name already present.", status: 'error', statusCode: '304'});
                    } else {

                        if (itemSubCategorysRow == null) {

                            itemCategorysModel.findOne({'_id': itemCategoryId, 'name': itemSubCategoryNewName}, function (err, itemCategorysRow) {

                                if (err) {
                                    // Serverside error
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else if (itemCategorysRow != null) {
                                    // Data already present in database || 304 - not modified
                                    flowController.emit('ERROR', {message: "It's conflicting assignment! Same naming for Category and Sub-Category not allowed.", status: 'error', statusCode: '304'});
                                } else {

                                    if (itemCategorysRow == null) {

                                        itemSubCategorysModel.update({'_id': itemSubCategoryId, 'itemCategoryId': itemCategoryId}, {'$set': {'name': itemSubCategoryNewName, 'timeUpdated': timeInInteger}}, function (err) {
                                            if (err) {
                                                // error while adding records
                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {
                                                flowController.emit('END', {message: "Item's sub-category name updated.", status: 'success', statusCode: '200'});
                                            }
                                        });
                                    }
                                }
                            });
                        }
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
router.route('/v1/itemMaster/web/item/configuration/delete/itemSubCategory/:itemCategoryId/:itemSubCategoryId/')

        .delete(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemCategoryId = req.params.itemCategoryId.trim();// Item categoryId

            var itemSubCategoryId = req.params.itemSubCategoryId.trim();// MongoId of the category

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemSubCategorysModel.findOne({'_id': itemSubCategoryId, 'itemCategoryId': itemCategoryId, 'activeStatus': 1}, function (err, itemSubCategorysRow) {

                    if (err) {// Serverside error

                        res.json({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemSubCategorysRow == null) {

                        res.json({message: "No Sub-Categories under this category found!", status: 'error', statusCode: '404'});
                    } else {

                        if (itemSubCategorysRow != null) {

                            flowController.emit('1');
                        }
                    }
                });
            });
            flowController.on('1', function () {

                var arrItem = [];

                itemMasterModel.find({'category': itemCategoryId, 'activeStatus': 1}, function (err, itemMasterRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (itemMasterRow.length == 0) {

                        flowController.emit('3.1');
                    } else {
                        if (itemMasterRow.length != 0) {

                            itemMasterRow.forEach(function (element) {

                                arrItem.push(element.category);

                            });

                            if (itemMasterRow.length === arrItem.length) {

                                flowController.emit('2', arrItem);
                            }
                        }
                    }
                });
            });
            flowController.on('2', function (getitemCategory) {

                var arritemSubId = [];

                var iteration = function (element, callbackDone) {

                    itemMasterModel.findOne({'category': element}, function (err, itemMasterRowOne) {
                        if (err) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                        } else if (itemMasterRowOne == null) {

                            flowController.emit('ERROR', {message: "Unable To Delete! item Sub Category.", status: 'error', statusCode: '304'});
                        } else {

                            if (itemMasterRowOne != null) {

                                itemMasterRowOne.subCategory.forEach(function (element) {

                                    arritemSubId.push(element);
                                });//end forEach 
                                setTimeout(function () {
                                    callbackDone();
                                }, 100);
                            }

                        }
                    });
                };
                async.eachSeries(getitemCategory, iteration, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', arritemSubId);
                    }
                });
            });
            flowController.on('3', function (getItemSubId) {

                var promise_resovle = new Promises(function (resovle, reject) {

                    getItemSubId.forEach(function (element) {

                        if (element == itemSubCategoryId) {

                            reject({message: "Unable To Delete! item Sub Category use in System!", status: 'error', statusCode: '304'});
                        } else {

                            if (element != itemSubCategoryId) {

                                itemSubCategorysModel.update({'_id': itemSubCategoryId, 'itemCategoryId': itemCategoryId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}}, function (err) {

                                    if (err) {// error while adding records

                                        reject({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        resovle();
                                    }
                                });
                            }
                        }
                    });
                });
                promise_resovle.then(function (resovle_promise1) {

                    flowController.emit('END');
                }, function (reject_promise1) {

                    flowController.emit('ERROR', reject_promise1);
                }).catch(function (exception) {
                    /* error :( */
                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                });

            });
            flowController.on('3.1', function () {

                itemSubCategorysModel.update({'_id': itemSubCategoryId, 'itemCategoryId': itemCategoryId}, {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}}, function (err) {

                    if (err) {// error while adding records

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {
                        flowController.emit('END');
                    }
                });

            });
            flowController.on('END', function () {

                result = {message: "Item Sub-Category removed from system!", status: 'success', statusCode: '200'};
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