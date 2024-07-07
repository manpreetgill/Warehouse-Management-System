var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

// Out of a particular product, what we required & how we required, This schema will define it
var byPassFeatureSchema = mongoose.Schema({
    master: String, // Master
    key: String, // Feature key to bypass
    value: String, // YES/NO
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("programmingMaster-byPassFeature", byPassFeatureSchema, 'programmingMaster-byPassFeatures'); // Object - Its modeling - Its collection name