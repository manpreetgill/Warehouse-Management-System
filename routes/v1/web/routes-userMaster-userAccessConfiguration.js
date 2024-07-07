var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var timezone = momenttimezone().tz("Asia/Kolkata").format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);
var async = require('async');
var events = require('events');
var requestify = require('requestify');
var EventEmitter = events.EventEmitter;

//----------------------------------------------------------------------------------------------------------------
var userAccessConfigurationModel = require('../../../models/mongodb/userMaster-userAccessConfiguration/userAccessConfiguration.js');
var usersModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var logger = require('../../../logger/logger.js');
//------------------------------------------------------------------------------------------------------------
/* GET users listing. */
router.route('/v1/userMaster/web/user/configuration/read/userAccessConfiguration/:userAccessConfigurationId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userAccessConfigurationId = req.params.userAccessConfigurationId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {
                userAccessConfigurationModel.find({'_id': userAccessConfigurationId, 'activeStatus': 1}, function (err, userAccessConfigurationRow) {

                    var userAccessConfigurationArray = [];
                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userAccessConfigurationRow.length == 0) {

                        flowController.emit('ERROR', {message: "No userAccessConfiguration found!", status: 'error', statusCode: '404'});
                    } else {

                        var count = 0;

                        var promise_getuserAccessConfiguration = new Promise(function (resolve, reject) {

                            userAccessConfigurationRow.forEach(function (userAccessConfigurationRow) {

                                count++;

                                var userAccessConfigurationData = {

                                    userTypeId: userAccessConfigurationRow.userTypeId,
                                    userCategoryId: userAccessConfigurationRow.userCategoryId,
                                    menu: userAccessConfigurationRow.menu,
                                    activeStatus: userAccessConfigurationRow.activeStatus,
                                    timeCreated: userAccessConfigurationRow.timeCreated,

                                };
                                console.log(userAccessConfigurationData);
                                userAccessConfigurationArray.push(userAccessConfigurationData);

                                if (count === userAccessConfigurationData.length) {
                                    resolve({message: "Operation Successful.", data: userAccessConfigurationData, status: 'success', statusCode: '200'});
                                }
                            });
                        });

                        promise_getuserAccessConfiguration.then(function (promise1_resolvedData) {

                            flowController.emit('END', promise1_resolvedData);
                        }, function (promise1_rejectedData) {

                            flowController.emit('ERROR', promise1_rejectedData);
                        }).catch(function (exception) {

                            flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
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


//-----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/create/userAccessConfiguration/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userTypeId = req.body.userTypeId.trim();//MongoId of warehouse

            var userCategoryId = req.body.userCategoryId.trim();

            var menu = JSON.parse(req.body.menu);

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var newUserAccessConfiguration = new userAccessConfigurationModel();

                userAccessConfigurationModel.findOne({"userTypeId": userTypeId}, function (err, userAccessConfigurationRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userAccessConfigurationRow != null) {

                        flowController.emit('ERROR', {message: 'Default userAccessConfiguration are already configured!', status: 'error', statusCode: '304'});
                    } else {

                        newUserAccessConfiguration.userTypeId = userTypeId;
                        newUserAccessConfiguration.userCategoryId = userCategoryId;
                        newUserAccessConfiguration.menu = menu;
                        newUserAccessConfiguration.timeCreated = timeInInteger;
                        newUserAccessConfiguration.activeStatus = 1;

                        newUserAccessConfiguration.save(function (err) {
                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', {message: "New userAccessConfiguration added into the system!", status: 'success', statusCode: '201'});
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


//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

router.route('/v1/userMaster/web/user/configuration/update/userAccessConfiguration/:userAccessConfigurationId')

        .put(function (req, res) {

            var userAccessConfigurationId = req.body.userAccessConfigurationId.trim();// Item categoryId

            var menu = req.body.menu.trim();// Item sub-categoryId

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                userAccessConfigurationModel.findOne({'_id': userAccessConfigurationId, 'menu': menu}, function (err, userAccessConfigurationRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "Unable to configure! Try again after some time.", status: 'error', statusCode: '500'});
                    } else if (userAccessConfigurationRow != null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! menu data already present.", status: 'error', statusCode: '304'});
                    } else {

                        if (userAccessConfigurationRow == null) {
                            userAccessConfigurationModel.update({'_id': userAccessConfigurationId}, {'$addToSet': {'menu': menu, 'timeUpdated': timeInInteger}}, function (err) {
                                if (err) {
                                    // error while adding records
                                    flowController.emit('ERROR', {message: "Unable to make update! Try again after some time.", status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('END', {message: "menu data updated.", status: 'success', statusCode: '200'});
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

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/web/user/configuration/update/menu/:userAccessConfigurationId')

        .put(function (req, res) {

            var userAccessConfigurationId = req.body.userAccessConfigurationId.trim();// Item categoryId
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());
            var menu = req.body.menu.trim();// Item sub-categoryId
            var flowController = new EventEmitter();

            flowController.on('START', function () {
                userAccessConfigurationModel.findOne({'_id': userAccessConfigurationId, 'menu': menu}, function (err, userAccessConfigurationRow) {

                    if (err) {// Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (userAccessConfigurationRow == null) {// Data already present in database || 304 - not modified

                        flowController.emit('ERROR', {message: "Can't update! menu data not present.", status: 'error', statusCode: '304'});
                    } else {

                        if (userAccessConfigurationRow != null) {
                            userAccessConfigurationModel.update({'_id': userAccessConfigurationId}, {'$pull': {'assignedItemStoreId': assignedItemStoreId, 'timeUpdated': timeInInteger}}, function (err) {
                                if (err) {
                                    // error while adding records
                                    flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {
                                    flowController.emit('END', {message: "Menu Data updated.", status: 'success', statusCode: '200'});
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


module.exports = router;