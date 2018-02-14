var cron = require('node-cron');
var schedule = require('node-schedule');
//
//var sendEventNotification = require("../app/controllers/minuteScripts/sendEventNotification");
//exceute every 1 min
var minuteJob = function(){
    schedule.scheduleJob("*/1 * * * *", function() {
        var shell = require("./child_helper");
        var commandList = [
            "node fetchAndGenerateAllReports.js",
            "node autoSubmitReports.js",
            "node sendNotificationToFillForm.js",
            "node sendEventNotification.js"
            //"node sendEmailToManagers.js",
        ];
        
        shell.series(commandList , function(err){
           console.log('executed 1 commands in a row'); 
            console.log('done');
        });
    });
}
var dayTimeJob = function(){
    var rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = [0, new schedule.Range(1, 6)];
    rule.hour = 11;
    rule.minute = 37;
    schedule.scheduleJob(rule, function(){
        var shell = require("./child_helper");
        var commandList = [
            "node workForTheWeeklyAllowance.js",
            "node workForTheMonthlyAllowance.js",
            "node sendAnniversaryAndBirthDayNotification.js",
            "node removeOldSalesErrs"
        ];
        shell.series(commandList , function(err){
            console.log('executed 1 commands in a row'); 
            console.log('done');
        });
    });
}
minuteJob();
dayTimeJob();   