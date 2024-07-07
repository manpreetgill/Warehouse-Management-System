var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var holdingTypesSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse 
    name: {type: String, index: true}, // Name of the holding types 
    timeCreated: Number,
    createdBy: String,
    timeUpdated: Number,
    updatedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-holdingType", holdingTypesSchema, 'itemMaster-holdingTypes'); // Object - Its modeling - Its collection name