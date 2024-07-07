var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var alertSchema = mongoose.Schema({
    warehouseId: String, // MongoId of the warehouse 
    module: String, // Item/Location/Device/User/Picklist/Putlist/Web Login
    name: String, // Specific name of module
    id: String, // MongoId of Specific name of module
    text: String, // What alert - The text will be stored here
    users: [{
            userId: String, //MongoId of user
            status: {type: Number, default: 0}, //0 - Unseen, 1 - Seen
            timeSeen: Number// Time alert seen by user
        }], // User to whom the alert must be given. It can be for multiple users
    timeCreated: Number,
    timeUpdated: Number,
    version: {type: String, default: "v1"},
    activeStatus: {type: Number, default: 1}
});

module.exports = connections[dbConfName].model("itemMaster-alert", alertSchema, 'itemMaster-alerts'); // Object - Its modeling - Its collection name