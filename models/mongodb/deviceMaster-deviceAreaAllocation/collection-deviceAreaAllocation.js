var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var deviceAreaAllocationSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    deviceId: {type: String, index: true}, // MongoId of the device
    process: String, // UserId of user allocated to area
    zoneAllocated: [], // MongoId of working area of user
    timeCreated: Number, // Time created the record
    timeModified: Number, // Time the category modified.
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("deviceMaster-deviceAreaAllocation", deviceAreaAllocationSchema, 'deviceMaster-deviceAreaAllocations'); // Object - Its modeling - Its collection name