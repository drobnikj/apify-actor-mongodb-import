# apify-act-mongodb-import
This act imports array of object to specific MongoDB colection.

## Input
You can specified import with attributes:

### mongoUrl(String) - **required**
Connection url to MongoDB, see [https://docs.mongodb.com/manual/reference/connection-string/](Connection String URI Format).

### collection(String) - **required**
Collection name, where act imports objects.

### timestampAttr(String)
When this attribute is set to a String, the act will add a timestamp attribute to each record under the specified name.

### uniqueKeys(Array)
Unique keys for object, if you specified unique keys, act try to find object with this attributes in DB and update it.

### transformFunction(String)
Text representation of a JavaScript function for transforming an object before importing it to the database. The function must be named __transform__, accept one parameter and return the transformed object (can be the same object). If the function returns __undefined__, the object will not be imported. The function may be async or return a promise. Note: If using double quotes, they need to be escaped. Example:
```
function transform(object){
    object.newAttribute = 'some_value';
    return object;
}
```

### imports(Object)

#### plainObjects(Array)
Array of object to import to DB.

#### objectsFromKvs(Object)
Defines object from Apify key-value store to import.

##### storeId(String)
Apify key-value store Id.

##### keys(Array)
List of keys in Apify key-value store.

### Input examples
- Imports list of plains objects:
```
{
  "mongoUrl": "mongodb://user:pwd@85.90.244.43:27017/db",
  "collection": "my-collection",
  "timestampAttr": "created_at",
  "uniqueKeys": ["localUniqueKey"],
  "imports": {
    "plainObjects": [
      {
        "test": "Hello"
      },
      {
        "test": "word"
      }
    ]
  }
}
```

- Imports objects from Apify key-value store:
```
{
  "mongoUrl": "mongodb://user:pwd@85.90.244.43:27017/db",
  "collection": "my-collection",
  "imports": {
    "objectsFromKvs": {
        "storeId": "a7hasd86jds",
        "keys": ["results1"]
    }
  }
}
```
