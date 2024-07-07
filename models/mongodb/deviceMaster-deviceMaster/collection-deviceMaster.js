var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';


var deviceSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    name: String, // Custom name by client
    targetCapacity: {type: Number, default: 0}, // Targeted capacity
    availableCapacity: {type: Number, default: 0}, // Current available capacity
    materialHandlingUnitId: [], // Material handling unit id
    model: String, // Model number
    imeiNumber: String,
    manufacturer: String, // Device Manufacturer
    uuid: String, // UUID of device
    platform: String, // Platform of device
    osversion: String, // Operation system version
    pingInterval: Number, // It will ping server for battery status at this time interval
    syncInterval: Number, // Interval of Sync for device to server to check new activity
    timeCreated: Number, // time Record added
    timeModified: Number, // Time the category modified.
    modifiedBy: String, // Person who modified.
    minPickListItem: Number, //pick and Put list
    maxPickListItem: Number, //pick and Put list
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-deviceMaster", deviceSchema, 'transactionalData-deviceMasters'); // Object - Its modeling - Its collection name