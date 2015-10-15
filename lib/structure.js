/*global module*/
/*global require*/

'use strict';

var ObjectID = require('mongodb').ObjectID;
var q = require('q');

module.exports = StructureFactory;

function StructureFactory(mongoWrapper) {
    return new Structure(mongoWrapper)
}

Structure.prototype.transformInput = structureInputTransformer;

function Structure(mongoWrapper) {
    this.mongoWrapper = mongoWrapper;
    this.inherit = {
    }
}

function structureInputTransformer(results) {
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        result.createdAt = result.createdAt || new Date();
        result.updatedAt = new Date();
    }
}
