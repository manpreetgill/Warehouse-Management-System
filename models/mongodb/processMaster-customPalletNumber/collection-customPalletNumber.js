var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var customPalletNumberSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    customPalletNumber: String,
    timeCreated: Number,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-customPalletNumber", customPalletNumberSchema, 'transactionalData-customPalletNumber'); // Object - Its modeling - Its collection name