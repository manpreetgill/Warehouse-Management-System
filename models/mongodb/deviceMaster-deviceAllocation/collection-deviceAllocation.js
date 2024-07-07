var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var deviceAllocationSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // warehouse Id
    timestamp: Number, // Timestamp of the date
    date: String, // date the allocation done in DD/MM/YY
    deviceId: {type: String, index: true}, // MongoId of Device
    userId: {type: String, index: true}, // The user to whom device allocated
    timeCreated: Number, // time Record added
    allocatedBy: String, // Allocation done by
    timeModified: String, // Time record modified
    modifiedBy: String, // Person who modified
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("deviceMaster-deviceAllocation", deviceAllocationSchema, 'deviceMaster-deviceAllocations'); // Object - Its modeling - Its collection name