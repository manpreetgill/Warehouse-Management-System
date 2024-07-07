var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var technicalDetailsSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    imeiNumber: {type: String, index: true}, // IMEI Number of device
    timeCreated: Number, // Time created the record
    timeModified: Number, // Time the category modified.
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("deviceMaster-technicalDetails", technicalDetailsSchema, 'deviceMaster-technicalDetails'); // Object - Its modeling - Its collection name