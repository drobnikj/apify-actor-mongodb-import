const Apify = require('apify');
const MongoClient = require('mongodb').MongoClient;
const _ = require('underscore');

const sleepPromised = ms => new Promise(resolve => setTimeout(resolve, ms));

const importObjectToCollection = async (collection, object, importStats, uniqueKeys) => {
    try {
        if (uniqueKeys && Array.isArray(uniqueKeys)) {
            const existingObject = await collection.findOne(_.pick(object, uniqueKeys));
            if (existingObject) {
                await collection.updateOne({ _id: existingObject._id }, object);
                importStats.updated++;
            } else {
                await collection.insert(object);
                importStats.imported++;
            }
        } else {
            await collection.insert(object);
            importStats.imported++;
        }
    } catch (err) {
        importStats.failed++;
        console.log(`Cannot import object ${JSON.stringify(object)}: ${err.message}`);
    }
    sleepPromised(100);
};

Apify.main(async () => {
    // Get input of your act
    const input = await Apify.getValue('INPUT');

    const mongoUrl = process.env.MONGO_URL || input.mongoUrl;
    if (!mongoUrl) throw new Error('mongoUrl is missing!');

    const collectionName = input.collection || 'results';

    const db = await MongoClient.connect(mongoUrl);
    const collection = await db.collection(collectionName);

    // Import
    const importStats = {
        imported: 0,
        updated: 0,
        failed: 0,
    };

    const uniqueKeys = input.uniqueKeys;

    if (input.imports) {
        // Import objects from input.objectsToImport
        if (input.imports.plainObjects && Array.isArray(input.imports.plainObjects)) {
            for (const object of input.imports.plainObjects) {
                await importObjectToCollection(collection, object, importStats, uniqueKeys);
            }
        }
        // Import object from Apify kvs
        if (input.imports.objectsFromKvs && input.imports.objectsFromKvs.storeId && input.imports.objectsFromKvs.keys && Array.isArray(input.imports.objectsFromKvs.keys)) {
            const storeId = input.imports.objectsFromKvs.storeId;
            for (const key of input.imports.objectsFromKvs.keys) {
                const objectsRecord = await Apify.client.keyValueStores.getRecord({ storeId, key });
                if (!objectsRecord || !objectsRecord.body || !Array.isArray(objectsRecord.body)) {
                    console.log(`Cannot import object from store: ${JSON.stringify({ storeId, key })}`);
                    continue;
                }
                for (const object of objectsRecord.body) {
                    await importObjectToCollection(collection, object, importStats, uniqueKeys);
                }
            }
        }
    } else {
        throw new Error('no objects to import!');
    }

    console.log(`Import stats: imported: ${importStats.imported} updated: ${importStats.updated} failed: ${importStats.failed}`);
    await Apify.setValue('OUTPUT', importStats);
});
