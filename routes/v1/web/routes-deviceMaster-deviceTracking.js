var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require('async');
//---------------------------------------------------------------------------------------------------------------------------
var devicesTrackingModel = require('../../../models/mongodb/deviceMaster-deviceTracking/collection-deviceTracking.js');
var logger = require('../../../logger/logger.js');
//---------------------------------------------------------------------------------------------------------------------------
// Device Tracking
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/deviceMaster/web/device/tracking/create/device-tracking/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var deviceId = (req.body.hasOwnProperty('deviceId')) ? req.body.deviceId : '';

            var userId = req.body.userId.trim();

            var status = req.body.status.trim();

            var swVersion = req.body.swVersion.trim();

            var battery = req.body.battery.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                if (deviceId == '')
                    flowController.emit('ERROR', {message: 'Device Id not found in request.', status: 'error', statusCode: '500'});
                else
                    flowController.emit('1');
            });

            flowController.on('1', function () {

                var newDeviceTracking = new devicesTrackingModel();

                newDeviceTracking.warehouseId = warehouseId;
                newDeviceTracking.timestamp = timeInInteger;
                newDeviceTracking.date = moment(new Date()).format('DD/MM/YY');
                newDeviceTracking.deviceId = deviceId;
                newDeviceTracking.userId = userId;
                newDeviceTracking.status = status;
                newDeviceTracking.swVersion = swVersion;
                newDeviceTracking.battery = battery;
                newDeviceTracking.timeCreated = timeInInteger;

                newDeviceTracking.save(function (err) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
                    } else {

                        flowController.emit('END', {message: 'Device on-track', status: 'success', statusCode: '201'});
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