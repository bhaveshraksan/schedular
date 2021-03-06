var cron = require('node-cron');
var schedule = require('node-schedule');
//
var sendEvent = require("./sendEventNotification");
var fetchGenerate = require('./fetchAndGenerateAllReports');
var autoSubmit = require('./autoSubmitReports');
var sendNotify = require('./sendNotificationToFillForm');
var workWeekAllow = require('./workForTheWeeklyAllowance');
var workMonthAllow = require('./workForTheMonthlyAllowance');
var sendNotifyForBirthAnni = require('./sendAnniversaryAndBirthDayNotification');
var removeOldSales = require('./removeOldSalesErrs');
//exceute every 1 min
var minuteJob = function(){
    schedule.scheduleJob("*/1 * * * *", function() {
        sendEvent.sendEventNotification();
        //fetchGenerate.fetchAndGenerateAllReports();
        //autoSubmit.autoSubmitReports();
        //sendNotify.sendNotificationToFillForm();
    });
}
//execute every dat at 12:05 AM
// var dayTimeJob = function(){
//     var rule = new schedule.RecurrenceRule();
//     rule.dayOfWeek = [0, new schedule.Range(1, 6)];
//     rule.hour = 00;
//     rule.minute = 05;
//     schedule.scheduleJob(rule, function(){
//         workWeekAllow.workForTheWeeklyAllowance();
//         workMonthAllow.workForTheMonthlyAllowance();
//         sendNotifyForBirthAnni.sendAnniversaryAndBirthDayNotification();
//         removeOldSales.removeOldSalesErrs();
//     });
// }
minuteJob();
//dayTimeJob();   