var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path')
var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var Promises = require('promise');
var MagicIncrement = require('magic-increment');

//******************** models Schema for api**********************
var stockCountListModel = require('../../../models/mongodb/processMaster-stockCountList/collection-stockCountList.js');

//*************API Route***********************************************************************************

router.route('/v1/processMaster/web/stockCountList/configuration/read/stockCountList/:warehouseId/')

        .get(function (req, res, next) {

            var warehouseId = req.params.warehouseId.trim(); // MongoId of the warehouse

            stockCountListArray = [];

            stockCountListModel.find({'warehouseId': warehouseId, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}, function (err, stockCountListRow) {

                if (err) {// Serverside error

                    res.json({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                } else if (stockCountListRow.length == 0) {

                    res.json({message: "No stock-count list available for the shift/day!", status: 'error', statusCode: '404'});
                } else {

                    if (stockCountListRow.length != 0) {

                        var count = 0;

                        var promise_getStockCountListData = new Promises(function (resolve, reject) {

                            count++;

                            stockCountListRow.forEach(function (stockCount) {

                                var stockCountList_data = {
                                    id: stockCount._id,
                                    name: stockCount.name,
                                    status: stockCount.status
                                };

                                stockCountListArray.push(stockCountList_data);

                                if (stockCountListRow.length === stockCountListArray.length) {

                                    res.json({message: "Operation Successful.", data: stockCountListArray, status: 'success', statusCode: '200'});
                                }
                            });
                        });

                        promise_getStockCountListData.then(function (response) { // After promise completes, if promise resolved (RESOLVED PART)

                            res.json(response);
                        }, function (reason) {// After promise completes, if promise rejected (REJECTED PART)

                            res.json(reason);
                        }).catch(function (exption) {
                            /* error :( */
                            res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                        });
                    }
                }
            });
        });


router.route('/v1/processMaster/web/stockCountList/configuration/create/stockCountList/')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var warehouseId = req.body.warehouseId.trim();

            var stockCountType = req.body.stockCountType.trim();

            var newStockCountList = new stockCountListModel();

            stockCountListModel.findOne({'warehouseId': warehouseId, 'timeBacklogged': {$exists: false}, 'backloggedBy': {$exists: false}, 'activeStatus': 1}).sort({'name': -1}).exec(function (err, stockCountListRow) {

                if (err) {

                    res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                } else if (stockCountListRow != null) {

                    oldStockCountListName = stockCountListRow.name;
                    newStockCountListName = MagicIncrement.inc(oldStockCountListName);

                    newStockCountList.warehouseId = warehouseId;
                    newStockCountList.name = newStockCountListName;
                    newStockCountList.type = stockCountType;
                    newStockCountList.timeCreated = timeInInteger;

                    newStockCountList.save(function (err) {
                        if (err) {

                            res.json({message:"INTERNAL SERVER ERROR "+err,status: 'error', statusCode: '500'});
                        } else {

                            res.json({message: "New Stockcount-List added into the system!", status: 'success', statusCode: '201'});
                        }
                    });

                } else {
                    if (stockCountListRow == null) {

                        newStockCountList.warehouseId = warehouseId;
                        newStockCountList.name = "StockCountList_" + '001';
                        newStockCountList.type = stockCountType;
                        newStockCountList.timeCreated = timeInInteger;

                        newStockCountList.save(function (err) {
                            if (err) {

                                res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                            } else {

                                res.json({message: "New Stockcount-List added into the system!", status: 'success', statusCode: '201'});
                            }
                        });
                    }
                }
            });
        });


router.route('/v1/processMaster/web/stockCountList/configuration/update/stockCountList')

        .patch(function (req, res) {

            var warehouseId = req.body.warehouseId.trim(); // MongoId of the warehouse

            var stockCountListNewName = req.body.stockCountListNewName.trim().toUpperCase(); // New name if the category


            stockCountListModel.find({'warehouseId': warehouseId, 'name': stockCountListNewName, 'activeStatus': 1}, function (err, stockCountListRow) {
                if (err) {

                    res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                } else if (stockCountListRow.length != 0) {

                    res.json({message: 'Can not update! The same List is already present in the system!', status: 'error', statusCode: '304'});
                } else {

                    if (stockCountListRow != null) {

                        stockCountListModel.update(
                                {'_id': stockCountListId, 'warehouseId': warehouseId},
                                {'$set': {'name': stockCountListNewName, 'timeModified': timeInInteger}},
                                function (err) {
                                    if (err) {
                                        // error while adding records
                                        res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                    } else {
                                        res.json({message: "StockList Data updated into the system!", status: 'success', statusCode: '200'});
                                    }
                                });
                    }
                }
            });
        });

module.exports = router;