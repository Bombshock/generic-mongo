/*global module*/
/*global require*/

'use strict';

var ObjectID = require('mongodb').ObjectID;
var q = require('q');
var _ = require('lodash');

module.exports = PopulatorFactory;

function PopulatorFactory(mongoWrapper) {
    return new Populator(mongoWrapper)
}

Populator.prototype.transformResult = populatorResultTransformer;
Populator.prototype.transformInput = populatorInputTransformer;

function Populator(mongoWrapper) {
    this.mongoWrapper = mongoWrapper;
    this.inherit = {
        populate: queryPopulate,
        depth: queryMaxDepth,
        _cache: queryCache,
        _actualDepth: queryActualDepth
    }
}

function queryCache(cache) {
    this.$cache = cache;
    return this;
}

function queryPopulate(paths) {
    this.$populate = true;

    if (!(paths instanceof Array)) {
        paths = [paths];
    }

    this.$paths = paths;
    return this;
}

function queryMaxDepth(depth) {
    this.$depth = depth;
    return this;
}

function queryActualDepth(depth) {
    this.$depthATM = depth;
    return this;
}

function populatorResultTransformer(results, query) {
    var populator = this;

    var ids_get = [];
    var ids_seen = [];
    var ids_cache = [];

    var result;

    query.$depth = query.$depth || 0;
    query.$depthATM = query.$depthATM || 0;

    for (var j = 0; j < results.length; j++) {
        result = results[j];

        referenceKeys(result);
        childrenKeys(result);

        result.id = result._id.toString();
        delete result._id;
    }

    console.log("query.$depthATM", query.$depthATM);
    console.log("query.$depth", query.$depth);

    if ((query.$depth !== 0 && query.$depthATM >= query.$depth) || !query.$populate) {
        return results;
    }

    populator.$cache = query.$cache || [];
    populator.$cache = populator.$cache.concat(results);
    populator.$cache = destinctObjectArray(populator.$cache);

    ids_cache = populator.$cache.map(function (obj) {
        return obj.id;
    });

    console.log("ids_cache", ids_cache);

    ids_get = ids_get.filter(function (id) {
        var str_id = id.toString();
        var index_seen = ids_seen.indexOf(str_id);
        var index_cache = ids_cache.indexOf(str_id);
        if (index_seen === -1 && index_cache === -1) {
            ids_seen.push(str_id);
            return true;
        }
        return false;
    });

    console.log("ids_get", ids_get);

    if (ids_get.length === 0) {
        mapResults(createObjectMap(populator.$cache));
        return results;
    } else {
        return q.Promise(function (resolve, reject) {
            var $query = populator.mongoWrapper
              .query()
              .populate(true)
              .depth(query.$depth)
              ._cache(populator.$cache)
              ._actualDepth(query.$depthATM + 1);

            $query.find(ids_get)
              .then(function (popResults) {
                  mapResults(createObjectMap(popResults.concat(populator.$cache)));
                  resolve(results);
              }, reject);
        });
    }

    function mapResults(map) {
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            mapReferences(result, map);
            mapChildren(result, map);
        }
    }

    function destinctObjectArray(arr) {
        var out = [];
        var seen = [];

        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            var str_id = obj.id.toString();
            var index_seen = seen.indexOf(str_id);
            if (index_seen === -1) {
                seen.push(str_id);
                out.push(obj);
            }
        }

        return out;
    }

    function createObjectMap(results) {
        var out = {};
        for (var i = 0; i < results.length; i++) {
            out[oneKey(results[i]).toString()] = results[i];
        }
        return out;
    }

    function mapReferences(obj, pool) {
        obj.references = obj.references || {};
        Object.keys(obj.references).map(function (key) {
            obj.references[key] = _.cloneDeep(pool[obj.references[key].toString()]);
        });

    }

    function mapChildren(obj, pool) {
        obj.children = obj.children || {};
        Object.keys(obj.children).map(function (key) {
            obj.children[key] = obj.children[key].map(function (id, index) {
                return obj.children[key][index] = _.cloneDeep(pool[id.toString()]);
            })
        });

    }

    function referenceKeys(obj) {
        obj.references = obj.references || {};
        Object.keys(obj.references).map(function (key) {
            ids_get.push(obj.references[key]);
        });
    }

    function childrenKeys(obj) {
        obj.children = obj.children || {};
        Object.keys(obj.children).map(function (key) {
            ids_get = ids_get.concat(obj.children[key]);
        });
    }
}

function populatorInputTransformer(results) {
    for (var i = 0; i < results.length; i++) {
        var result = results[i];

        referenceKeys(result);
        childrenKeys(result);
    }

    function referenceKeys(obj) {
        obj.references = obj.references || {};
        Object.keys(obj.references).map(function (key) {
            obj.references[key] = oneKey(obj.references[key]);
        });
    }

    function childrenKeys(obj) {
        obj.children = obj.children || {};
        Object.keys(obj.children).map(function (key) {
            obj.children[key] = obj.children[key].map(function (element) {
                return oneKey(element);
            })
        });
    }

    return results;
}

function oneKey(content) {
    if (content instanceof ObjectID) {
        return content;
    } else if (typeof content === "string") {
        return ObjectID(content);
    } else if (content && content.hasOwnProperty("_id")) {
        return ObjectID(content._id);
    } else if (content && content.hasOwnProperty("id")) { //legacy
        return ObjectID(content.id);
    } else {
        throw new Error("generic-mongo :: refrences." + key + ": no valid ObjectID or object containing a _id field");
    }
}