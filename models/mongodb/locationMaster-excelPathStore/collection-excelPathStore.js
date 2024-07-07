// The actual number of items & item assigned to this location would be stored in this record/collection
var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var excelPathStoreSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    excelPathDownload: String,
    excelPathUpload: String,
    excelPathInventoryDownload: String,
    excelPathInventoryUpload: String,
    excelPathPutList: String,
    timeCreated: Number, //
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-excelPathStore", excelPathStoreSchema, 'locationMaster-excelPathStores'); // Object - Its modeling - Its collection name