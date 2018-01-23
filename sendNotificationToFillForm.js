var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;

var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
console.log(mongoUrl)
var db = mongo(mongoUrl,[""]);

