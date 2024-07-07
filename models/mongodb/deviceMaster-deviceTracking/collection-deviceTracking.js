// The device tracking is for tracking the alive status activitiy for device.

var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var deviceTrackingSchema = mongoose.Schema({
    warehouseId: String, // Warehouse Id
    timestamp: Number, // timestamp of 10 digits
    date: String, // Date in dd/mm/yyyy format
    deviceId: String, // MongoId of Device
    userId: String, // MongoId of the user who assigned the device
    status: String, // LOGGEDIN/ONLINE/LOGOUT
    selectedMHE: String,
    swVersion: String, // Version of the software he is running on
    battery: String, // Status of the battery
    timeCreated: Number, // Time activity created
    version: {type: String, default: "v1"}, // Version of integration (For server use only)
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-deviceTracking", deviceTrackingSchema, 'transactionalData-deviceTrackings'); // Object - Its modeling - Its collection name