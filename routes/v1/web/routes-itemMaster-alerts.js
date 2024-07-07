var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//--------------------------------------------------------------------------------------------------------------------------
var alertsModel = require('../../../models/mongodb/itemMaster-alerts/collection-alerts.js');
var userModel = require('../../../models/mongodb/userMaster-users/collection-users.js');
var userTypeModel = require('../../../models/mongodb/userMaster-userType/collection-userType.js');
var logger = require('../../../logger/logger.js');
//--------------------------------------------------------------------------------------------------------------------------
// Get active alerts
//--------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/action/read/alert/:warehouseId/:userId/')

        .get(function (req, res) {

            var consoleLog = 0;

            (consoleLog) ? console.log(req.params) : '';

            var warehouseId = req.params.warehouseId.trim();
            
            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var userId = req.params.userId.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log("START") : '';

                var alertArray = []; //results: { $elemMatch: { $gte: 80, $lt: 85 } }

                alertsModel.find({'users': {$elemMatch: {'userId': userId, 'status': 0}}, "warehouseId": warehouseId, 'activeStatus': 1}).sort({'timeCreated': -1}).exec(function (err, alertRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});

                    } else if (alertRow.length == 0) {

                        flowController.emit('END', alertArray);

                    } else {

                        async.eachSeries(alertRow, function (element, callback) {

                            var date = moment.unix(element.timeCreated).format("DD MMMM YYYY hh:mm");

                            var period = moment.unix(element.timeCreated).format("HH") >= 12 ? 'PM' : 'AM';

                            var alertDate = date + " " + period;

                            var data = {

                                module: element.module,
                                name: element.name,
                                moduleId: element.id,
                                alertDate: alertDate,
                                alert: element.text,
                                alertId: element._id
                            };

                            alertArray.push(data);
                            setImmediate(callback);

                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else {

                                flowController.emit('END', alertArray);
                            }
                        });
                    }
                });
            });

            flowController.on('END', function (result) {

                (consoleLog) ? console.log("END") : '';

                res.json({data: result, message: "Operation Successful.", status: 'success', statusCode: '200'});

            });

            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log("ERROR") : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});


                res.json(error);
            });

            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------
