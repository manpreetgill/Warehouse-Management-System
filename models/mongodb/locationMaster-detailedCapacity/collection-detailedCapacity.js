var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var detailedCapacitySchema = mongoose.Schema({
    warehouseId: String, // Warehouse Id
    timestamp: Number, // timestamp of 10 digits
    date: String, // Date in dd/mm/yyyy format
    inventoryOnHandWeight: {},
    inventoryOnHandPrice: {},
    warehouseUtilization: {},
    timeCreated: Number, // Time activity created
    version: {type: String, default: "v1"}, // Version of integration (For server use only)
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-detailedCapacity", detailedCapacitySchema, 'transactionalData-detailedCapacities'); // Object - Its modeling - Its collection name