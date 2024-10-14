import { Actor, log } from 'apify';
import { type AnyBulkWriteOperation } from 'mongodb';

import { ImportOptions, ImportStats } from './types';

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

export async function importFromDataset(datasetId: string, importOptions: ImportOptions, importStatsState: ImportStats) {
    const dataset = await Actor.openDataset(datasetId, { forceCloud: true });
    const limit = 100;
    log.info('Importing data from dataset', { datasetId, inBatchOf: limit });
    while (true) {
        const data = await dataset.getData({ offset: importStatsState.offset, limit });
        if (data.items.length === 0) break;
        const bulkOperations: AnyBulkWriteOperation[] = data.items.map((object: Record<string, unknown>) => {
            if (importOptions.uniqueKeys && Array.isArray(importOptions.uniqueKeys) && importOptions.uniqueKeys.length > 0) {
                const filter = pickFromObject(object, importOptions.uniqueKeys);
                return {
                    updateOne: {
                        filter,
                        update: { $set: object },
                        upsert: true,
                    },
                };
            }
            return {
                insertOne: {
                    document: object,
                },
            };
        });

        try {
            const result = await importOptions.collection.bulkWrite(bulkOperations);
            console.log('result', result);
            importStatsState.imported += result.insertedCount || result.upsertedCount;
            importStatsState.updated += result.modifiedCount;
            log.info('Imported batch data', { imported: importStatsState.imported, updated: importStatsState.updated });
        } catch (err) {
            importStatsState.failed += data.items.length;
            // @ts-ignore
            log.error('Import batch failed', { error: err?.message });
        } finally {
            importStatsState.offset += data.items.length;
        }
    }
}
