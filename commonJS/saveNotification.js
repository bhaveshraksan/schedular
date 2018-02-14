var conFig = require("../config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment');
var bson = require('bson');
var isObject = require('isobject');

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtNotifications"]);

function saveNotification(notificationObj,from,to) {
	if(typeof notificationObj == 'object'){
	}else{
		console.log('notificationObj must be an object');
		return false;
	} 
	if(Array.isArray(to) == true){
	}else{
		console.log('to must be an array');
		return false;
	}
	if(typeof from == 'string'){
	}else{
		console.log('from must be an string');
		return false;
	}
     if(!from || !to || to.length<=0)
        //throw new Meteor.Error(403,getMessage("problemWithFetchSenderAndReceiver"));
    _.each(to,function (receiver) {
        //globalLogger.info(" Notification Object is ");
        notificationObj.from = from;
        notificationObj.to = receiver;
        notificationObj.isActive =true;
        //globalLogger.info(notificationObj);
        db.smtNotifications.insert(notificationObj, function(err, doc){});
    });
}

module.exports = {
  saveNotification: saveNotification
};