'use strict';

import moment from 'moment';
import * as users from './users.js';
import * as config from './config.js';

const countries = new Map();

export async function save(req, res) {
    var saved = false;
    var code = null;
    var errorCode = null;
    var error = null;
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
            code = {
                userid: token.decoded.id,
                jid: onlyLettersAndNumbers(req.body.jid),
                country: null,
                created: null
            };

            //Check that jid is valid
            if (/^[1-7][a-z][a-z]\d{2}[a-z]$/.test(code.jid)) {
                code.country = code.jid.substring(1, 3);
                if (countries.get(code.country)) {
                    const existingCode = await getCode(database, code.userid, code.jid);
                    if (existingCode == null) {
                        await saveCode(database, code);
                        code.created = moment().format("YYYY-MM-DD HH:mm:ss");
                        saved = true;
                    }
                    else {
                        //error = `Duplicated code (already registered on user ${token.decoded.username})`;
                        errorCode = "DUPLICATE";
                        code = existingCode;
                    }
                }
                else {
                    //error = "Invalid country code: " + code.country;
                    errorCode = "INVALID COUNTRY";
                }
            }
            else {
                error = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter"
                errorCode = "INVALID FORMAT";
            }
        }
        else {
            //error = token.error;
            if (token.error === "No authorization header found!") {
                errorCode = "MISSING AUTHORIZATION";
            }
            else {
                errorCode = "INVALID TOKEN";

                if (token.error === "jwt expired") {
                    errorCode = "TOKEN EXPIRED";
                    //error = token.error;
                }
            }
        }
    }
    catch (exception) {
        if (!errorCode) {
            errorCode = "EXCEPTION";
        }
        if (exception.message) {
            //error = exception.message;
        }
        else {
            //error = exception;
        }

        if (config.isLoggingErrors()) {
            console.log("Jid.save exception: " + exception);
        }
    }

    res.send({
        saved: saved,
        //code: code,
        errorCode: errorCode,
        error: error
    });
    if (saved === true) {
        res.locals.socket.emit('new jid', {
            jid: code.jid,
            country: code.country,
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
