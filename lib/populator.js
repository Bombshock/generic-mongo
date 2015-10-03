var ObjectID = require('mongodb').ObjectID;
var q = require('q');

module.exports = PopulatorFactor;

function PopulatorFactor(mongoWrapper) {
    return new Populator(mongoWrapper)
}

Populator.prototype.transform = populatorTransformer;

function Populator(mongoWrapper) {
    this.mongoWrapper = mongoWrapper;
    this.inherit = {
        populate: queryPopulate
    }
}

function queryPopulate(populate){
    this.$populate = populate;
    return this;
}

function populatorTransformer(results, query) {
    var pop = this;

    var ids = [];

    if(!query.$populate){
        return results;
    }

    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        for (var key in result) {
            if (result.hasOwnProperty(key)) {
                if (keyIsObjectID(result, key)) {
                    ids.push(result[key]);
                } else if (result[key] instanceof Array) {
                    ids = ids.concat(result[key].filter(function (id) {
                        return id instanceof ObjectID;
                    }));
                }
            }
        }
    }

    if (ids.length === 0) {
        return results;
    } else {
        return q.Promise(function (resolve, reject) {
            pop.mongoWrapper.query().populate(true).find(ids).then(function (popResults) {
                var map = mapResults(popResults);

                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    for (var key in result) {
                        if (result.hasOwnProperty(key)) {
                            if (keyIsObjectID(result, key)) {
                                result[key] = map[result[key].toString()];
                            } else if (result[key] instanceof Array) {
                                result[key] = result[key].map(function (id) {
                                    if (id instanceof ObjectID) {
                                        return map[id.toString()];
                                    } else {
                                        return id;
                                    }
                                });
                            }
                        }
                    }
                }

                resolve(results);
            }, reject);

            function mapResults(results) {
                var out = {};

                for (var i = 0; i < results.length; i++) {
                    out[results[i]._id.toString()] = results[i];
                }

                return out;
            }
        });
    }
}

function keyIsObjectID(obj, key) {
    return ["_id", "_type"].indexOf(key) === -1 && obj[key] instanceof ObjectID
}