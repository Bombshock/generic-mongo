var q = require('q');

module.exports = function find(where) {
    var query = this;

    query.where(where);

    return q.Promise(function (resolve, reject) {
        query.mongoWrapper.$promise.then(function (collection) {
            collection
                .find(query.$where)
                .limit(query.$limit)
                .skip(query.$skip)
                .sort(query.$sort)
                .toArray(callbackHandler);

            function callbackHandler(err, results) {
                if (err) {
                    reject(err)
                } else {
                    query.mongoWrapper.transform(results, query).then(function (results) {
                        resolve(results);
                    });
                }
            }
        });

    });
};