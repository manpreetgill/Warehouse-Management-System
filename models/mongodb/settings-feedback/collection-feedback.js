var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var feedbackSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    userId: String,
    description: String,
    timeCreated: Number, // time Record added
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1}
});

module.exports = connections[dbConfName].model("userData-feedback", feedbackSchema, 'userData-feedbacks'); // Object - Its modeling - Its collection name