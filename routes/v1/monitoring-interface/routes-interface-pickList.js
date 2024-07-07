var express = require('express');
var router = express.Router();
var csv = require('csvtojson');
var fs = require('fs');
var events = require('events');
var EventEmitter = events.EventEmitter;
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
//----------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
var logger = require('../../../logger/logger.js');
// Pick Process 
// Check for updated pick file
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/send-update/pick-file/')

        .get(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var directory = './public/files/interface/pick/out/'; //Put02_ DDMMYYHHMMSS_###
            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'ERROR', statusCode: '404'});
                    } else {

                        if (!files.length) {

                            flowController.emit('ERROR', {message: 'Watch done! No files found.', status: 'SUCCESS', statusCode: '404'});
                        } else {

                            var fileArray = [];

                            files.forEach(file => {

                                fileArray.push(file);

                                if (files.length === fileArray.length) {

                                    flowController.emit('END', {message: 'Watch done! New file arrived.', data: fileArray, status: 'SUCCESS', statusCode: '200'});
                                }
                            });
                        }
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Send JSON of required file to local computer
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/send-file/pick-file/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var fileName = req.body.fileName.trim();

            var directory = './public/files/interface/pick/out/'; //Put02_ DDMMYYHHMMSS_###

            var path = directory + fileName;
            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'ERROR', statusCode: '404'});
                    } else {

                        if (!files.length) {

                            flowController.emit('ERROR', {message: 'Download Lookup! No files found.', status: 'SUCCESS', statusCode: '404'});
                        } else {

                            if (fs.existsSync(path)) {

                                var jsonArray = [];

                                csv().fromFile(path)

                                        .on('json', (jsonObj) => {

                                            jsonArray.push(jsonObj);// Update jsob object with additional values
                                        })
                                        .on('done', (error) => {

                                            flowController.emit('END', {message: 'Operation Successful!', data: jsonArray, status: 'SUCCESS', statusCode: '200'});
                                        });
                            }
                        }
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
//----------------------------------------------------------------------------------------------------------------------------
// Delete after it is received by local machine in their out folder
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/interface/web/watch/directory/out/delete-file/pick-file/')

        .put(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var file = req.body.fileName.trim();

            var directory = './public/files/interface/pick/out/'; //Put02_ DDMMYYHHMMSS_###

            var path = './public/files/interface/pick/out/' + file; //Put02_ DDMMYYHHMMSS_###

            var flowController = new EventEmitter();

            //check itemSerialNumber and itemMaster
            flowController.on('START', function () {

                fs.readdir(directory, function (err, files) {

                    if (err) {

                        flowController.emit('ERROR', {message: "INTERNAL SERVER ERROR " + err, status: 'ERROR', statusCode: '404'});
                    } else {

                        if (files.length) {

                            if (fs.existsSync(path)) {

                                require("fs").unlink(path, function () {

                                    flowController.emit('END', {message: 'File acknowledged! Removed from server.', status: 'SUCCESS', statusCode: '200'});
                                });
                            }
                        }
                    }
                });
            });
            //END 
            flowController.on('END', function (result) {

                res.json(result);
            });

            //ERROR
            flowController.on('ERROR', function (error) {

                res.json(error);
                logger.error(error.message, {host: (req.headers.origin) ? req.headers.origin : 'NA', uiUrl: (req.headers.referer) ? req.headers.referer : 'NA', serverUrl: req.originalUrl, method: req.method, body: req.body || req.get || req.query, status: 'error', statusCode: '500', timestamp: timeInInteger});
            });
            //instlize
            flowController.emit('START');
        });
//
//
module.exports = router;