var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var virtualLocationStoreSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: {type: String, index: true}, // Reason why location created (Lost/Stolen/Missed) 
    typeName: String,
    assignedItemStoreId: [],
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 }
});

module.exports = connections[dbConfName].model("locationMaster-virtualLocationStore", virtualLocationStoreSchema, 'locationMaster-virtualLocationStores'); // Object - Its modeling - Its collection name