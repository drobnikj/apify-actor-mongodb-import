# MongoDB Import
Actor imports items from dataset to specific Mongodb collection.

## Input
You can specified import with attributes:

### mongoUrl(String) - **required**
Connection url to MongoDB, see [Connection String URI Format](https://docs.mongodb.com/manual/reference/connection-string/).

### collection(String) - **required**
Collection name, where act imports objects.

### datasetId(String)
Apify dataset Id, from which act imports objects.

### uniqueKeys(Array)
Unique keys for object, if you specified unique keys, act try to find object with this attributes in DB and update it.
