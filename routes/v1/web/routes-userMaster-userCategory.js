var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var Promises = require('promise');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var userCategorysModel = require('../../../models/mongodb/userMaster-userCategory/collection-userCategory.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get all users data
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/read/userCategory/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userCategorysModel.find({'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userCategorysRow) {

                    var userCategorysArray = [];

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategorysRow == null || userCategorysRow.length == 0) {

                        flowController.emit('ERROR', {message: "No user-types configured in the system yet!", status: 'error', statusCode: '404', data: []});
                    } else {

                        async.eachSeries(userCategorysRow, function (element, callback) {

                            if (element.name != 'AVANCER') {

                                var userCategory = {id: element._id, name: element.name, userTypeId: element.userTypeId};

                                userCategorysArray.push(userCategory);
                            }
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: userCategorysArray, status: 'success', statusCode: '200'});
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
//---------------------------------------------------------------------------------------------------------------------------
// Create user category
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/userCategory/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();// MongoId of the waarehouse

            var userTypeId = req.body.userTypeId.trim();// MongoId of the user type

            var categoryName = req.body.categoryName.trim().toUpperCase(); //Warehouse Operator, Desktop Operator etc in capital letter

            var createdByUserId = req.body.createdByUserId.trim();// UserId who created this user

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userCategorysModel.find({$and: [{'name': categoryName, 'warehouseId': warehouseId, 'activeStatus': 1}]}, function (err, userCategorysRow) {

                    if (err) {//

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategorysRow.length != 0) {

                        flowController.emit('ERROR', {message: 'This category already present under this type of user in the system!', status: 'error', statusCode: '304'});
                    } else {

                        if (userCategorysRow.length == 0) {

                            var newUserCategory = new userCategorysModel();

                            newUserCategory.warehouseId = warehouseId;
                            newUserCategory.userTypeId = userTypeId;
                            newUserCategory.name = categoryName; //Warehouse Operator, Desktop Operator etc
                            newUserCategory.timeCreated = timeInInteger;
                            newUserCategory.createdBy = createdByUserId;

                            newUserCategory.save(function (err) {
                                if (err) {
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('END', {message: 'New user category added into the system!', status: 'success', statusCode: '200'});
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
//---------------------------------------------------------------------------------------------------------------------------
// Get all users data
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/update/userCategory/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim(); // MongoId of the warehouse

            var userTypeId = req.body.userTypeId.trim(); // MongoId of the Type of the user

            var userCategoryId = req.body.userCategoryId.trim(); // MongoId of the Category

            var modifiedBy = req.body.modifiedBy.trim(); // 

            var userCategoryNewName = req.body.userCategoryNewName.trim().toUpperCase(); // New name if the category

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userCategorysModel.find({'name': userCategoryNewName, 'activeStatus': 1}, function (err, userCategorysRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategorysRow.length != 0) {

                        flowController.emit('ERROR', {message: 'Can\'t update! The same category is already present in the system!', status: 'error', statusCode: '304'});
                    } else {

                        if (userCategorysRow.length == 0) {

                            flowController.emit('1');
                        }
                    }
                });
            });
            flowController.on('1', function () {

                userCategorysModel.findOne({'_id': userCategoryId, 'activeStatus': 1}, function (err, userCategoryRow) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategoryRow == null) {

                        flowController.emit('ERROR', {message: 'UserCategory does not exist in the system!', status: 'error', statusCode: '404'});
                    } else {
                        if (userCategoryRow != null) {

                            if (userCategoryRow.typeName == 'FIXED') {

                                flowController.emit('ERROR', {message: 'Can\'t update! This category is  primary category in the system!', status: 'error', statusCode: '304'});
                            } else {
                                if (userCategoryRow.typeName == 'OPEN') {

                                    userCategoryRow.name = userCategoryNewName;
                                    userCategoryRow.modifiedBy = modifiedBy;
                                    userCategoryRow.timeModified = timeInInteger;

                                    userCategoryRow.save(function (err) {
                                        if (err) {

                                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            flowController.emit('END');
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            });
            flowController.on('END', function () {

                result = {message: "User category name updated into the system!", status: 'success', statusCode: '200'};
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
// Delete user category
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/delete/userCategory/:warehouseId/:userCategoryId/:modifiedBy')

        .delete(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();// MongoId of the warehouse

            var userCategoryId = req.params.userCategoryId.trim();// MongoId of the category

            var modifiedBy = req.params.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userCategorysModel.findOne({'_id': userCategoryId, 'warehouseId': warehouseId, 'activeStatus': 1}, function (err, userCategorysRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userCategorysRow.typeName == 'FIXED') {
                        // If the user category fixed then that is added by system and can not be removed
                        flowController.emit('ERROR', {message: "This user category can't be modified or removed from system.", status: 'error', statusCode: '304'});
                    } else {
                        // Check of the user category is in use somewhere else, if in use then can not be removed
                        userModel.find({'userCategoryId': userCategoryId, 'warehouseId': warehouseId}, function (err, usersRow) {

                            if (err) {// Serverside error

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else if (usersRow.length != 0) {// Data already present in database || 304 - not modified

                                flowController.emit('ERROR', {message: "Can't remove category! This category is already in use.", status: 'error', statusCode: '304'});
                            } else {

                                if (usersRow.length == 0) {

                                    userCategorysModel.update(
                                            {'_id': userCategoryId, 'warehouseId': warehouseId},
                                            {'$set': {'activeStatus': 2, 'timeModified': timeInInteger, 'modifiedBy': modifiedBy}},
                                            function (err) {
                                                if (err) {

                                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else {

                                                    flowController.emit('END', {message: "User category removed from system!", status: 'success', statusCode: '201'});
                                                }
                                            });
                                }
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
