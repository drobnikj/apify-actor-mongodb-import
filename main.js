const Apify = require('apify');
const MongoClient = require('mongodb').MongoClient;
const { createTunnel, closeTunnel } = require('proxy-chain');
const _ = require('underscore');

const sleepPromised = ms => new Promise(resolve => setTimeout(resolve, ms));

const importObjectToCollection = async (collection, object, importStats, uniqueKeys, timestampAttr) => {
    try {
        if (timestampAttr) {
            object[timestampAttr] = new Date();
        }
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
    console.log(input);

    let mongoUrl = process.env.MONGO_URL || input.mongoUrl;
    if (!mongoUrl) throw new Error('mongoUrl is missing!');

    let tunnel = null;
    if (input.proxyUrl) {
        const match = mongoUrl.match(/mongodb:\/\/(.*)@([^/]*)\/?(.*)/);
        if (match) {
            const [wholeString, credentials, host, additionalDetails] = match;
            const hosts = host.split(',');
            tunnel = await createTunnel(input.proxyUrl, hosts[0]);
            mongoUrl = `mongodb://${credentials}@${tunnel}${additionalDetails ? `/${additionalDetails}` : '' }`;
        }
    }

    const collectionName = input.collection || 'results';

    console.log('Import to collection:', collectionName);

    const db = await MongoClient.connect(mongoUrl);
    const collection = await db.collection(collectionName);

    // Import
    const importStats = {
        imported: 0,
        updated: 0,
        failed: 0,
    };

    const uniqueKeys = input.uniqueKeys;
    const timestampAttr = input.timestampAttr;

    if (input.transformFunction) {
        eval(input.transformFunction);
        if (typeof transform != 'function') {
            throw new Error('Transform function is not correctly defined! Please consult readme.');
        }
    }

    const processObject = (typeof transform === 'function') ? transform : (object => object);

    if (input.imports) {
        if (!input.imports.plainObjects && input.imports.objectsFromKvs) throw new Error('No objects to import! You have to specified imports.plainObjects or imports.objectsFromKvs.');
        // Import objects from input.objectsToImport
        if (input.imports.plainObjects && Array.isArray(input.imports.plainObjects)) {
            for (const object of input.imports.plainObjects) {
                const newObject = await processObject(object);
                if (newObject !== undefined) {
                    await importObjectToCollection(collection, newObject, importStats, uniqueKeys, timestampAttr);
                }
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
                    const newObject = await processObject(object);
                    if (newObject !== undefined) {
                        await importObjectToCollection(collection, newObject, importStats, uniqueKeys, timestampAttr);
                    }
                }
            }
        }
    } else {
        throw new Error('No objects to import! You have to specified imports.');
    }

    console.log(`Import stats: imported: ${importStats.imported} updated: ${importStats.updated} failed: ${importStats.failed}`);
    await Apify.setValue('OUTPUT', importStats);
    if (tunnel) {
      await closeTunnel(tunnel);
    }
});
