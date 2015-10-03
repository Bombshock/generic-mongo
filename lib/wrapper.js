var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var q = require('q');
var _ = require('lodash');
var prettyMs = require('pretty-ms');

var defaultConfig = {
    port: 27017,
    host: 'localhost',
    db: 'mongo',
    collection: 'generic',
    silent: false
};

module.exports = function (config, plugins) {
    return new MongoWrapper(config, plugins);
};

MongoWrapper.prototype.connect = mongoWrapperConnect;
MongoWrapper.prototype.query = mongoWrapperQuery;
MongoWrapper.prototype.transform = mongoWrapperTransform;
MongoWrapper.prototype.init = mongoWrapperInit;

function MongoWrapper(config, plugins) {
    var mongo = this;

    mongo.$plugins = plugins || [];
    mongo.$config = _.extend({}, defaultConfig, config);
    mongo.url = mongo.$config.url || 'mongodb://' + mongo.$config.host + ':' + mongo.$config.port + '/' + mongo.$config.db;
    mongo.$promise = mongo.connect();
    mongo.$promise.catch(errorHandler);

    mongo.$plugins.unshift(require('./populator'));

    mongo.init();

    function errorHandler(err) {
        if (!mongo.$config.silent) {
            console.error(err);
        }
    }
}

function mongoWrapperInit() {
    var mongo = this;

    for (var i = 0; i < mongo.$plugins.length; i++) {
        var plugin = mongo.$plugins[i];
        if (typeof plugin === "function") {
            mongo.$plugins[i] = plugin = plugin(mongo);
        }
        if(plugin.inherit){
            for(var key in plugin.inherit){
                if(plugin.inherit.hasOwnProperty(key)){
                    Query.prototype[key] = plugin.inherit[key];
                }
            }
        }
    }
}

function mongoWrapperConnect() {
    var mongo = this;
    return q.Promise(function (resolve, reject) {
        MongoClient.connect(mongo.url, function (err, db) {
            if (err) {
                reject(err);
            } else {
                resolve(db.collection(mongo.$config.collection));
            }
        });
    });
}

function mongoWrapperQuery(type) {
    return new Query(this, type);
}

function mongoWrapperTransform(results, query) {
    var promise = q.when(results);

    for (var i = 0; i < this.$plugins.length; i++) {
        if (this.$plugins[i].transform && typeof this.$plugins[i].transform === "function") {
            promise = chain(this.$plugins[i]);
        }
    }

    function chain(plugin) {
        return promise.then(function (results) {
            return q.when(plugin.transform(results, query)).then(null, function (err) {
                console.error(err.message, err.stack);
            });
        });
    }

    return promise;
}

Query.prototype.limit = queryLimit;
Query.prototype.skip = querySkip;
Query.prototype.sort = querySort;
Query.prototype.where = queryWhere;

Query.prototype.find = queryFind;
Query.prototype.findOne = queryFindOne;

function Query(mongoWrapper, type) {
    this.mongoWrapper = mongoWrapper;
    this.$limit = 0;
    this.$skip = 0;
    this.$sort = {};
    this.$where = {};
    this.$type = type;
}

function queryLimit(limit) {
    this.$limit = limit;
    return this;
}

function querySort(sort) {
    this.$sort = sort;
    return this;
}

function querySkip(skip) {
    this.$skip = skip;
    return this;
}

function queryWhere(where) {
    var query = this;

    query.$where = where || {};

    if (query.$where instanceof Array) {
        query.$where = {"_id": {"$in": query.$where}};
    }

    if(typeof where === "string"){
        query.$where = {"_id": new ObjectID(where)};
    }

    if (query.$type) {
        query.$where._type = query.$type;
    }
    return this;
}

function queryFind(where, timeing) {
    var query = this;

    query.where(where);

    return q.Promise(function (resolve, reject) {
        query.mongoWrapper.$promise.then(function (collection) {
            var start = (new Date()).getTime();
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
                        if (timeing) {
                            console.log("duration:", prettyMs ((new Date()).getTime() - start));
                        }
                    });
                }
            }
        });

    });
}

function queryFindOne(where) {
    var query = this;

    query.limit(1);

    return q.Promise(function (resolve, reject) {
        query.find(where).then(successhandlerr, reject);
        function successhandlerr(results) {
            resolve(results[0]);
        }
    });
}