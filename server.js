/**
 * server.js - NodeJS Restful API for PostgreSQL
 * Original work Copyright (c) 2015 Cesar Anton Dorantes @reicek, for Platzi.com/blog
 * Modified work Copyright (c) 2016 Cesar Anton Dorantes @reicek
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
 * and associated documentation files (the "Software"), to deal in the Software without restriction, 
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial 
 * portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE 
 * AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/
// ******************************************
//          Import configurations
// ******************************************
var config           = require('./config.json');
// ******************************************
//        Install NodeJS Dependencies
// ******************************************
// Express
var express          = require('express');
var app              = express();
// Serve-Static 
var serveStatic      = require('serve-static');
// Body-Parser
var bodyParser       = require('body-parser');
// Socket Server
var server           = require('http').Server(app);
// Socket.IO
var io               = require('socket.io')(server);
// PostgreSQL
var massive          = require("massive");
var pg               = require ("pg");
// ******************************************
//                  Initialize
// ******************************************
var startExpress     = function() {
   server.listen(config.express.port);
   db = app.get('db');
   console.log('_____________________');
   console.log('HTTP and API server online')
   console.log('Listening on port '+config.express.port);
}
var initialize       = function() {
   startExpress()
}
// ******************************************
//                      API
// ******************************************
// ------------------------------------------
//             Send back a 500 error
// ------------------------------------------
var handleError      = function(res) {
   return function(err){
      console.log(err)
      res.send(500,{error: err.message});
   }
}
// ------------------------------------------
//          Initialize demo table
// ------------------------------------------
var loadDemoData     = function() {
   console.log('_____________________');
   console.log('Initialize demo table');
   var newDoc = {data:[
      {
         "row": "Read the documentation"
      },
      {
         "row": "Complete the tutorials"
      },
      {
         "row": "Write a demo app"
      },
      {
         "row": "Write an article"
      }
   ]};
   db.saveDoc("steps", newDoc, function(err,response){ // "steps" table is created on the fly
      if (err) {
         handleError(err)
      };
      console.log(response)
   });
}
// ------------------------------------------
//          Retrieve all elements
// ------------------------------------------
var list             = function(request, res, next) {
   console.log('_____________________');
   console.log('API - list/list');
   if(!db.steps){
      loadDemoData();
      return
   };
   db.steps.findDoc(1, function(err,doc){
      if (err) {
         handleError(err)
      };
      console.log(doc.data);
      res.json({ data: doc.data }); 
   });
}
// ------------------------------------------
//  Insert an element on an existing object
// ------------------------------------------
var update           = function(request, res, next) {
   console.log('_____________________');
   console.log('API - update');
   var newDoc = request.body.data;
// console.log(newDoc)
   db.steps.saveDoc({id:1,data:newDoc}, function(err,response){
      if (err) {
         handleError(err);
      } else {
         console.log(response),
         pgClient.query('NOTIFY "changes"');
         res.send('200 OK');
      }
   });
// console.log(object)
}
// ------------------------------------------
// Sends a notification to all clients
// ------------------------------------------
var notify           = function (request,res,next) {
   console.log('_____________________');
   console.log('Forced change notification');
   io.emit("change");
}
// ******************************************
//                PostgreSQL
// ******************************************
var connectionString = "postgres://"+config.postgres.user+":"+config.postgres.password+"@"+config.postgres.host+"/"+config.postgres.db;
var massiveInstance  = massive.connectSync({connectionString : connectionString});
var db;
var pgClient         = new pg.Client(connectionString);
pgClient.connect();
pgClient.query('LISTEN "changes"');
pgClient.on('notification', function(data) {
   console.log('_____________________');
   console.log('Change notification');
   io.emit("change");
});
// ******************************************
//             Express Setup
// ******************************************
// Data parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Define API routes
app.route('/api/list').get(list);
app.route('/api/update').post(update);
app.route('/api/initialize').post(loadDemoData);
app.route('/api/notify').post(notify);
// Static files server
app.use(serveStatic('./public'));
// Set a reference to the massive instance on Express' app:
app.set('db', massiveInstance);
initialize()