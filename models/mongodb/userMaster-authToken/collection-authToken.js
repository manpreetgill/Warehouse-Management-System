var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var authTokenSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    userId: String,
    privateKey: String,
    authToken: String,
    timeModified: Date,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1}
});

authTokenSchema.index({timeModified: 1}, {expireAfterSeconds: 1800});

module.exports = connections[dbConfName].model("transactionalData-authToken", authTokenSchema, 'transactionalData-authTokens'); // Object - Its modeling - Its collection name