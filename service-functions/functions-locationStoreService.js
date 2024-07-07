var async = require('async');

var locationStoreModel = require('../models/mongodb/locationMaster-locationStore/collection-locationStore');

var function_locationStoreService = {};

function_locationStoreService.getLocationDataByCustomerAddress = function (customerAddress, callback) {

    locationStoreModel.findOne({'customerAddress': customerAddress, 'availability': 'A', 'activeStatus': 1}, function (err, locationStoreRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (locationStoreRow == null) {

            callback({message: 'Location blocked/data missing!', status: 'error', statusCode: '304'});
        } else {

            callback(null, locationStoreRow);
        }
    });
};

function_locationStoreService.getLocationDataByLocationStoreId = function (locationStoreId, callback) {

    locationStoreModel.findOne({'_id': locationStoreId, 'activeStatus': 1}, function (err, locationStoreRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR " + err, status: 'error', statusCode: '500'});
        } else if (locationStoreRow == null) {

            callback({message: 'Details of location not available in warehouse.', status: 'error', statusCode: '304'});
        } else {

            callback(null, locationStoreRow);
        }
    });
};

module.exports = function_locationStoreService;