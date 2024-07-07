var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var ruleEngineSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, //MongoId of the warehouse
    location: {type: String, index: true}, // MongoId of the area.
    palletSize: [], // MongoId of the zone.
    palletType: [], // MongoId of the line.
    zone: String, // MongoId of the level master where the locations are present.
    sequence: Number, // MongoId of the side master from where the reference to locations have been taken & locations created subsequently
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-ruleEngine", ruleEngineSchema, 'locationMaster-ruleEngines'); // Object - Its modeling - Its collection name