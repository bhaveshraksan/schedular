var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
var db = mongo(mongoUrl,["smtEventList"]);
// db.bind('smtEventList');
// db.bind('SmtNotifications');
var sendEventNotification = function(){
	var currentDate = moment(new Date().toISOString()).format("DD-MM-YY");
	var currentTime = moment(new Date().toISOString()).format("HH:mm");
	db.smtEventList.find({}, function(err, result){
		for(var i=0; i<result.length;i++){
			var id = result[i]._id;
			var startDate = new Date(result[i].startDate).toISOString();
			var alreadyNotification = getUserNotify(id);
			var notificationUsers = [];
			var notificationDate = moment(new Date(obj.startDate).toISOString()).add((obj.alertBefore * -1), "day").format("DD-MM-YY");
		}	
	});
}

function getUserNotify(id){
	db.sendNotification.findOne({baseId: id, type: "EVENT-NOTIFICATION"}, function(err, ress){
		return ress;
	});
}

sendEventNotification()


// var sendEventNotification = function(){	
// 	var currentDate = moment(new Date().toISOString()).format("DD-MM-YY");
// 	var currentTime = moment(new Date().toISOString()).format("HH:mm");
// 	var aggregateQuery = []
// 	collectionAggregate("smtEventList",aggregateQuery)
// 	.then(records)=>{
// 		console.log(records.length)
// 	}
// }