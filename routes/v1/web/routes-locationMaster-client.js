var express = require('express');
var router = express.Router();
var fs = require('fs');
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var clientsModel = require('../../../models/mongodb/locationMaster-companyMaster/collection-client');
var logger = require('../../../logger/logger.js');
var dashboardService = require('../../../service-factory/dashboardService.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/read/client/:clientId/')

        .get(function (req, res, next) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var clientId = req.params.clientId.trim(); // MongoId of the warehouse
            // Find all the active rows in the item category collection 
            var flowController = new EventEmitter();

            flowController.on('START', function () {

                clientsModel.find({'_id': clientId, 'activeStatus': 1}, function (err, clientsRow) {
                    var companyMastersArray = [];
                    if (err) { // Serverside error

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (clientsRow.length == 0) {

                        flowController.emit('ERROR', {message: "No client configured! Client details might be tampered/removed", status: 'error', statusCode: '404'});
                    } else {

                        async.eachSeries(clientsRow, function (element, callback) {

                            var client = {id: element._id, name: element.name, address: element.address, city: element.city};

                            companyMastersArray.push(client);
                            setImmediate(callback);
                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});

                            } else {

                                flowController.emit('END', {message: "Operation Successful.", data: companyMastersArray, status: 'success', statusCode: '200'});
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
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/create/client/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var name = req.body.name.trim().toUpperCase();
            var logo = req.body.logo;
            var address = req.body.address.trim();
            var city = req.body.city.trim();
            var baseUrl = req.body.baseUrl.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                clientsModel.find({'activeStatus': 1}, function (err, clientRow) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (clientRow.length != 0) {

                        flowController.emit('ERROR', {message: "Client already configured! More than one client not allowed.", status: 'success', statusCode: '304'});
                    } else {

                        if (clientRow.length == 0) {

                            if (req.body.logo != null) {

                                var base64Data = req.body.logo;
                                var path1 = '/images/client/' + req.body.name + timeInInteger + ".jpeg";

                                var path = "./public/images/client/" + req.body.name + timeInInteger + ".jpeg";

                                require("fs").writeFile(path, base64Data, 'base64', function (err) {

                                    if (err) {
                                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                    } else {

                                        var newClient = new clientsModel();

                                        newClient.name = name;
                                        newClient.logo = path1;
                                        newClient.address = address;
                                        newClient.city = city;
                                        newClient.baseUrl = baseUrl;
                                        newClient.timeCreated = timeInInteger;

                                        newClient.save(function (err, newClientDetails) {
                                            if (err) {

                                                flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                            } else {

                                                var clientId = newClientDetails._id;
                                                flowController.emit('END', {message: "New client configured into system!", status: 'success', data: clientId, statusCode: '201'});
                                            }
                                        });

                                    }
                                });
                            } //end of profile update true 
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
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/update/client/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var clientId = req.body.clientId.trim();

            var city = req.body.city.trim();

            var name = req.body.name.trim();

            var address = req.body.address.trim();

            var logo = req.body.logo;

            var baseUrl = req.body.baseUrl;

            var modifiedBy = req.body.modifiedBy.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                clientsModel.findOne({'_id': clientId, activeStatus: 1}, function (err, clientRow) {
                    if (err) {
                        flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else if (clientRow == null || clientRow.length == 0) {

                        flowController.emit('ERROR',{message: 'Client data missing! client data removed/tampered!', status: 'error', statusCode: '304'});
                    } else if (clientRow != null) {

                        if (logo != '') {
                            var previousLogo = './public/' + clientRow.logo;

                            fs.unlink(previousLogo, function (err) {
                                if (err && err.code == 'ENOENT') {
                                    // file doens't exist
                                    flowController.emit('END',{message: 'Old logo file missing! Unable to remove', status: 'success', statusCode: '304'});
                                } else if (err) {
                                    // maybe we don't have enough permission
                                    flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    var base64Data = req.body.logo;
                                    var path1 = '/images/client/' + req.body.name + timeInInteger + ".jpeg";

                                    var newPath = "./public/images/client/" + req.body.name + timeInInteger + ".jpeg";

                                    require("fs").writeFile(newPath, base64Data, 'base64', function (err) {

                                        if (err) {
                                            flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                        } else {

                                            clientRow.name = name;
                                            clientRow.logo = path1;
                                            clientRow.address = address;
                                            clientRow.city = city;
                                            clientRow.baseUrl = baseUrl;
                                            clientRow.timeUpdated = timeInInteger;
                                            clientRow.modifiedBy = modifiedBy;

                                            clientRow.save(function (err, newClientDetails) {

                                                if (err) {

                                                    flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                                } else {

                                                    flowController.emit('END',{message: "Client details updated!", status: 'success', statusCode: '200'});
                                                }
                                            });

                                        }
                                    });
                                }
                            });

                        } else {

                            clientRow.name = name;
                            clientRow.address = address;
                            clientRow.city = city;
                            clientRow.baseUrl = baseUrl;
                            clientRow.timeUpdated = timeInInteger;
                            clientRow.modifiedBy = modifiedBy;
                            clientRow.save(function (err) {

                                if (err) {

                                    flowController.emit('ERROR',{message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                                } else {

                                    flowController.emit('END',{message: 'Client details updated', status: 'success', statusCode: '201'});
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
module.exports = router;