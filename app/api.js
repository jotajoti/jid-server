'use strict';

//ExpressJS for rest API
import express from 'express';
import cors from 'cors';
//API
import * as admins from './admin.js';
import * as locations from './location.js';
import * as users from './user.js';
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
    app.post('/admins/login', admins.login);

    app.post('/locations', locations.createLocation);
    app.get('/locations', locations.getLocations);

    app.post('/createUser', users.createUser);
    app.post('/login', users.login);

    app.post('/jid', jid.save);

    app.get('/stats', stats.getStats);

    http.listen(port, () => {
        console.log(`Server running on port ${port}!`);
    });
}
