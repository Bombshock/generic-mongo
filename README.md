# generic-mongo
Generic MongoDB Datamodel

```
var config = {
    port: 27017,
    host: 'localhost',
    db: 'mongo',
    collection: 'generic'
};

var mongo = require('generic-mongo')(config);
```

```
mongo
    .query("foo")
    .populate(true)
    .find()
    .then(successHandler, errorHandler);
```
