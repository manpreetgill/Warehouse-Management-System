var express = require('express');
var router = express.Router();

var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp
var timezone = momenttimezone().tz("Asia/Kolkata").format(); // timezone in specific timezone
var time = moment(timezone).unix();
var timeInInteger = parseInt(time);

//******************** models Schema for api**********************
var systemLogModels=require('../../models/systemLog/collection-systemLog.js');

/* GET users listing. */

router.route('/systemlog')
.get(function(req, res,next) {
  systemLogModels.find({},function(err,systemLogRow){
  //console.log(adminRow);
  res.send(systemLogRow);
  })
})
/////************
.post(function (req, res){
	var newsystemLog=new systemLogModels();
		newsystemLog.warehouseId=req.body.warehouseId;//MongoId collection warehouseMaster
		newsystemLog.date= new Date().getTime;
	    newsystemLog.timestamp=timeInInteger;
	    newsystemLog.userId=req.body.userId;//mongoId
	    newsystemLog.role=1;//mongoId
	    newsystemLog.processParentId=req.body.processParentId;
	    newsystemLog.processParentCollection=req.body.processParentCollection;
	    newsystemLog.code=req.body.code;
	    newsystemLog.activity=req.body.activity;
	    newsystemLog.timeCreated=timeInInteger;
	    newsystemLog.timeModified=req.body.timeModified; //changes modified by updated time
	    newsystemLog.activeStatus=1;
	    newsystemLog.save(function(err){
		if (err) {
			res.json({message: 'error in save data ', status: 'Failed'});
		}else{
		    res.json({message: 'system Log save data', status: 'success'});
		}
	})
});
module.exports = router;