var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var userAccessConfigurationSchema = mongoose.Schema({
    userTypeId: String,
    userCategoryId: String,
    settings: String, // YES/NO
    addUser: String, // YES/NO
    timeCreated: Number,
    version: { type: String, default: "v1" }, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: { type: Number, default: 1 } // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("userMaster-userAccessConfiguration", userAccessConfigurationSchema, 'userMaster-userAccessConfigurationas'); // Object - Its modeling - Its collection name