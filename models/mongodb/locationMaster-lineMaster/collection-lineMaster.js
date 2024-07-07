var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var lineMasterSchema = mongoose.Schema({
    zoneId: {type: String, index: true}, // Zone in which line is present
    numberOfLevel: { type: Number, default: 0 },
    isReservedForCategory: { type: String, default: 'NO' }, // YES,NO
    reservedCategoryId: String, //mongoId
    isReservedForSubCategory: { type: String, default: 'NO' }, // YES,NO
    reservedSubCategoryId: [], //mongoId
    isReservedForItem: { type: String, default: 'NO' }, // YES,NO
    reservedItemId: [], //MongoId
    reservedBy: String,
    timeReserved: Number,
    line: String, // User defined line name
    lineCode: Number, // System defined line code 001
    lineCodeString: String, // System defined line code 001
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

module.exports = connections[dbConfName].model("locationMaster-lineMaster", lineMasterSchema, 'locationMaster-lineMasters'); // Object - Its modeling - Its collection name