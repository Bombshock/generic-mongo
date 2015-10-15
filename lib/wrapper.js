"use strict";

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var q = require('q');
var _ = require('lodash');
var util = require("util");

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
MongoWrapper.prototype.pluginChain = pluginChain;
MongoWrapper.prototype.init = mongoWrapperInit;

function MongoWrapper(config, plugins) {
    var mongo = this;

    mongo.$plugins = plugins || [];
    mongo.$config = _.extend({}, defaultConfig, config);
    mongo.url = mongo.$config.url || 'mongodb://' + mongo.$config.host + ':' + mongo.$config.port + '/' + mongo.$config.db;
    mongo.$promise = mongo.connect();
    mongo.$promise.catch(errorHandler);

    mongo.$plugins.unshift(require('./populator'));
    mongo.$plugins.unshift(require('./structure'));

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
            console.log("\u001b[36mGenericMongo.debug\u001b[0m :: registering plugin %s", plugin.constructor.name);
        }
        if (plugin.inherit) {
            for (var key in plugin.inherit) {
                if (plugin.inherit.hasOwnProperty(key)) {
                    console.log("\u001b[36mGenericMongo.debug\u001b[0m :: inheriting %s", key);
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
                mongo.$db = db;
                resolve(db.collection(mongo.$config.collection));
            }
        });
    });
}

function mongoWrapperQuery(type) {
    return new Query(this, type);
}

function pluginChain() {
    var args = Array.prototype.slice.call(arguments);
    var chainName = args.shift();

    var promise = q.when(args[0]);

    for (var i = 0; i < this.$plugins.length; i++) {
        if (this.$plugins[i][chainName] && typeof this.$plugins[i][chainName] === "function") {
            promise = chain(this.$plugins[i]);
        }
    }

    function chain(plugin) {
        return promise.then(function (data) {
            args[0] = data;
            return q.when(plugin[chainName].apply(plugin, args)).catch(function (err) {
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

Query.prototype.find = require('./querys/find');
Query.prototype.findOne = require('./querys/findOne');
Query.prototype.insert = require('./querys/insert');

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

    if (typeof where === "string") {
        query.$where = {"_id": new ObjectID(where)};
    }

    if (query.$type) {
        query.$where.type = query.$type;
    }
    return this;
}
