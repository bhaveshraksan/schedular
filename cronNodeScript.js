var cron = require('node-cron');

//exceute every 1 min
cron.schedule('*/1 * * * *', function(){
    var shell = require('./child_helper');

    var commandList = [
       // "node fetchAndGenerateAllReports.js",
        // "node sendNotificationToFillForm.js",
		// "node autoSubmitReports.js",
		"node sendEventNotification.js",
		//"node sendEmailToManagers.js",
        // "npm run paramScript -- PeterGood"
    ]
    
    shell.series(commandList , function(err){
       console.log('executed 1 commands in a row'); 
        console.log('done');
    });
});
