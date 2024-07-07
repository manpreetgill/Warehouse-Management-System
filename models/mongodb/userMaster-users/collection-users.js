var mongoose = require('mongoose');
var connections = require('../../../db_connections/dbConnections');
var dbConfName = 'db-avancer';

var userSchema = mongoose.Schema({
    warehouseId: {type: String, index: true}, // MongoId of the warehouse
    userTypeId: {type: String, index: true}, // MongoId of user type
    userCategoryId: {type: String, index: true},
    materialHandlingUnitId: [],
    employeeId: String, // Employee number 
    firstName: String,
    lastName: String,
    doneCount: {type: Number, default: 0},
    username: {type: String, index: true},
    password: {type: String, index: true},
    totalWorkingHours: Number,
    targetCapacity: Number,
    allocatedCapacity: {type: Number, default: 0},
    pendingCapacity: {type: Number, default: 0},
    accessConfigurationId: String, // Access Configuration over UI for User
    allocatedLicenseId: String,
    avatar: {type: String, default: "images/users/user.png"}, // Photo of use
    timeCreated: Number,
    createdBy: String, // Userid of user who created new user    
    timeModified: Number,
    modifiedBy: String, // Modified by user id
    lastSeen: Number,
    version: {type: String, default: "v1"}, // current version of modeling, to have track of integrational changes in client database row
    activeStatus: {type: Number, default: 1} // Record active status (For server use only)
});

module.exports = connections[dbConfName].model("transactionalData-user", userSchema, 'transactionalData-users'); // Object - Its modeling - Its collection name