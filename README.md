# MongoDB Import Actor

This Actor imports data from an Apify dataset into a specified MongoDB collection. It allows you to take scraped or processed data stored in a dataset and transfer it directly into your MongoDB database. The Actor also supports the identification of unique keys to either update existing documents or insert new ones.

## Features

- Imports data from an Apify dataset into a MongoDB collection.
- Supports identification of unique keys to update existing documents if found.
- Allows flexible MongoDB connection through the provided MongoDB URI.
- Automatically handles connection and insertion into MongoDB.
- Customize the collection name and dataset source.

## How It Works

1. **Dataset Input**: The Actor fetches data from the Apify dataset specified by the `datasetId` parameter.
2. **MongoDB Connection**: Using the provided MongoDB connection string, the Actor connects to the specified MongoDB database.
3. **Data Import**: The Actor imports the data into the collection specified by the `collection` parameter. If unique keys are provided, it will try to update existing documents with matching unique keys, otherwise it will insert new records.
