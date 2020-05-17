'use strict';

import * as jidDatabase from './app/database.js';
import * as api from './app/api.js';
import * as config from './app/config.js';

//Database access
const port = process.env.port;
const path = process.env.database || 'jiddata.db';

async function run() {
    config.setLogLevel("INFO");
    const database = await jidDatabase.createDatabase({
        databaseFile: path,
        traceMigration: false
    });
    await config.checkConfig({
        database: database
    });

    const server = api.startServer({
        database: database,
        port: port
    });
}

run();
