# generic-mongo
Generic MongoDB Datamodel


## Usage
```js
var config = {
    port: 27017,
    host: 'localhost',
    db: 'mongo',
    collection: 'generic'
};

var mongo = require('generic-mongo')(config);
```

```js
mongo
    .query("foo")
    .populate(true)
    .find()
    .then(successHandler, errorHandler);
```

### init
`require('generic-mongo')` returns a top level function, that accepts a config and an array of Plugins. The populator plugin will be unshifted into this array

## Query

### mongo.query(type)
returns a query-object. If `type` ist set, the query will only lookup this type. 

### query.populate(boolean)
If this is set to `true` the query will resolve all `MongoDB.ObjectID`'s to its documents. This only happens for top level attributes and arrays (so far)

```js
//would resolve
{
    "foo" : ObjectID("xxxxxxxxx")
}
```

```js
//would resolve
{
    "foo" : [ObjectID("xxxxxxxxx")]
}
```

```js
//would not resolve
{
    "foo" : {
        "bar": ObjectID("xxxxxxxxx")
    }
}
```

### query.limit(integer)
sets the limit for results

### query.skip(integer)
sets the amount of skipped results

### query.sort(Object)
sets sorting, refer to the official MongoDB docs

### query.where(Object)
sets query conditions, refer to the official MongoDB docs. This method is allways available, but is not used for inserts