const Apify = require('apify');
const MongoClient = require('mongodb').MongoClient;

const sleepPromised = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        failed: 0
    };

    if (input.imports) {
        // Import objects from input.objectsToImport
        if (input.imports.plainObjects && Array.isArray(input.imports.plainObjects)) {
            for (const object of input.imports.plainObjects) {
                try {
                    await collection.insert(object);
                    importStats.imported++;
                } catch (err) {
                    importStats.failed++;
                    console.log(`Cannot import object ${JSON.stringify(object)}: ${err.message}`);
                }
                sleepPromised(100);
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
                    try {
                        await collection.insert(object);
                        importStats.imported++;
                    } catch (err) {
                        importStats.failed++;
                        console.log(`Cannot import object ${JSON.stringify(object)}: ${err.message}`);
                    }
                    sleepPromised(100);
                }
            }
        }
    } else {
        throw new Error('no objects to import!');
    }

    console.log(`Import stats: imported: ${importStats.imported} failed: ${importStats.failed}`);
    await Apify.setValue('OUTPUT', importStats);
});
