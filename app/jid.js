'use strict';

import moment from 'moment';
import * as users from './users.js';
import * as config from './config.js';

const countries = new Map();

export async function save(req, res) {
    var result = {
        saved: false,
        code: null,
        errorCode: null,
        error: null
    }
    var token = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    };

    try {
        var database = await res.locals.db;

        await loadCountries(database);
        token = await users.decodeToken(database, req);
        if (token.valid) {
            result.code = {
                userid: token.decoded.id,
                jid: onlyLettersAndNumbers(req.body.jid),
                country: null,
                created: null
            }

            //Check that jid is valid
            if (/^[1-7][a-z][a-z][0-9][0-9][a-z]$/.test(result.code.jid)) {
                result.code.country = result.code.jid.substring(1, 3);
                if (countries.get(result.code.country)) {
                    const existingCode = await getCode(database, result.code.userid, result.code.jid);
                    if (existingCode == null) {
                        await saveCode(database, result.code);
                        result.code.created = moment().format("YYYY-MM-DD HH:mm:ss");
                        result.saved = true;
                    }
                    else {
                        result.error = `Duplicated code (already registered on user ${token.decoded.username})`;
                        result.errorCode = "DUPLICATE";
                        result.code = existingCode;
                    }
                }
                else {
                    result.error = "Invalid country code: " + result.code.country;
                    result.errorCode = "INVALID COUNTRY";
                }
            }
            else {
                result.error = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter"
                result.errorCode = "INVALID FORMAT";
            }
        }
        else {
            result.error = token.error;
            if (token.error === "No authorization header found!") {
                result.errorCode = "MISSING AUTHORIZATION";
            }
            else {
                result.errorCode = "INVALID TOKEN";

                if (token.error === "jwt expired") {
                    result.errorCode = "TOKEN EXPIRED";
                    result.error = token.error;
                }
            }
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

    function onlyLettersAndNumbers(jid) {
        return ("" + jid).replace(/a-zA-Z0-9/g, '');
    }
}

async function getCode(database, userid, jid) {
    return database.get("select * from jid where userid=? and jid=?", userid, jid);
}

async function saveCode(database, code) {
    await database.run("insert into jid (userid, jid, country) values (?,?,?)", code.userid, code.jid, code.country);
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
