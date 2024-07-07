var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var levelMasterSchema = mongoose.Schema({
    lineId: {type: String, index: true}, // MongoId of the line in which the level is present 
    numberOfSide: { type: Number, default: 0 },
    isReservedForCategory: { type: String, default: 'NO' }, // YES,NO
    reservedCategoryId: String, //mongoId
    isReservedForSubCategory: { type: String, default: 'NO' }, // YES,NO
    reservedSubCategoryId: [], //mongoId
    isReservedForItem: { type: String, default: 'NO' }, // YES,NO
    reservedItemId: [], //MongoId
    reservedBy: String,
    timeReserved: Number,
    level: String, // User defined level name
    levelCode: String, // System defined level code
    levelCodeString: String, // System defined level code
    availability: { type: String, default: 'A' }, // B,A 
    function: String, // DOCK/RMA/SCRAP/BLOCK(Blocked)
    comments: String, // If blocked, the reaon for blocked
    timeCreated: Number,
    timeModified: Number,
    createdBy: String,
    modifiedBy: String,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-levelMaster", levelMasterSchema, 'locationMaster-levelMasters'); // Object - Its modeling - Its collection name