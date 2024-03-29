'use strict';

//ExpressJS for rest API
import express from 'express';
import cors from 'cors';
import { createServer } from "http";
import { Server } from "socket.io";

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
    const http = createServer(app);
    const io = new Server(http, { origins: '*:*'});

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

    app.post('/api/admins', admins.createAdmin);
    app.post('/api/admins/login', admins.login);

    app.post('/api/locations', locations.createLocation);
    app.get( '/api/locations', locations.getLocations);

    app.get( '/api/locations/:jid', locations.getLocation);
    app.get( '/api/locations/:location/users/:name', users.userExists);
    app.post('/api/locations/:location/users', users.createUser);
    app.post('/api/locations/:location/users/login', users.login);

    app.post('/api/locations/:location/jid', jid.save);
    app.get( '/api/locations/:location/stats', stats.getStats);

    http.listen(port, () => {
        console.log(`Server running on port ${port}!`);
    });
}
