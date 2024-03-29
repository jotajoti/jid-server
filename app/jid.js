'use strict';

import * as uuid from 'uuid';
import moment from 'moment';
import * as tokenhandler from './tokenhandler.js';
import * as config from './config.js';
import { escapeOrNull, ensureRequestHasContent } from './functions.js';

const countries = new Map();
let JID_REGEXP = /^[1-7][a-z][a-z]\d{2}[a-z]$/;

export async function save(req, res) {
    const result = {
        saved: false,
        code: null,
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
        const database = await res.locals.db;
        ensureRequestHasContent(req);

        const location = escapeOrNull(req.params.location);

        token = await tokenhandler.decodeUserToken(database, req);

        if (token.valid) {
            if (token.decoded.location === location) {
                result.code = {
                    userid: token.decoded.id,
                    location: location,
                    jid: escapeOrNull(req.body.jid),
                    country: null,
                    created: null
                };

                //Check that jid is valid
                await saveJidCode(result, database, token);
            }
            else {
                result.errorCode = "INVALID TOKEN";
                result.error = "Invalid or missing location";
            }
        }
        else {
            tokenhandler.setTokenErrorCode(result, token, location);
        }
    }
    catch (exception) {
        if (!result.errorCode) {
            result.errorCode = "EXCEPTION";
        }
        if (exception.message) {
            result.error = exception.message;
        }
        else {
            result.error = exception;
        }

        if (config.isLoggingErrors()) {
            console.log("Jid.save exception: " + exception);
        }
    }

    res.send(result);
    if (result.saved === true) {
        res.locals.socket.emit('new jid', {
            jid: result.code.jid,
            country: result.code.country,
            userid: token.decoded.id,
            user: token.decoded.name
        });
    }
}

export async function verifyJid(jid, database) {
    const result = {
        valid: false,
        country: null,
        error: null,
        errorCode: null
    }

    await loadCountries(database);
    if (JID_REGEXP.test(jid)) {
        result.country = jid.substring(1, 3);
        if (countries.get(result.country)) {
            result.valid = true;
        }
        else {
            result.error = "Invalid country code: " + result.country;
            result.errorCode = "INVALID COUNTRY";
        }
    }
    else {
        result.error = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter";
        result.errorCode = "INVALID FORMAT";
    }

    return result;
}

async function saveJidCode(result, database, token) {
    let jidVerify = await verifyJid(result.code.jid, database);
    result.code.country = jidVerify.country;

    if (jidVerify.valid) {
        const existingCode = await getCode(database, result.code.userid, result.code.jid, result.code.location);

        if (existingCode == null) {
            result.code.id = uuid.v4();
            result.code.created = moment().toISOString();
            await saveCode(database, result.code);
            result.saved = true;
        }
        else {
            result.error = `Duplicated code (already registered on user ${token.decoded.name})`;
            result.errorCode = "DUPLICATE";
            result.code = existingCode;
        }
    }
    else {
        result.error = jidVerify.error;
        result.errorCode = jidVerify.errorCode;
    }

    return result;
}

async function getCode(database, userid, jid, location) {
    return database.get("select * from jid where userid=? and jid=? and location=?", userid, jid, location);
}

async function saveCode(database, code) {
    await database.run("insert into jid (id, userid, location, jid, country, created) values (?,?,?,?,?, ?)", 
        code.id, code.userid, code.location, code.jid, code.country, code.created);
}

async function loadCountries(database) {
    if (countries.size === 0) {
        const result = await database.all("select * from country");
        if (result) {
            result.forEach(function (row) {
                countries.set(row.code, row.country);
            });
        }
    }
}
