var express = require('express');
var router = express.Router();
var Promises = require('promise');
var requestify = require('requestify');
//----------------------------------------------------------------------------------------------------------------------------
//1. Inward Rules
//2. DIspatch Rules
//3. Holding Types
//4. Measurement Units
//5. Function area
//6. Process master
//7. Virtual store
//8. Reason master
//9. User types
//10. Auto API User
//11. Rule Engine
//----------------------------------------------------------------------------------------------------------------------------
// API FOR AUTO CONFIGURATION OF PREDEFINED COMPONENTS OF PRODUCT
//-----------------------------------------------------------------------------------------------------------------------------
router.route('/v1/master/configuration/autoapi/')

        .post(function (req, res, next) {

            var consoleLog = 1;

            (consoleLog) ? console.log(req.body) : '';

            var warehouseId = req.body.warehouseId.trim();

            var baseUrl = req.body.baseUrl.trim();

            // Inward Rules
            var autoApiPromise = new Promises(function (resolve, reject) {

                var requestifyUrl = baseUrl + '/v1/itemMaster/web/item/configuration/create/inwardRules/';

                requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                    var result = response.getBody();

                    if (result.status === 'success') {
                        (consoleLog) ? console.log('Inward-Rules') : '';
                        resolve();
                    }

                    if (result.status === 'error') {
                        (consoleLog) ? console.log('Error') : '';
                        (consoleLog) ? console.log(result) : '';
                        reject();
                    }
                });
            });
            // Dispatch Rules
            autoApiPromise.then(function (promise1_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/itemMaster/web/item/configuration/create/dispatchRules/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Dispatch-Rules') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });

                    }, 1000);
                });

            }, function (reject) {

                console.log('reject1');
            }).then(function (promise2_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/itemMaster/web/item/configuration/create/holdingTypes/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Holding-Types') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                console.log('reject2');
                // Measurement Units    
            }).then(function (promise3_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/itemMaster/web/item/configuration/create/measurementUnits/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Measurement-Units') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                console.log('reject3');
                // Function Area
            }).then(function (promise4_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/locationMaster/web/location/configuration/create/function-area/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Function-area') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                console.log('reject4');
                // Process Master
            }).then(function (promise5_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/processMaster/web/process/configuration/create/process/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Process') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                console.log('reject6');
                // Virtual Store
            }).then(function (promise6_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/locationMaster/web/virtualLocation/configuration/create/virtual-store/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Virtual-store') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                console.log('reject7');
                // Reason Master
            }).then(function (promise7_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/reasonMaster/web/reason/configuration/create/reason-master/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Reason-master') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                res.json(reject);
                // User Types
            }).then(function (promise8_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/userMaster/web/user/configuration/create/userType/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('User-type') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                res.json(reject);
                // Auto API User
            }).then(function (promise9_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/userMaster/web/user/configuration/create/autoapi-user/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Avancer-User') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });
            }, function (reject) {

                res.json(reject);
                // Rule Engine
            }).then(function (promise10_resolvedData) {

                return new Promise(function (resolve, reject) {

                    setTimeout(function () {

                        var requestifyUrl = baseUrl + '/v1/locationMaster/web/location/configuration/create/ruleEngine/manual-import/';

                        requestify.post(requestifyUrl, {warehouseId: warehouseId}).then(function (response) {

                            var result = response.getBody();

                            if (result.status === 'success') {
                                (consoleLog) ? console.log('Rule-Engine') : '';
                                resolve();
                            }

                            if (result.status === 'error') {
                                (consoleLog) ? console.log('Error') : '';
                                (consoleLog) ? console.log(result) : '';
                                reject();
                            }
                        });
                    }, 1000);
                });

            }, function (reject) {

                res.json(reject);
            }).then(function (promise11_resolvedData) {

                res.json({message: 'Warehousing configuration set! Now you can move on to configure it for further use', status: 'success', statusCode: '200'});

            }).catch(function (exception) {

                res.json({message: 'An exception arises while setting up warehouse default configuration! Exception details: ' + exception, status: 'success', statusCode: '200'});
            });
        });
//
//
module.exports = router;
