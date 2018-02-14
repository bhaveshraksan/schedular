const express = require('express')
const app = express()
var cron = require('node-cron');
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