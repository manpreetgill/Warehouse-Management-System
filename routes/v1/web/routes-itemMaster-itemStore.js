var express = require('express');
var router = express.Router();
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var printer = require("node-thermal-printer");
var Promises = require('promise');
var MagicIncrement = require('magic-increment');
//---------------------------------------------------------------------------------------------------------------------------
var itemStoreModel = require('../../../models/mongodb/itemMaster-itemStore/collection-itemStore.js');
var itemMasterModel = require('../../../models/mongodb/itemMaster-itemMaster/collection-itemMaster.js');
//---------------------------------------------------------------------------------------------------------------------------

module.exports = router;