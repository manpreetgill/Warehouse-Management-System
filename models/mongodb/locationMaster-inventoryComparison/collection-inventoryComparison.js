var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var inventoryComparisonSchema = mongoose.Schema({
    warehouseId: String, //MongoId of the warehouse
    date: String, // MongoId of the area.
    locations: [],
    timeCreated: Number,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-inventoryComparison", inventoryComparisonSchema, 'transactionalData-inventoryComparisons'); // Object - Its modeling - Its collection name