"use strict";

var q = require('q');

module.exports = function (where) {
    var query = this;

    query.limit(1);

    return q.Promise(function (resolve, reject) {
        query.find(where).then(successhandlerr, reject);
        function successhandlerr(results) {
            resolve(results[0]);
        }
    });
};