const express = require('express')
const app = express()
var cron = require('node-cron');
var bodyParser = require("body-parser");
var path = require("path");
var moment =  require('moment');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.get('/',function(req,res){
//   res.sendFile(path.join(__dirname+'/index.html'));
// });
//var routes = require('./app/routes/microRoutes');
//routes(app);
//module.exports = app; // for testing
//var cronNodeScript = require('./scheduler/cronNodeScript');

// //exceute every 1 min
var cronJob = function(){
    var shell = require("./child_helper");

    var commandList = [
        "node cronNodeScript.js",
        // "npm run paramScript -- PeterGood"
    ]
    
    shell.series(commandList , function(err){
       console.log('executed 1 commands in a row'); 
        console.log('done');
    });
};

cronJob();

app.listen(8000, () => console.log('Example app listening on port 8000!'))