var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var flagsSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse 
    name: String, // Name of the flag
    timeCreated: Number,
    createdBy: String,
    timeUpdated: Number,
    updatedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-flag", flagsSchema, 'itemMaster-flags'); // Object - Its modeling - Its collection name