var config = {
    port: 27017,
    host: 'localhost',
    db: 'mongo',
    collection: 'generic',
    silent: false
};
var mongo = require('./lib/wrapper')(config);

mongo
    .query("foo")
    .populate(true)
    .findOne("560f9158a8c8a6579941d4ab")
    .then(successHandler, errorHandler);

mongo
    .query("foo")
    .populate(true)
    .find()
    .then(successHandler, errorHandler);


function successHandler(results) {
    console.log(JSON.stringify(results, null, 2));
}

function errorHandler(err) {
    console.error(err);
}