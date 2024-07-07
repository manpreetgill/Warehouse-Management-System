
var express = require('express');
var router = express.Router();

var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var timezone = momenttimezone().tz("Asia/Kolkata").format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);

//******************** models Schema for api**********************
var stockCountSubListModel=require('../../../models/mongodb/processMaster-stockCountSubList/collection-stockCountSubList.js');

/* GET users listing. */

router.route('/v1/processMaster/web/stockCountSubList/configuration/read/stockCountSubList/:stockCountListId/:stockCountSubListId')

        .get(function (req, res, next) {

            var stockCountSubListId = req.params.stockCountSubListId.trim();

            var stockCountListId = req.params.stockCountListId.trim(); 
            var stockCountSubListArray=[];

            stockCountSubListModel.find({'_id': stockCountSubListId, 'stockCountListId': stockCountListId, 'activeStatus': 1}, function (err, stockCountListSubRow) {

                if (err) {// Serverside error

                    res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                } else if (stockCountListSubRow.length == 0) {

                    res.json({message: "No stockCountSublist configured in the system yet!", status: 'error', statusCode: '404'});
                } else {

                    stockCountListSubRow.forEach(function (element) {

                        var pickSublist = {
                        	itemCode:element.itemCode,
                        	itemMasterId:element.itemMasterId

                        };

                        stockCountSubListArray.push(stockCountSublist);
                    });
                    res.json({message: "Operation Successful.", data: stockCountSubListArray, status: 'success', statusCode: '200'});
                }
            });
        });

router.route('/v1/processMaster/web/stockCountSubList/configuration/create/stockCountSubList')

        .post(function (req, res) {

            var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var stockCountListId = req.body.stockCountListId.trim();

            var itemMasterId = JSON.parse(req.body.itemMasterId);// MongoId of the user type

            var itemCode = req.body.itemCode.trim(); //Warehouse Operator, Desktop Operator etc in capital letter
            
            var requiredQuantity = req.body.requiredQuantity.trim();// UserId who created this user

            var locationStoreId=req.body.LocationStoreId.trim();


            var createdBy = req.body.createdBy.trim(); 


                    var newStockCountSubList = new stockCountSubListModel();

                        newStockCountSubList.stockCountListId = stockCountListId;
                        newStockCountSubList.itemMasterId = itemMasterId;
                        newStockCountSubList.itemCode = itemCode; 
                        newStockCountSubList.requiredQuantity = requiredQuantity;
                        newStockCountSubList.locationStoreId=pickLocationId;
                        newStockCountSubList.createdBy = createdBy;
                        newStockCountSubList.timeCreated = timeInInteger;
                       
                       
                        newStockCountSubList.save(function (err) {
                            if (err) {

                                res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '404'});
                            } else {

                                res.json({message: 'New stockCountSubList added into the system!', status: 'success', statusCode: '200'});
                            }
                        });
               
        });


router.route('/v1/processMaster/web/stockCountSubList/configuration/delete/stockCountSubList')

    .delete(function (req, res) {

    	    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

            var stockCountListId = req.body.stockCountListId.trim();
            var stockCountSubListId = req.body.stockCountSubListId.trim();

            stockCountSubListModel.findOne({'_id': stockCountSubListId, 'stockCountListId': stockCountListId,'status':0,'activeStatus':1}, function (err, stockCountListSubRow) {

                        if (err) {// Serverside error

                            res.json({message:"INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                        } else if (stockCountListSubRow == null) {// Data already present in database || 304 - not modified

                            res.json({message: "Can't remove StockCountSubList! This List is already in use.", status: 'error', statusCode: '304'});
                        } else {

                            if (stockCountListSubRow!=null && !stockCountListSubRow.assignedBy) {

                                stockCountSubListModel.update(
                                        {'_id': stockCountSubListId},
                                        {'$set': {'activeStatus': 2, 'timeModified': timeInInteger}},
                                        function (err) {
                                            if (err) {

                                                res.json({message: "INTERNAL SERVER ERROR "+err, status: 'error', statusCode: '500'});
                                            } else {

                                                res.json({message: "StockCountSubList removed from system!", status: 'success', statusCode: '201'});
                                            }
                                });
                          
                          }else{
                          	res.json({message: "Can't remove StockCountSubList! This List is already Assigned By system!", status: 'error', statusCode: '304'});

                          }
                        }
                    });
            });



module.exports = router;