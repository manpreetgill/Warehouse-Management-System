var async = require('async');

var deviceAreaAllocationModel = require('../models/mongodb/deviceMaster-deviceAreaAllocation/collection-deviceAreaAllocation');

var function_deviceAreaAllocationService = {};

function_deviceAreaAllocationService.getPickAreaAllocatedToDeviceByDeviceId = function (deviceId, callback) {

    deviceAreaAllocationModel.findOne({'deviceId': deviceId, 'process': 'PICK', 'activeStatus': 1}, function (err, deviceAreaAllocationRow) {
        if (err) {

            callback({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
        } else if (deviceAreaAllocationRow == null) {

            callback({message: 'Device not allocated for PICK process', status: 'error',pickMobile:'false', statusCode: '304'});
        } else {

            callback(null, deviceAreaAllocationRow);
        }
    });
};




module.exports = function_deviceAreaAllocationService;