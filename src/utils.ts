import { Actor } from 'apify';

import { ImportOptions } from './types';

/**
 * Like lodash's pick (_.pick)
 * @param object
 * @param keys
 */
export function pickFromObject<T extends object, K extends keyof T>(object: T, keys: K[]): Partial<T> {
    return keys.reduce((obj: Partial<T>, key: K) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            obj[key] = object[key];
        }
        return obj;
    }, {});
}

export async function importObjectToCollection(object: Record<string, unknown>, { collection, importStats, uniqueKeys }: ImportOptions) {
    try {
        // TODO: Use upsert instead of this if
        if (uniqueKeys && Array.isArray(uniqueKeys)) {
            const existingObject = await collection.findOne(pickFromObject(object, uniqueKeys));
            if (existingObject) {
                await collection.updateOne({ _id: existingObject._id }, object);
                importStats.updated++;
            } else {
                await collection.insertOne(object);
                importStats.imported++;
            }
        } else {
            await collection.insertOne(object);
            importStats.imported++;
        }
    } catch (err) {
        importStats.failed++;
    } finally {
        importStats.offset++;
    }
}

export async function importFromDataset(datasetId: string, importOptions: ImportOptions) {
    const dataset = await Actor.openDataset(datasetId, { forceCloud: true });
    // TODO: Improve this one as it is not very efficient
    const limit = 100;
    while (true) {
        const data = await dataset.getData({ offset: importOptions.importStats.offset, limit });
        if (data.items.length === 0) break;
        // TODO: Use bulk mongo db operation instead of this
        for (const object of data.items) {
            await importObjectToCollection(object, importOptions);
        }
    }
}
