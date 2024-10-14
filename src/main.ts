import { Actor, log } from 'apify';
import { MongoClient } from 'mongodb';

import { ImportStats, Types } from './types';
import { importFromDataset } from './utils';

await Actor.init();

// Get input
const input: Types | null = await Actor.getInput();
if (!input) throw new Error('Input is missing!');

const mongoUrl = process.env.MONGO_URL || input.mongoUrl;
if (!mongoUrl) throw new Error('mongoUrl is missing!');

const collectionName = input.collection;

log.info('Import to collection', { collectionName });

const client = new MongoClient(mongoUrl);
try {
    await client.connect();
} catch (err: unknown) {
    log.exception(err as Error, 'Cannot connect to mongo');
    // @ts-ignore
    await Actor.fail(`Cannot connect to mongo: ${err?.message}`);
    throw err;
}
const collection = client.db().collection(collectionName);

const importStatsState = await Actor.useState('import-stats', {
    imported: 0,
    updated: 0,
    failed: 0,
    offset: 0,
} as ImportStats);

const { uniqueKeys } = input;

if (input.datasetId) {
    await importFromDataset(input.datasetId, { collection, uniqueKeys }, importStatsState);
} else {
    await Actor.fail('You have to specified what to import by datesetId.');
    throw new Error('You have to specified what to import by datesetId.');
}

log.info(`Import stats: imported: ${importStatsState.imported} updated: ${importStatsState.updated} failed: ${importStatsState.failed}`);

await Actor.setValue('OUTPUT', importStatsState);

await client.close();
await Actor.exit();
