var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var hoursTrackingModel = require('../../../models/mongodb/userMaster-hoursTracking/collection-hoursTracking.js');
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/userMaster/mobile/hours-tracking/action/update/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var date = moment(new Date()).format('DD/MM/YY'); //58f89ffd2f2dab5efcc56045

            var deviceId = req.body.deviceId.trim();

            var userId = req.body.userId.trim();

            var warehouseId = req.body.warehouseId.trim();

            var idleTime = req.body.idleTime;

            var loggedOutTime = timeInInteger;

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var loggedInTimeArray = [];

                devicesTrackingModel.find({'userId': userId, 'deviceId': deviceId, 'activeStatus': 1}, function (err, devicesTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});

                    } else if (devicesTrackingRow.length == 0) {

                        flowController.emit('error', {message: "User Id Missing/Modified", status: 'error', statusCode: '500'});
                    } else {

                        async.eachSeries(devicesTrackingRow, function (element, callback) {

                            var loggedInTime = element.timestamp;
                            loggedInTimeArray.push(loggedInTime);
                            setImmediate(callback);

                        }, function (err) {

                            if (err) {

                                flowController.emit('ERROR', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else {

                                loggedInTimeArray.reverse();

                                flowController.emit('end', loggedInTimeArray[0]);
                            }
                        });

                    }
                });
            });

            flowController.on('end', function (loggedInTimeLatest) {

                hoursTrackingModel.findOne({'userId': userId, 'date': date, 'activeStatus': 1}, function (err, hoursTrackingRow) {
                    if (err) {

                        flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});

                    } else if (hoursTrackingRow == null) {

                        var hoursTracking = new hoursTrackingModel();

                        hoursTracking.warehouseId = warehouseId;
                        hoursTracking.date = date;
                        hoursTracking.userId = userId;
                        hoursTracking.activeTime = loggedOutTime - loggedInTimeLatest;
                        hoursTracking.idleTime = idleTime;

                        hoursTracking.save(function (err) {
                            if (err) {

                                flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else {

                                res.json({message: 'Tracking data create successful!', status: 'success', statusCode: '200'});
                            }
                        });

                    } else {
                        if (hoursTrackingRow != null) {

                            hoursTrackingModel.update({'userId': userId}, {'$inc': {'activeTime': loggedOutTime - loggedInTimeLatest, 'idleTime': idleTime}}, function (err, hoursTrackingModelRow) {
                                if (err) {

                                    flowController.emit('error', {message: "INTERNAL SERVER ERROR "+err,status: 'error', statusCode: '500'});
                                } else {

                                    res.json({message: 'Tracking data updated successful!', status: 'success', statusCode: '200'});
                                }
                            });
                        }
                    }
                });

            });

            flowController.on('error', function (error) {
                logger.error(error.message, {host: req.headers.origin, uiUrl: req.headers.referer, serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
                res.json(error);
            });
            // To be kept at the end always
            flowController.emit('START');
        });
//
//
module.exports = router;