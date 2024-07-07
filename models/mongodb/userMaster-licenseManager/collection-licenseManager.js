var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var licenseManagerSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: String, // Name of the client
    status: { type: String, default: 'OPEN' }, // OPEN - Not allocated yet ALLOCATED - Allocated to user
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("userMaster-licenseManager", licenseManagerSchema, 'userMaster-licenseManagers'); // Object - Its modeling - Its collection name