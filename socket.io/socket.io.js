//------------------------------------------socket.io SERVER ******************************************************************
module.exports = function (app) {

    io.on('connection', function (socket) {

        outside = new customSocketFunction(socket);

        socket.on('battery', function (msg) {
            /////
            console.log('battery=data----' + msg);

            var arr = msg.toString().split("#");

            var warehouseId = arr[0];

            var deviceId = arr[1];
            var userId = arr[2];
            var swVersion = arr[3];
            var battery = arr[4];
            var baseUrl = arr[5];

            var requestifyUrl = baseUrl + '/v1/deviceMaster/web/device/tracking/create/device-tracking/';

            var requestify = require('requestify');

            requestify.post(requestifyUrl, {warehouseId: warehouseId, deviceId: deviceId, userId: userId, battery: battery, status: 'ONLINE', swVersion: swVersion}).then(function (response) {

                var result = response.getBody();

                if (result.status === 'success') {
                    (consoleLog) ? console.log('done') : '';
                    resolve();
                }

                if (result.status === 'error') {
                    (consoleLog) ? console.log('Error') : '';
                    (consoleLog) ? console.log(result) : '';
                    reject();
                }
            });
            socket.emit('battery', "battery=recieved");
        });

        socket.on('putlist', function (msg) {
            /////
            console.log('putlist=data-----' + msg);
            socket.emit('putlist', "putlist=recieved");
        });

        socket.on('pickList', function (msg) {
            ///////
            console.log('picklist=data-----' + msg);
            socket.emit('picklist', "picklist=recieved");
        });
        //withdraw case
        socket.on('pickListStatus', function (status) {

            var arr = status.toString().split("#");

            var warehouseId = arr[0];
            var pickSubListId = arr[1];
            var modifiedBy = arr[2];
            var baseUrl = arr[3];
            var withdrawStatus = arr[4];

            var requestifyUrl = baseUrl + '/v1/processMaster/web/pickSubList/configuration/update/android/status-to-withdrawn/';

            var requestify = require('requestify');

            requestify.post(requestifyUrl, {warehouseId: warehouseId, pickSubListId: pickSubListId, withdrawStatus: withdrawStatus, modifiedBy: modifiedBy}).then(function (response) {

                var result = response.getBody();

                if (result.status === 'success') {

                    console.log('done');
                }
                if (result.status === 'error') {

                    console.log('error');
                }
            });
        });
    });
};

function customSocketFunction(socket) {
    this.emit = function (actionItem, data) {
        if (socket) {
            console.log('emitted putlist');
            socket.emit(actionItem, data);
        }
    };
}


