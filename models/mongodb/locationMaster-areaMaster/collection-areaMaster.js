var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var areaMasterSchema = mongoose.Schema({
    warehouseId: String, // 
    numberOfZone: { type: Number, default: 0 },
    isReservedForCategory: { type: String, default: 'NO' }, // YES,NO
    reservedCategoryId: String, //mongoId
    isReservedForSubCategory: { type: String, default: 'NO' }, // YES,NO
    reservedSubCategoryId: [], //mongoId
    isReservedForItem: { type: String, default: 'NO' }, // YES,NO
    reservedItemId: [], //MongoId
    reservedBy: String,
    timeReserved: Number,
    area: String, // User defined area name
    areaCode: Number, // System defined area code 01
    areaCodeString: String, // String data of area code
    availability: { type: String, default: 'A' }, // B,A 
    function: String, // DOCK/RMA/SCRAP/BLOCK(Blocked)
    comments: String, // If blocked, the reaon for blocked
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-areaMaster", areaMasterSchema, 'locationMaster-areaMasters'); // Object - Its modeling - Its collection name