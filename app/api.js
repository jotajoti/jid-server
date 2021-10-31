'use strict';

//ExpressJS for rest API
import express from 'express';
import cors from 'cors';
//API
import * as admins from './admins.js';
import * as users from './users.js';
import * as stats from './stats.js';
import * as jid from './jid.js';

export async function startServer(args) {
    if (!args) {
        args = {}
    }
    const port = args.port || 4000;

    if (!args.database || !args.database.open) {
        throw new Error('You need to supply a database to start the API server');
    }

    const app = express();
    const http = require('http').createServer(app);
    const io = require('socket.io')(http, { origins: '*:*'});

    Sentry.init({
        dsn: 'https://5810e3ec687d4e3b986eb158a0c24a8b@sentry.billestauner.dk/3',
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({tracing: true}),
            // enable Express.js middleware tracing
            new Apm.Integrations.Express({app})
        ],
        tracesSampleRate: 1.0
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());

    //Only enable CORS if explicitly selected with runtime parameter
    if (args.cors) {
        console.log("Enabling Cross-origin resource sharing (CORS) on the server");
        app.use(cors());
    }
    app.use(express.json());
    app.use(function (req, res, next) {
        res.locals.db = args.database;
        res.locals.socket = io;
        next()
    });

    app.post('/admins', admins.createAdmin);
    app.post('/createUser', users.createUser);
    app.post('/login', users.login);

    app.post('/jid', jid.save);

    app.get('/stats', stats.getStats);

    http.listen(port, () => {
        console.log(`Server running on port ${port}!`);
    });
}
