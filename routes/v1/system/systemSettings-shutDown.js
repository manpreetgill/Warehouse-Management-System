var express = require('express');
var router = express.Router();
var events = require('events');
var EventEmitter = events.EventEmitter;
var sys = require('sys')
var exec = require('child_process').exec;
//----------------------------------------------------------------------------------------------------------------------------
// Assign category to locations
//----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/virtualMachine/process/action/auto-shutdown/')

        .post(function (req, res) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var flowController = new EventEmitter();

            flowController.on('START', function (response) {

                exec("shutdown -h now", puts);
                
                flowController.emit('END',{message:'Aider will shutdown soon...',status:'success',statusCode:'200'});
            });

            // End
            flowController.on('END', function (response) {

                (consoleLog) ? console.log('END') : '';

                res.json(response);
            });

            // Error
            flowController.on('ERROR', function (error) {

                (consoleLog) ? console.log('ERROR') : '';
                (consoleLog) ? console.log(error) : '';

                res.json(error);
            });

            // Initialize
            flowController.emit('START');
        });

function puts(error, stdout, stderr) {
    sys.puts(stdout);
}
//
//
module.exports = router;