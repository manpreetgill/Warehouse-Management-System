var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var userCategorySchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    userTypeId: String, // MongoId of the User type under which this category created.
    name: String, // Warehouse Operator, Desktop Operator etc
    enable: { type: String, default: "YES" }, // YES/NO 
    typeName: { type: String, default: "OPEN" }, // If it is open then it is editable and if fixed then non editable and cant be removed
    createdBy: String, // MongoId of user who created category
    timeCreated: Number,
    timeModified: Number,
    modifiedBy: String, // Modified by user id    
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("userMaster-userCategory", userCategorySchema, 'userMaster-userCategories'); // Object - Its modeling - Its collection name