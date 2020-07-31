'use strict';

import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
import * as config from './config.js';

export async function createDatabase(args) {
    if (!args) { args = {} }

    args.databaseFile = args.databaseFile || ':memory:';
    args.traceMigration = args.traceMigration || false;

    if (config.isLoggingInfo()) {
        console.log("Using database '" + args.databaseFile + "'");
    }

    return await init(args);
}

async function init(args) {
    const db = await sqlite.open({
        filename: args.databaseFile,
        driver: sqlite3.Database
    });

    db.trace = args.traceMigration;
    db.on('trace', (data) => {
        if (db.trace) {
            console.log(data);
        }
    })

    if (config.isLoggingInfo()) {
        console.log('Migrating database...');
    }
    await db.migrate();
    if (config.isLoggingInfo()) {
        console.log('Migration finished');
    }
    db.trace = false;

    return db;
}
