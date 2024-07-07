var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var clientSchema = mongoose.Schema({
    name: String, // Name of the client
    logo: String, // Logo of the company
    address: String, // Addres where warehouse/warehouse branch located
    city: String, // City of warehouse
    baseUrl: String, // Base url of the client's machine/server where the product to be installed
    licenseUrl: {type: String, default: 'http://localhost:5000/'},
    baseImageUrl: {type: String, default: '/images/client/'}, // SERVER WILL GENERATE IT
    baseFileUrl: {type: String, default: '/public/files/'}, // SERVER WILL GENERATE IT
    timeCreated: Number,
    createdBy: String,
    timeModified: Number,
    modifiedBy: String,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("locationMaster-client", clientSchema, 'locationMaster-clients'); // Object - Its modeling - Its collection name