var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var dispatchRulesSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse
    name: {type: String, index: true}, // Name if the dispatch rule like : FIFO
    description: String, // Description of the rule like Look all the products for visual appearence
    timeCreated: Number, // Time record created
    timeUpdated: Number, // Time records updated
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("itemMaster-dispatchRule", dispatchRulesSchema, 'itemMaster-dispatchRules'); // Object - Its modeling - Its collection name