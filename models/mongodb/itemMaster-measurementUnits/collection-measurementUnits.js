// This defines the measurement unit of item like kg/unit/litre etc
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var measurementUnitsSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse 
    name: {type: String, index: true}, // Name of the Measurement Unit
    timeCreated: Number,
    timeUpdated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-measurementUnit", measurementUnitsSchema, 'itemMaster-measurementUnits'); // Object - Its modeling - Its collection name