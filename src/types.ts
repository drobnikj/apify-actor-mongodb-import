import { Collection } from 'mongodb';

export interface Types {
    mongoUrl?: string;
    collection?: string;
    uniqueKeys?: string[];
    datasetId?: string;
    transformFunction?: string; // TBD
    plainObjects?: object[]; // TBD
    objectsFromKvs?: unknown; // TBD
}

export interface ImportStats {
    imported: number;
    updated: number;
    failed: number;
    offset: number;
}

export interface ImportOptions {
    collection: Collection;
    importStats: ImportStats;
    uniqueKeys?: string[];
}
