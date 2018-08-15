const Apify = require('apify');
const Promise = require('bluebird');
const fs = require('fs');
// const dns = require('dns');
const ping = require('ping');
const hostile = require('hostile');
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

    let mongoUrl = process.env.MONGO_URL || input.mongoUrl;
    if (!mongoUrl) throw new Error('mongoUrl is missing!');

    let tunnels = null;
    if (input.proxyUrl) {
        let match = mongoUrl.match(/(mongodb):\/\/(.*)@([^/]*)\/?(.*)/); // v3.4 mongo string
        if (!match) match = mongoUrl.match(/(mongodb\+srv):\/\/(.*)@([^/]*)\/?(.*)/); // v3.6 mongo string
        if (match) {
            const [wholeString, protocol, credentials, host, additionalDetails] = match;
            const pureHostnames = [];
            const hosts = host.split(',').map(host => {
                const [hostname, port] = host.split(':');
                pureHostnames.push(hostname);
                if (port == 2) return host;
                else return `${host}:27017`; // default mongodb port is 27017 and is omited from basic 3.6 string
            });

            const tunnels = await Promise.map(hosts, (host) => createTunnel(input.proxyUrl, host))

            if (!process.env.KEEP_HOSTS) {
                // add item to /etc/hosts
                await new Promise((resolve, reject) => {
                    hostile.set('127.0.0.1', pureHostnames.join(' '), (err) => {
                        if (err) return reject(err);
                        return resolve();
                    })
                });

                // Test connectivity to proxy
                await Promise.all(pureHostnames.map(async (hostname) => {
                    const data = await ping.promise.probe(hostname);
                    console.log('Connecting to ip', data.numeric_host);
                    console.log('Host is alive', data.alive);
                }));
            }

            const transformedTunnels = tunnels.map((tunnel, i) => tunnel.replace('localhost', pureHostnames[i])).join(',');
            mongoUrl = `${protocol}://${credentials}@${transformedTunnels}${additionalDetails ? `/${additionalDetails}` : '' }`;
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
        if (!input.imports.plainObjects && !input.imports.objectsFromKvs) throw new Error('No objects to import! You have to specified imports.plainObjects or imports.objectsFromKvs.');
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
                if (!objectsRecord || !objectsRecord.body || typeof objectsRecord.body !== 'object') {
                    console.log(`Cannot import object from store: ${JSON.stringify({ storeId, key })}`);
                    continue;
                }
                // Array path
                if(Array.isArray(objectsRecord.body)){
                    for (const object of objectsRecord.body) {
                        const newObject = await processObject(object);
                        if (newObject !== undefined) {
                            await importObjectToCollection(collection, newObject, importStats, uniqueKeys, timestampAttr);
                        }
                    }
                }
                // Object path
                else{
                    const newObject = await processObject(objectsRecord.body);
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

    if (tunnels) {
        await Promise.all(tunnels, closeTunnel);
    }
});
