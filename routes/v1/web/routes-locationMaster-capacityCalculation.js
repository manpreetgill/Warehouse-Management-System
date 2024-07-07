var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var async = require('async');
var events = require('events');
var EventEmitter = events.EventEmitter;
//---------------------------------------------------------------------------------------------------------------------------
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
var locationStoresModel = require('../../../models/mongodb/locationMaster-locationStore/collection-locationStore.js');
var areaMastersModel = require('../../../models/mongodb/locationMaster-areaMaster/collection-areaMaster.js');
var zoneMastersModel = require('../../../models/mongodb/locationMaster-zoneMaster/collection-zoneMaster.js');
var lineMastersModel = require('../../../models/mongodb/locationMaster-lineMaster/collection-lineMaster.js');
var levelMastersModel = require('../../../models/mongodb/locationMaster-levelMaster/collection-levelMaster.js');
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
//-------------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------
router.route('/v1/locationMaster/web/capacity/configuration/create/capacity_calcuation_updated/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreId = req.body.itemStoreId.trim();// Parameter from body

            var customerAddress = req.body.customerAddress.trim();

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                itemStoreModel.findOne({"_id": itemStoreId}, function (err, itemStoreRow) {

                    if (err) {

                        flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (itemStoreRow == null) {

                        flowController.emit('error', {message: 'Default user types are already configured!', status: 'error', statusCode: '304'});
                    } else {

                        var itemMasterId = itemStoreRow.itemMasterId;

                        itemMasterModel.findOne({"_id": itemMasterId}, function (err, itemMasterRow) {

                            if (err) {

                                flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else if (itemMasterRow == null) {

                                flowController.emit('error', {message: 'Default user types are already configured!', status: 'error', statusCode: '304'});
                            } else {

                                itemSystemSpecification = itemMasterRow.itemSystemSpecification;

                                flowController.emit('2', itemSystemSpecification);
                            }
                        });
                    }
                });

            });

            flowController.on('2', function (itemSystemSpecification) {

                locationStoresModel.findOne({"customerAddress": customerAddress}, function (err, locationStoreRow) {

                    if (err) {

                        flowController.emit('error', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                    } else if (locationStoreRow == null) {

                        flowController.emit('error', {message: 'Default user types are already configured!', status: 'error', statusCode: '304'});

                    } else {

                        locationPropertiesData = locationStoreRow.locationProperties;
                        flowController.emit('3', locationPropertiesData, itemSystemSpecification);
                    }
                });
            });

            flowController.on('3', function (locationPropertiesData, itemSystemSpecification) {

                locationPropertiesData.forEach(function (element) {

                    itemSystemSpecification.forEach(function (element2) {

                        var objType = element2.type;

                        switch (objType)
                        {
                            case 'BOX' :
                                if ((parseInt(Math.round(element2.length)) >= parseInt(Math.round(element.minLength))) && (parseInt(Math.round(element2.length)) <= parseInt(Math.round(element.maxLength))) && (parseInt(Math.round(element2.Width)) >= parseInt(Math.round(element.minWidth))) && (parseInt(Math.round(element2.Width)) <= parseInt(Math.round(element.maxWidth))) && (parseInt(Math.round(element2.height)) >= parseInt(Math.round(element.minHeight))) && (parseInt(Math.round(element2.height)) <= parseInt(Math.round(element.maxHeight))) && (parseInt(Math.round(element2.weight)) >= parseInt(Math.round(element.minWeight))) && (parseInt(Math.round(element2.weight)) <= parseInt(Math.round(element.maxWeight))))
                                {

                                    flowController.emit('end', locationPropertiesData, itemSystemSpecification, '', '');

                                } else {

                                    flowController.emit('error', {message: 'Cant fit', status: 'error', statusCode: '500'});
                                }
                                break;

                            case 'CUBICAL':
                                var cyl_width = Math.round(3.14 * parseInt(Math.round(element2.diameter)));

                                if ((parseInt(Math.round(element2.diameter)) >= parseInt(Math.round(element.minDiameter))) && (parseInt(Math.round(element2.diameter)) <= parseInt(Math.round(element.maxDiameter))) && (cyl_width >= parseInt(Math.round(element.minWidth))) && (cyl_width <= parseInt(Math.round(element.maxWidth))) && (parseInt(Math.round(element2.height)) >= parseInt(Math.round(element.minHeight))) && (parseInt(Math.round(element2.height)) <= parseInt(Math.round(element.maxHeight))) && (parseInt(Math.round(element2.weight)) >= parseInt(Math.round(element.minWeight))) && (parseInt(Math.round(element2.weight)) <= parseInt(Math.round(element.maxWeight))))
                                {
                                    flowController.emit('end', locationPropertiesData, itemSystemSpecification, cyl_width, objType);
                                } else {

                                    flowController.emit('error', {message: 'Cant fit', status: 'error', statusCode: '500'});
                                }
                                break;
                            default:
                                flowController.emit('error', {message: 'This type not configured in System!! ', status: 'error', statusCode: '304'});

                        }

                    });
                });
            });

            flowController.on('end', function (locationPropertiesData, itemSystemSpecification, cyl_width, objType) {

                var location_maxLength = '';
                var location_maxWidth = '';
                var location_maxHeight = '';
                var location_maxWeight = '';

                locationPropertiesData.forEach(function (element) {

                    itemSystemSpecification.forEach(function (element2) {

                        location_maxLength = parseInt(Math.round(element.maxLength)) - parseInt(Math.round(element2.length));

                        if (objType == 'CUBICAL') {
                            location_maxWidth = parseInt(Math.round(element.maxWidth)) - cyl_width;
                        } else {
                            location_maxWidth = parseInt(element.maxWidth) - parseInt(element2.Width);
                        }

                        location_maxHeight = parseInt(Math.round(element.maxHeight)) - parseInt(Math.round(element2.height));
                        location_maxWeight = parseInt(Math.round(element.maxWeight)) - parseInt(Math.round(element2.weight));
                        location_maxDiameter = parseInt(Math.round(element.maxDiameter)) - parseInt(Math.round(element2.diameter));

                    });
                    locationStoresModel.findOne({'customerAddress': customerAddress, 'activeStatus': 1}, function (err, virtualLocationRow) {

                        if (err) {

                            flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});

                        } else if (virtualLocationRow == null) {

                            flowController.emit('error', {message: "Cant update! item already present in virtual item store.", status: 'error', statusCode: '304'});
                        } else {//{'$addToSet': {'resourceAssigned': {'deviceId': deviceId}}

                            if (virtualLocationRow != null) {

                                locationStoresModel.update({'customerAddress': customerAddress}, {'$addToSet': {'assignedItemStoreId': itemStoreId}, '$set': {
                                        'locationProperties': {
                                            'userDefinedCapacity': element.userDefinedCapacity,
                                            'maxLength': location_maxLength.toString(),
                                            'maxWidth': location_maxWidth.toString(),
                                            'maxHeight': location_maxHeight.toString(),
                                            'maxWeight': location_maxWeight.toString(),
                                            'maxDiameter': location_maxDiameter.toString(),
                                            'minLength': element.minLength,
                                            'minWidth': element.minWidth,
                                            'minHeight': element.minHeight,
                                            'minDiameter': element.minDiameter,
                                            'minWeight': element.minWeight

                                        }}
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                    } else {

                                        res.json({message: "you can place ur item...Item added to assignedItemStoreId Successfully.", status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        }
                    });
                });
            });

            flowController.on('error', function (errorData) {

                res.json(errorData);
            });

            flowController.emit('START');
        });
//---------------------------------------------------------------------------------------------------------------------------
// Get All device information
//---------------------------------------------------------------------------------------------------------------------------

router.route('/v1/locationMaster/web/capacity/configuration/update/capacity_calcuation/')

        .patch(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var itemStoreId = req.body.itemStoreId.trim();
            var itemSpecification = JSON.parse(req.body.itemSpecification);// Parameter from body

            var locationSpecification = JSON.parse(req.body.locationSpecification);

            var flowController = new EventEmitter();

            flowController.on('START', function () {

                var location_maxLength = '';
                var location_maxWidth = '';
                var location_maxHeight = '';
                var location_maxWeight = '';

                locationSpecification.forEach(function (element) {

                    itemSpecification.forEach(function (element2) {

                        location_maxLength = parseInt(Math.round(element.locationProperties.maxLength)) - parseInt(Math.round(element2.itemSystemSpecification.length));

                        if (element2.type == 'CUBICAL') {
                            var cyl_width = Math.round(3.14 * parseInt(Math.round(element2.itemSystemSpecification.diameter)));

                            location_maxWidth = parseInt(Math.round(element.locationProperties.maxWidth)) - cyl_width;
                        } else {
                            location_maxWidth = parseInt(element.locationProperties.maxWidth) + parseInt(element2.itemSystemSpecification.Width);
                        }

                        location_maxHeight = parseInt(Math.round(element.locationProperties.maxHeight)) + parseInt(Math.round(element2.itemSystemSpecification.height));
                        location_maxWeight = parseInt(Math.round(element.locationProperties.maxWeight)) + parseInt(Math.round(element2.itemSystemSpecification.weight));
                        location_maxDiameter = parseInt(Math.round(element.locationProperties.maxDiameter)) + parseInt(Math.round(element2.itemSystemSpecification.diameter));

                    });
                    locationStoresModel.findOne({'customerAddress': element.customerAddress, 'activeStatus': 1}, function (err, virtualLocationRow) {

                        if (err) {

                            flowController.emit('error', {message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});

                        } else if (virtualLocationRow == null) {

                            flowController.emit('error', {message: "Cant update! item already present in virtual item store.", status: 'error', statusCode: '304'});
                        } else {//{'$addToSet': {'resourceAssigned': {'deviceId': deviceId}}

                            if (virtualLocationRow != null) {

                                locationStoresModel.update({'customerAddress': element.customerAddress}, {'$pull': {'assignedItemStoreId': itemStoreId}, '$set': {
                                        'locationProperties': {
                                            'userDefinedCapacity': element.locationProperties.userDefinedCapacity,
                                            'maxLength': location_maxLength.toString(),
                                            'maxWidth': location_maxWidth.toString(),
                                            'maxHeight': location_maxHeight.toString(),
                                            'maxWeight': location_maxWeight.toString(),
                                            'maxDiameter': location_maxDiameter.toString(),
                                            'minLength': element.locationProperties.minLength,
                                            'minWidth': element.locationProperties.minWidth,
                                            'minHeight': element.locationProperties.minHeight,
                                            'minDiameter': element.locationProperties.minDiameter,
                                            'minWeight': element.locationProperties.minWeight

                                        }}
                                }, function (err) {
                                    if (err) {

                                        flowController.emit('error', {message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                    } else {

                                        flowController.emit('end', {message: "Location capacity updated successfully", status: 'success', statusCode: '200'});
                                    }
                                });
                            }
                        }
                    });
                });
            });

            flowController.on('end', function (result) {

                res.json(result);
            });

            flowController.on('error', function (errorData) {

                res.json(errorData);
            });

            flowController.emit('START');
        });
//
//
module.exports = router;
