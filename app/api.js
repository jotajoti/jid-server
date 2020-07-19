'use strict';

//ExpressJS for rest API
import express from 'express';
import {createServer} from 'http';
import socketio from 'socket.io';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import * as Apm from '@sentry/apm';
//API
import * as config from './config.js';
import * as users from './users.js';
import * as stats from './stats.js';
import * as jid from './jid.js';
import {ServerPush} from "./push";

export async function startServer(args) {
    if (!args) { args = {} }
    const port = args.port || 4000;

    if (!args.database || !args.database.open) {
        throw new Error('You need to supply a database to start the API server');
    }

    const app = express();
    const http = createServer(app);
    const io = socketio(http);

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

    app.use(cors());
    app.use(express.json());
    app.use(function (req, res, next) {
        res.locals.db = args.database;
        res.locals.push = new ServerPush(io);
        next()
    });

    app.post('/createUser', users.createUser);
    app.post('/login', users.login);
    app.get('/verifyToken', users.verifyToken);

    app.post('/jid', jid.save);

    app.get('/stats', stats.getStats);

    app.use(Sentry.Handlers.errorHandler());

    http.listen(port, () => {
        if (config.isLoggingInfo()) {
            console.log(`Server running on port ${port}!`);
        }
    });
}