// Create alerts
//--------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/create/alert/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var textName = req.body.textName.trim();

            var module = req.body.module.trim();

            var name = req.body.name.trim();

            var id = req.body.id.trim();

            var flowController = new EventEmitter();

            // Get MongoId of ADMIN & SUPERADMIN
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                userTypeModel.find({activeStatus: 1}, function (err, userTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow.length == 0) {

                        flowController.emit('ERROR', {message: "No user-types available in the system yet!", status: 'error', statusCode: '404'});
                    } else {

                        var adminId = null;
                        var superAdminId = null;

                        async.eachSeries(userTypeRow, function (element, callback) {

                            if (element.name == 'ADMIN') {

                                adminId = String(element._id);
                            }

                            if (element.name == 'SUPERADMIN') {

                                superAdminId = String(element._id);
                            }

                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', adminId, superAdminId);
                            }
                        });
                    }
                });
            });

            // Get all users belonging to ADMIN & SUPERADMIN type
            flowController.on('1', function (adminId, superAdminId) {

                (consoleLog) ? console.log('1') : '';

                var users = []; //qty: { $in: [ 5, 15 ] }

                userModel.find({'userTypeId': {$in: [superAdminId, adminId]}}, function (err, userRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (userRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No users in database ' + err, status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userRow, function (element, callback) {
                            var object = {};

                            object.userId = String(element._id);
                            object.status = 0;
                            users.push(object);

                            setImmediate(callback);
                        }, function (err) {

                            flowController.emit('2', users);
                        });
                    }
                });
            });

            // Insert alert first
            flowController.on('2', function (users) {

                (consoleLog) ? console.log('2') : '';

                var newAlert = new alertsModel();

                newAlert.warehouseId = warehouseId; // MongoId collection in warehouseMaster
                newAlert.module = module;
                newAlert.name = name;
                newAlert.id = id;
                newAlert.text = textName; // What alert - The text will be stored here
                newAlert.timeCreated = timeInInteger;

                newAlert.save(function (err, alertDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', users, String(alertDetails._id));
                    }
                });
            });

            // Add users into it
            flowController.on('3', function (users, alertId) {

                (consoleLog) ? console.log('3') : '';

                async.eachSeries(users, function (element, callback) {

                    var query = {"_id": alertId};

                    var update = {"$addToSet": {"users": element}};

                    alertsModel.update(query, update, function (err) {
                        if (err) {

                            callback(err);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: 'Alert added.', status: 'success', statusCode: '200'});
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
//--------------------------------------------------------------------------------------------------------------------------
// Update alerts status to read
//--------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/action/update/alert/')

        .patch(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var alertId = req.body.alertId.trim();

            var seenBy = req.body.seenBy.trim();
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                (consoleLog) ? console.log('update') : '';

                var query = {'_id': alertId, 'users.userId': seenBy};
                var update = {'$set': {'users.$.status': 1, 'users.$.timeSeen': timeInInteger}};

                alertsModel.update(query, update, function (err) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'Alerts seen by Operator Successfully', status: 'success', statusCode: '200'});
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
// Create alerts
//--------------------------------------------------------------------------------------------------------------------------
router.route('/v1/itemMaster/web/item/configuration/action/autoBackUp/alert/:warehouseId/:textName/')

        .get(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.params) : '';

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.params.warehouseId.trim();

            var textName = req.params.textName.trim();

            var module = "AUTO-BACKUP";

            var name = "AUTO-BACKUP";

            var id = "AUTO-BACKUP";

            var flowController = new EventEmitter();

            // Get MongoId of ADMIN & SUPERADMIN
            flowController.on('START', function () {

                (consoleLog) ? console.log('START') : '';

                userTypeModel.find({activeStatus: 1}, function (err, userTypeRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (userTypeRow.length == 0) {

                        flowController.emit('ERROR', {message: "No user-types available in the system yet!", status: 'error', statusCode: '404'});
                    } else {

                        var adminId = null;
                        var superAdminId = null;
                        var avancerId = null;

                        async.eachSeries(userTypeRow, function (element, callback) {

                            if (element.name == 'ADMIN') {

                                adminId = String(element._id);
                            }

                            if (element.name == 'SUPERADMIN') {

                                superAdminId = String(element._id);
                            }
                            if (element.name == 'AVANCER') {

                                avancerId = String(element._id);
                            }

                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', err);
                            } else {

                                flowController.emit('1', adminId, superAdminId, avancerId);
                            }
                        });
                    }
                });
            });

            // Get all users belonging to ADMIN & SUPERADMIN type
            flowController.on('1', function (adminId, superAdminId, avancerId) {

                (consoleLog) ? console.log('1') : '';

                var users = []; //qty: { $in: [ 5, 15 ] }

                userModel.find({'userTypeId': {$in: [superAdminId, adminId, avancerId]}}, function (err, userRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (userRow.length == 0) {

                        flowController.emit('ERROR', {message: 'No users in database ' + err, status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(userRow, function (element, callback) {
                            var object = {};

                            object.userId = String(element._id);
                            object.status = 0;
                            users.push(object);

                            setImmediate(callback);
                        }, function (err) {

                            flowController.emit('2', users);
                        });
                    }
                });
            });

            // Insert alert first
            flowController.on('2', function (users) {

                (consoleLog) ? console.log('2') : '';

                var newAlert = new alertsModel();

                newAlert.warehouseId = warehouseId; // MongoId collection in warehouseMaster
                newAlert.module = module;
                newAlert.name = name;
                newAlert.id = id;
                newAlert.text = textName; // What alert - The text will be stored here
                newAlert.timeCreated = timeInInteger;

                newAlert.save(function (err, alertDetails) {
                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('3', users, String(alertDetails._id));
                    }
                });
            });

            // Add users into it
            flowController.on('3', function (users, alertId) {

                (consoleLog) ? console.log('3') : '';

                async.eachSeries(users, function (element, callback) {

                    var query = {"_id": alertId};

                    var update = {"$addToSet": {"users": element}};

                    alertsModel.update(query, update, function (err) {
                        if (err) {

                            callback(err);
                        } else {

                            setImmediate(callback);
                        }
                    });
                }, function (err) {
                    if (err) {

                        flowController.emit('ERROR', err);
                    } else {

                        flowController.emit('END', {message: 'Alert added.', status: 'success', statusCode: '200'});
                    }
                });
            });

            // End
            flowController.on('END', function (result) {

                (consoleLog) ? console.log('END') : '';

                res.json(result);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });
//
//
module.exports = router;