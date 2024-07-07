/**
 * This file contains mongoose connections to mogodb databases. 
 * Connection configurations are read from config folder and stores connection name and mongoose connection object. 
 * Don't create connection in other files  
 */

var mongoose = require('mongoose');
var config = require('config');
var logger = require('../logger/logger');

mongoose.set("debug", process.env.NODE_ENV === 'development');

var dbConfigs = ['db-avancer'];
var dbConnections = new Array(mongoose.connection);
dbConnections = [];
var connections = {
    getConnection: function (dbConfig) {
        return dbConnections[dbConfigs.indexOf(dbConfig)];
    }
};

/**
 * create mongoose connection for DBs
 * @param configName String
 * @returns
 */
function connect(configName) {
    var url = 'mongodb://' + config.get(configName + '.host') + '/' + config.get(configName + '.name');
    var connection = mongoose.createConnection(url);
    connection.on('error', console.error.bind(console, 'connection ' + configName + ' error:'));
    connection.on('close', function () {
        logger.log('connection closed');
    });
    connection.once('open', function (callback) {
        console.log('Connected to ' + configName);
        logger.info('Connected to ' + configName);
    });
    return connection;
}

dbConfigs.forEach(function (item) {
    dbConnections.push(connections[item] = connect(item));
});

module.exports = connections;