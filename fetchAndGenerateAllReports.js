var conFig = require("./config.js");
var mongo = require('then-mongo');
var _ = require('underscore');
var moment =  require('moment') ;
// import moment from 'moment';
var mongoUrl = conFig.mongourl;//"mongodb://localhost:27017/smart_qa"; //config.mongourl;
console.log(mongoUrl)
var db = mongo(mongoUrl, ["smtCompaniesDivison", "smtFormTemplateCompanyAlias","smtReportsTemplateAlias","smtReportsTemplateCompanyAlias"]);


var promise1 = new Promise(function (resolve, reject) {
    resolve(db['smtCompaniesDivison'].find({"isActive": true}));//1
});
// var p1 = function (query) {//2
//     return new Promise(function (resolve,rej) {
//         resolve(db['smtReportsTemplateAlias'].find(query));

//     })
// }
var collection = function (name,query) {//2
    return new Promise(function (resolve,rej) {
        resolve(db[name].find(query));

    })
}

// var pp = function (query) {//2
//     return new Promise(function (resolve,rej) {
//         resolve(db['smtReportsTemplateAlias'].find(query));

//     })
// }

// var pp1 = function (query) {
//     return new Promise(function (resolve,rej) {
//         resolve(db['smtReportsTemplateCompanyAlias'].find(query));
//     })
// }
var promise2 =
    promise1.then((s) => {
        return s;//1
    })
    .then((divisions) => {
        if (divisions.length) {
            var divisionIds = divisions.map(function (d) {
                return d._id;
            });
            return collection("smtReportsTemplateAlias",{"status": "ASSIGNED", "companyDivisionId": {$in: divisionIds}});//2
        }
    })
    .then((smtReportsTemplateAlias) => {
        var x = [];
        _.each(smtReportsTemplateAlias,function(reportAlias,index){
            collection("SmtReportsTemplateCompanyAlias",{_id: reportAlias.reportId})
            .then(function(reportCompanyAlias){
                console.log(index)
                if(reportCompanyAlias.isActive)
                    x.push(reportAlias);
                }) 
            // if(pp1({_id: reportAlias.reportId,isActive:true}))
            //     x.push(reportAlias);//3
        });
        return x;
    })
    .then((reportAlias)=>{
        console.log(reportAlias);
    })

