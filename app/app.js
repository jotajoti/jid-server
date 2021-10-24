'use strict';

require('dd-trace').init();

import * as jidDatabase from './database.js';
import * as api from './api.js';
import * as config from './config.js';

//Database access
const port = process.env.port;
const path = process.env.database || 'jiddata.db';
const cors = process.env.cors || false;
const loginfo = process.env.info || false;

async function run() {
    if (loginfo) {
        config.setLogLevel("INFO");
    }
    const database = await jidDatabase.createDatabase({
        databaseFile: path,
        traceMigration: false
    });
    await config.checkConfig({
        database: database
    });

    api.startServer({
        database: database,
        port: port,
        cors: cors
    });
}

run();
