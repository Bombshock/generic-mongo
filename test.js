"use strict";

var config = {
    port: 27017,
    host: 'localhost',
    db: 'mongo',
    collection: 'generic'
};
var mongo = require('./index')(config);

var query = mongo.query("bar").populate(true).depth(0);
var promise = query.findOne("561e8b11cdb93148224686b3");

promise.then(successHandler, errorHandler);
promise.finally(finallyHanlder);

function successHandler(result) {
    process.nextTick(function () {
        console.log(JSON.stringify(result, null, 4));
    });
    return result;
}

function errorHandler(err) {
    console.error(err.stack);
}

function finallyHanlder() {
    if(mongo.$db) {
        mongo.$db.close();
    }
}