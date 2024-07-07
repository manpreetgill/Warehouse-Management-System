var momenttimezone = require('moment-timezone');//timestamp zone
var moment = require('moment'); //timestamp

var transactionalLogService = {};

var functions_transactionalLogService = require('../service-functions/functions-transactionalLogService');

transactionalLogService.addTransactionToLogs = function (logCode, transactionalData, servicecallback) {

    var timeInInteger = parseInt(moment(momenttimezone().tz("Asia/Kolkata").format()).unix());

    var date = moment(new Date()).format('DD/MM/YY');

    switch (logCode) {
        // PUTAWAY reservation from 1000 to 1999
        // PUT Created 
        case 1001:
        {

            functions_transactionalLogService.initial(1001, date, timeInInteger, transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // PUT  In Progress
        case 1002:
        {
            transactionalData.processCode = 1002;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // PUT pending for drop
        case 1003:
        {
            transactionalData.processCode = 1003;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // PUT done
        case 1004:
        {
            transactionalData.processCode = 1004;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // PUT skipped
        case 1005:
        {
            transactionalData.processCode = 1005;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // put edit
        case 1006:
        {
            transactionalData.processCode = 1006;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // pending backlog
        case 1007:
        {
            transactionalData.processCode = 1007;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }

        // PICK PROCESS STARTED ACTIVATED
        case 2001:
        {

            functions_transactionalLogService.initial(2001, date, timeInInteger, transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //picklist assigned/lot assigned,
        case 2002:
        {
            transactionalData.processCode = 2002;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //line item in progress,
        case 2003:
        {
            transactionalData.processCode = 2003;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //item pending for drop,
        case 2004:
        {
            transactionalData.processCode = 2004;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //item dropped at location,
        case 2005:
        {
            transactionalData.processCode = 2005;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //item skipped
        case 2006:
        {
            transactionalData.processCode = 2006;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //pick location manually scanned
        case 2007:
        {
            transactionalData.processCode = 2007;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //item quantity scanned manually
        case 2008:
        {
            transactionalData.processCode = 2008;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //drop location scanned manually
        case 2009:
        {
            transactionalData.processCode = 2009;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //item pending backlogged
        case 2010:
        {
            transactionalData.processCode = 2010;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // PICK reservation ends
        // REPROCESS reservation from 3000 to 3999

        // INWARD PROCESS STARTED ACTIVATED
        case 3001:
        {

            functions_transactionalLogService.initial(3001, date, timeInInteger, transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist assigned/lot assigned,
        case 3002:
        {
            transactionalData.processCode = 3002;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist line item in progress,
        case 3003:
        {
            transactionalData.processCode = 3003;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist item pending for drop,
        case 3004:
        {
            transactionalData.processCode = 3004;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist item dropped at location,
        case 3005:
        {
            transactionalData.processCode = 3005;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist item skipped
        case 3006:
        {
            transactionalData.processCode = 3006;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist pick location manually scanned
        case 3007:
        {
            transactionalData.processCode = 3007;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist item quantity scanned manually
        case 3008:
        {
            transactionalData.processCode = 3008;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist drop location scanned manually
        case 3009:
        {
            transactionalData.processCode = 3009;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        //inwardlist item pending backlogged
        case 3010:
        {
            transactionalData.processCode = 3010;
            transactionalData.date = date;
            transactionalData.timeCreated = timeInInteger;

            functions_transactionalLogService.clone(transactionalData, function (err, transactionId) {
                if (err) {

                    servicecallback(err);
                } else {

                    servicecallback(transactionId);
                }
            });
            break;
        }
        // REPROCESS reservation ends
        // DISPATCH reservation from 4000 to 4999
        case 4001:
        {
            processData = "PICK";
            break;
        }
        // DISPATCH reservation ends
        // DEFAULT Message
        default:
        {
            processData = "default";
        }
    }
};

module.exports = transactionalLogService;


