'use strict';

import * as uuid from 'uuid';
import moment from 'moment';
import validator from 'validator';
import * as config from './config.js';
import * as jid from './jid.js';
import { escapeOrNull } from './functions.js';
import * as tokenhandler from './tokenhandler.js';

let LOCATION_FIELDS = 'id, year, jid, country, name, owner, created';

export async function createLocation(req, res) {
    let result = {
        id: null,
        created: false,
        errorCode: null,
        error: null
    };
    let token = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    };

    try {
        let database = await res.locals.db;

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
            result.errorCode = 'UNKOWN';
        }
        if (config.isLoggingErrors()) {
            console.log(`Location.createLocation exception: ${exception}`);
        }
    }

    res.send(result);
}

async function saveNewLocation(result, req, token, database) {
    let location = emptyLocation();
    location.year = req.body.year ? parseInt(req.body.year) : null;
    location.jid = escapeOrNull(req.body.jid, true);
    location.name = escapeOrNull(req.body.name);
    location.owner = token.decoded.id;

    //Check that the location is valid
    location.country = await validateLocation(result, location, database);

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
    let country = null;
    if (!result.error) {
        let currentYear = moment().year();
        let jidVerify = await jid.verifyJid(location.jid, database);

        if (isNaN(location.year) || location.year<2020 || location.year>currentYear) {
            result.errorCode = 'INVALID_YEAR';
            result.error = `You must supply a year in the range 2020-${currentYear}`;
        }
        else if (!jidVerify.valid) {
            result.errorCode = jidVerify.errorCode;
            result.error = jidVerify.error;
        }
        else {
            country = jidVerify.country;
        }

        if (!result.error) {
            let dbLocation = await getLocationByJid(database, location.year, location.jid);
            if (dbLocation != null) {
                result.errorCode = 'DUPLICATE_LOCATION';
                result.error = `A location for jid ${location.jid} for the year ${location.year} is already created`;
            }
        }
    }
    return country;
}

export async function getLocations(req, res) {
    let result = {
        locations: [],
        errorCode: null,
        error: null
    };
    let token = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    };

    try {
        let database = await res.locals.db;

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
            result.errorCode = 'UNKOWN';
        }
        if (config.isLoggingErrors()) {
            console.log(`Location.getLocations exception: ${exception}`);
        }
    }

    res.send(result);
}

export async function getLocation(req, res) {
    let result = {
        location: null,
        errorCode: null,
        error: null
    };

    try {
        let year = req.body.year ? parseInt(req.body.year) : moment().year();
        let jid = escapeOrNull(req.params.jid, true);

        let database = await res.locals.db;
        result.location = await getLocationByJid(database, year, jid);
    }
    catch (exception) {
        if (!result.error) {
            result.error = exception;
        }
        if (!result.errorCode) {
            result.errorCode = 'UNKOWN';
        }
        if (config.isLoggingErrors()) {
            console.log(`Location.getLocation exception: ${exception}`);
        }
    }

    res.send(result);
}
export async function getLocationById(database, id) {
    if (id && validator.isUUID(id)) {
        let row = await database.get(`select ${LOCATION_FIELDS} from location where id=?`, [id]);
        if (row) {
            return locationFromDB(row);
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}

async function getLocationsByOwner(database, owner) {
    let locations = [];

    let rows = await database.all(`select ${LOCATION_FIELDS} from location where owner=?`, [owner]);
    for (const row of rows) {
        locations.push(locationFromDB(row));
    }

    return locations;
}

async function getLocationByJid(database, year, jidcode) {
    if (!isNaN(year)) {
        let row = await database.get(`select ${LOCATION_FIELDS} from location where year=? and jid=?`, [year, jidcode]);
        if (row) {
            let location = locationFromDB(row);
            return location;
        }
    }
    return null;
}

function locationFromDB(result) {
    return {
        id: result.id,
        year: result.year,
        jid: result.jid,
        country: result.country,
        name: result.name,
        owner: result.owner,
        created: result.created
    };
}

async function saveLocation(database, location) {
    await database.run('insert into location (id, year, jid, country, name, owner) values (?,?,?,?,?,?)',
        location.id, location.year, location.jid, location.country, location.name, location.owner);
}
