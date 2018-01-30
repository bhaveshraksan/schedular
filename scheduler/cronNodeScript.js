var cron = require('node-cron');
var fetchAndGenerateAllReports = require("./app/controllers/minuteScripts/fetchAndGenerateAllReports");
var sendEventNotification = require("./app/controllers/minuteScripts/sendEventNotification");
//exceute every 1 min
cron.schedule('*/1 * * * *', function(){
    var shell = require("../scheduler/child_helper");
    
    var commandList = [
        "node fetchAndGenerateAllReports",
        // "node sendNotificationToFillForm.js",
		// "node autoSubmitReports.js",
	    "node sendEventNotification",
		//"node sendEmailToManagers.js",
        // "npm run paramScript -- PeterGood"
    ];
    
    shell.series(commandList , function(err){
       console.log('executed 1 commands in a row'); 
        console.log('done');
    });
});

cron.schedule('/59 /59 /23 * * *', function(){
    console.log("day",new Date());
})