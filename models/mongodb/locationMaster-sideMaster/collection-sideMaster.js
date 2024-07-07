var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var sideMasterSchema = mongoose.Schema({
    levelId: {type: String, index: true}, // MongoId of the level in which the sides are present
    numberOfLocation: Number, // Number of locations in rack(count)
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-sideMaster", sideMasterSchema, 'locationMaster-sideMasters'); // Object - Its modeling - Its collection name