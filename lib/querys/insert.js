var q = require("q");

modules.exports = function (obj) {
    var query = this;
    var single = false;

    if (!(obj instanceof Array)) {
        single = true;
        obj = [obj];
    }

    return q.Promise(function (resolve, reject) {
        query.mongoWrapper.$promise.then(function (collection) {
            collection.insert(obj, function (err, results) {
                if (err) {
                    reject(err);
                } else {
                    query.mongoWrapper.transform(results, query).then(function (results) {
                        if (single) {
                            resolve(results[0]);
                        } else {
                            resolve(results);
                        }
                    });
                }
            });
        });

    });
};