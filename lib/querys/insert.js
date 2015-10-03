var q = require("q");

module.exports = function (obj) {
    var query = this;
    var single = false;

    if (!(obj instanceof Array)) {
        single = true;
        obj = [obj];
    }

    if (query.$type) {
        for (var i = 0; i < obj.length; i++) {
            obj[i]._type = query.$type;
        }
    }

    return q.Promise(function (resolve, reject) {
        query.mongoWrapper.$promise.then(function (collection) {
            collection.insert(obj, function (err, results) {
                if (err) {
                    reject(err);
                } else {
                    query.mongoWrapper.transform(results.ops, query).then(function (results) {
                        if (single) {
                            resolve(results[0]);
                        } else {
                            resolve(results);
                        }
                    }, reject);
                }
            });
        });

    });
};