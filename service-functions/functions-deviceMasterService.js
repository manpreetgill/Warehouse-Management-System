var async = require('async');

var deviceMasterModel = require('../models/mongodb/deviceMaster-deviceMaster/collection-deviceMaster');

var function_deviceMasterService = {};

function_deviceMasterService.getDeviceDataByDeviceId = function (deviceId, callback) {

    deviceMasterModel.findOne({'_id': deviceId, 'activeStatus': 1}, function (err, deviceMasterRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
        } else if (deviceMasterRow == null) {

            callback({message: 'Device master missing!', status: 'error', statusCode: '304'});
        } else {

            callback(null, deviceMasterRow);
        }
    });
};

module.exports = function_deviceMasterService;