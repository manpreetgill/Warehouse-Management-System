var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var processMasterSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: String, // Name of the process
    enable: String, // YES/NO
    timeCreated: Number, // time Record added
    createdBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("processMaster-processMaster", processMasterSchema, 'processMaster-processMasters'); // Object - Its modeling - Its collection name