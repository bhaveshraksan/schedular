var cron = require('node-cron');
//
//var sendEventNotification = require("../app/controllers/minuteScripts/sendEventNotification");
//exceute every 1 min
cron.schedule('*/1 * * * *', function(){
    var shell = require("./child_helper");
    var commandList = [
        //"node fetchAndGenerateAllReports.js"
        //"node sendNotificationToFillForm.js",
		"node autoSubmitReports.js",
	    //"node sendEventNotification",
		//"node sendEmailToManagers.js",
        // "npm run paramScript -- PeterGood"
    ];
    
    shell.series(commandList , function(err){
       console.log('executed 1 commands in a row'); 
        console.log('done');
    });
});

// cron.schedule('00 00 14 * * 1-7', function(){
//     console.log("day",new Date());
// });