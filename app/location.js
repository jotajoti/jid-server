'use strict';

import * as uuid from 'uuid';
import moment from 'moment';
import * as config from './config.js';
import * as jid from './jid.js';
import { escapeOrNull } from './functions.js';
import * as tokenhandler from './tokenhandler.js';

export async function createLocation(req, res) {
    var result = {
        id: null,
        created: false,
        errorCode: null,
        error: null
    };
    var token = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    };

    try {
        var database = await res.locals.db;

        token = await tokenhandler.decodeAdminToken(database, req);
        if (token.valid) {
            await saveNewLocation(result, req, token, database);
        }
        else {
            tokenhandler.setTokenErrorCode(result, token);
        }
    }
    catch (exception) {
        if (!result.error) {
            result.error = exception;
        }
        if (!result.errorCode) {
            result.errorCode = "UNKOWN";
        }
        if (config.isLoggingErrors()) {
            console.log(`Location.createLocation exception: ${exception}`);
        }
    }

    res.send(result);
}

async function saveNewLocation(result, req, token, database) {
    var location = emptyLocation();
    location.year = req.body.year ? parseInt(req.body.year) : null;
    location.jid = escapeOrNull(req.body.jid, true);
    location.name = escapeOrNull(req.body.name);
    location.owner = token.decoded.id;

    //Check that the location is valid
    await validateLocation(result, location, database);

    if (!result.error) {
        await saveLocation(database, location);
        result.id = location.id;
        result.created = true;
    }
}

function emptyLocation() {
    return {
        id: uuid.v4(),
        year: null,
        jid: null,
        name: null,
        owner: null,
        created: null
    }
}

async function validateLocation(result, location, database) {
    if (!result.error) {
        var currentYear = moment().year();
        var jidVerify = await jid.verifyJid(location.jid, database);

        if (isNaN(location.year) || location.year<2020 || location.year>currentYear) {
            result.errorCode = "INVALID_YEAR";
            result.error = `You must supply a year in the range 2020-${currentYear}`;
        }
        else if (!jidVerify.valid) {
            result.errorCode = jidVerify.errorCode;
            result.error = jidVerify.error;
        }
        else {
            var dbLocation = await getLocationByJid(database, location.year, location.jid);
            if (dbLocation.id) {
                result.errorCode = "DUPLICATE_LOCATION";
                result.error = `A location for jid ${location.jid} for the year ${location.year} is already created`;
            }
        }
    }
}

export async function getLocations(req, res) {
    var result = {
        id: null,
        locations: [],
        errorCode: null,
        error: null
    };
    var token = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    };

    try {
        var database = await res.locals.db;

        token = await tokenhandler.decodeAdminToken(database, req);
        if (token.valid) {
            result.locations = await getLocationsByOwner(database, token.decoded.id);
        }
        else {
            tokenhandler.setTokenErrorCode(result, token);
        }
    }
    catch (exception) {
        if (!result.error) {
            result.error = exception;
        }
        if (!result.errorCode) {
            result.errorCode = "UNKOWN";
        }
        if (config.isLoggingErrors()) {
            console.log(`Location.createLocation exception: ${exception}`);
        }
    }

    res.send(result);
}

async function getLocationsByOwner(database, owner) {
    var locations = [];

    var rows = await database.all('select id, year, jid, name, owner, created from location where owner=?', [owner]);
    for (const row of rows) {
        locations.push(locationFromDB(row));
    }

    return locations;
}

async function getLocationByJid(database, year, jidcode) {
    var loadedLocation = {};
    if (!isNaN(year)) {
        var row = await database.get('select id, year, jid, name, owner, created from location where year=? and jid=?', [year, jidcode]);
        if (row) {
            loadedLocation = locationFromDB(row);
        }
    }

    return loadedLocation;
}

function locationFromDB(result) {
    return {
        id: result.id,
        year: result.year,
        jid: result.jid,
        name: result.name,
        owner: result.owner,
        created: result.created
    };
}

async function saveLocation(database, location) {
    await database.run('insert into location (id, year, jid, name, owner) values (?,?,?,?,?)',
        location.id, location.year, location.jid, location.name, location.owner);
}
