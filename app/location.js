'use strict';

import * as uuid from 'uuid';
import moment from 'moment';
import * as config from './config.js';
import * as jid from './jid.js';
import { escapeOrNull } from './functions.js';
import * as tokenhandler from './tokenhandler.js';

export async function createLocation(req, res) {
    var result = {
        saved: false,
        location: null,
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
            s(`Location.createLocation exception: ${exception}`);
        }
    }

    res.send(result);
}

async function saveNewLocation(result, req, token, database) {
    result.location = emptyLocation();
    result.location.year = req.body.year ? parseInt(req.body.year) : null;
    result.location.jid = escapeOrNull(req.body.jid);
    result.location.name = escapeOrNull(req.body.name);
    result.location.owner = token.decoded.id;

    //Check that the location is valid
    await validateLocation(result, result.location, database);

    if (!result.error) {
        await saveLocation(database, result.location);
        result.saved = true;
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
            var dbLocation = await getLocation(database, location.year, location.jid);
            if (dbLocation.id) {
                result.errorCode = "DUPLICATE_LOCATION";
                result.error = `A location for jid ${location.jid} for the year ${location.year} is already created`;
            }
        }
    }
}

async function getLocation(database, year, jidcode) {
    var loadedLocation = {};
    if (!isNaN(year)) {
        var result = await database.get('select id, year, jid, name, owner, created from location where year=? and jid=?', [year, jidcode]);
        if (result) {
            loadedLocation.id = result.id;
            loadedLocation.year = result.year;
            loadedLocation.jid = result.jid;
            loadedLocation.name = result.name;
            loadedLocation.owner = result.owner;
            loadedLocation.created = result.created;
        }
    }

    return loadedLocation;
}

async function saveLocation(database, location) {
    await database.run('insert into location (id, year, jid, name, owner) values (?,?,?,?,?)',
        location.id, location.year, location.jid, location.name, location.owner);
}