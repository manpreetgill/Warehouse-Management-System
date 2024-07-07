var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var cyberneticFilesSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    date: String,
    pickName: String,
    timeCreated: Number,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-cyberneticFiles", cyberneticFilesSchema, 'transactionalData-cyberneticFiles'); // Object - Its modeling - Its collection name