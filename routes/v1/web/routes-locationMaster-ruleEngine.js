var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone'); //timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var mongoXlsx = require('mongo-xlsx');
var requestify = require('requestify');
var MagicIncrement = require('magic-increment');
var events = require('events');
var fs = require('fs');
var EventEmitter = events.EventEmitter;
var async = require('async');
var json2csv = require('json2csv');
var csv = require('csvtojson');
//----------------------------------------------------------------------------------------------------------------------------
var ruleEngineModel = require('../../../models/mongodb/locationMaster-ruleEngine/collection-ruleEngine.js');
//----------------------------------------------------------------------------------------------------------------------------
// Rule Engine Add location one by one
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/location/configuration/import-export/ruleEngine/manual-import/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var path = "./public/files/ruleEngine/ruleEngine.xlsx";

            var model = null;

            var promise_validateExcelCustomerAddressing = new Promises(function (resolve, reject) {

                var locationArray = [];

                mongoXlsx.xlsx2MongoData(path, model, function (err, mongoData) {

                    async.eachSeries(mongoData, function (element, callback) {

                        if (element.location == '') {

                            reject({message: 'Customer address can not be kept blank!', status: 'error', statusCode: 304});
                        } else if (locationArray.indexOf(element.location) > -1) {

                            reject({message: 'Same address for more than one location found! Address duplication not allowed', status: 'error', statusCode: 304});
                        } else {

                            locationArray.push(element);
                            setImmediate(callback);
                        }
                    }, function (err) {
                        if (err) {

                            reject({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                        } else {

                            if (locationArray.length === mongoData.length) {

                                resolve({message: 'All validation OK', status: 'success', statusCode: 200});
                            }
                        }
                    });
                });
            });
            promise_validateExcelCustomerAddressing.then(function (promise1_resolvedData) {

                mongoModel = null;

                mongoXlsx.xlsx2MongoData(path, mongoModel, function (err, mongoData) {


                    var promise_getCustomerAddressExcel = new Promises(function (resolve, reject) {

                        async.eachSeries(mongoData, function (element, callback) {

                            var location = element.location;
                            var palletSize = element.palletSize;
                            var palletType = element.palletType;
                            var zone = element.zone;
                            var quantity = element.quantity;

                            ruleEngineModel.findOne({'location': location, 'activeStatus': 1}, function (err, ruleEngineRow) {
                                if (err) {

                                    reject({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                } else if (ruleEngineRow != null) {

                                    reject({message: 'Excel data modified or corrupted/User modified other than required fields! Try addressing again.', status: 'error', statusCode: '404'});
                                } else {

                                    palletSizeArray = [];
                                    palletTypeArray = [];

                                    if (palletSize.indexOf('/') !== -1) {

                                        temp = palletSize.split('/');
                                        palletSizeArray = temp;
                                    } else {

                                        palletSizeArray.push(palletSize);
                                    }

                                    palletTypeArray = [];

                                    if (palletType.indexOf('/') !== -1) {

                                        temp = palletType.split('/');
                                        palletTypeArray = temp;
                                    } else {

                                        palletTypeArray.push(palletType);
                                    }

                                    var ruleEngine = new ruleEngineModel();

                                    ruleEngine.warehouseId = warehouseId;
                                    ruleEngine.location = location;
                                    ruleEngine.palletSize = palletSizeArray;
                                    ruleEngine.palletType = palletTypeArray;
                                    ruleEngine.quantity = quantity;
                                    ruleEngine.zone = zone;
                                    ruleEngine.timeCreated = timeInInteger;

                                    ruleEngine.save(function (err) {
                                        if (err) {

                                            reject({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                        } else {

                                            setImmediate(callback);
                                        }
                                    });
                                }
                            });
                        }, function (err) {

                            if (err) {

                                reject({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else {

                                resolve({message: 'Rule engine database is set!', status: 'success', statusCode: '200'});
                            }
                        });
                    });
                    promise_getCustomerAddressExcel.then(function (promise1_resolvedData) {

                        res.json(promise1_resolvedData);
                    }, function (promise1_rejectedData) {

                        res.json(promise1_rejectedData);
                    }).catch(function (exception) {

                        res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    });
                });
            }, function (promise1_rejectedData) {

                res.json(promise1_rejectedData);
            }).catch(function (exception) {

                res.json(exception);
            });
        });
//
//
module.exports = router;