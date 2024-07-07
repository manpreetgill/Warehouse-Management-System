//var cluster = require('cluster');
//var numCPUs = require('os').cpus().length;
//
//if (cluster.isMaster) {
//  console.log('Master ${process.pid} is running!');
//  // Fork workers.
//  for (var i = 0; i < numCPUs; i++) {
//    cluster.fork();
//  }
//  // On exit
//  cluster.on('exit', (worker, code, signal) => {
//    console.log('worker ${worker.process.pid} died!');
//    cluster.fork();
//    console.log('Master ${process.pid} started!');
//  });
//}


