import { Collection } from 'mongodb';

export interface Types {
    mongoUrl?: string;
    collection: string;
    uniqueKeys?: string[];
    datasetId?: string;
    proxyUrl?: string; // TBD
}

export interface ImportStats {
    imported: number;
    updated: number;
    failed: number;
    offset: number;
}

export interface ImportOptions {
    collection: Collection;
    uniqueKeys?: string[];
}
