'use strict';

//ExpressJS for rest API
import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';

//API
import * as config from './config.js';
import * as users from './users.js';
import * as stats from './stats.js';
import * as jid from './jid.js';

export async function startServer(args) {
    if (!args) { args = {} }
    const port = args.port || 4000;

    if (!args.database || !args.database.open) {
        throw new Error('You need to supply a database to start the API server');
    }

    const app = express();

    Sentry.init({ dsn: 'https://52167c2055e7418998e77ce32b07b385@o416351.ingest.sentry.io/5310758' });

    app.use(cors());
    app.use(express.json());
    app.use(function (req, res, next) {
        res.locals.db = args.database;
        next()
    });

    app.post('/createUser', users.createUser);
    app.post('/login', users.login);
    app.get('/verifyToken', users.verifyToken);

    app.post('/jid', jid.save);

    app.get('/stats', stats.getStats);

    app.listen(port, () => {
        if (config.isLoggingInfo()) {
            console.log(`Server running on port ${port}!`);
        }
    });
}
