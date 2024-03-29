'use strict';

import * as uuid from 'uuid';
import * as config from './config.js';
import * as locations from './location.js';
import { escapeOrNull, ensureRequestHasContent } from './functions.js';
import validator from 'validator';
import randomNumber from 'random-number-csprng';
import * as tokenhandler from './tokenhandler.js';

let USER_FIELDS = 'id, location, name, pincode, created';

function emptyUser() {
    return {
        id: uuid.v4(),
        location: null,
        type: 'user',
        name: null,
        pincode: null,
        created: null
    }
}

async function getUser(database, user) {
    let loadedUser = {};
    if (user.name && user.location) {
        let result = await database.get(`select ${USER_FIELDS} from user where location=? and name=?`, [user.location, user.name]);
        if (result) {
            loadedUser.id = result.id;
            loadedUser.type = 'user';
            loadedUser.location = result.location;
            loadedUser.name = result.name;
            loadedUser.pincode = result.pincode;
            loadedUser.created = result.created;
        }
    }

    return loadedUser;
}

async function saveUser(database, user) {
    await database.run('replace into user (id, location, name, pincode) values (?,?,?,?)',
        user.id, user.location, user.name, user.pincode);
}

export async function createUser(req, res) {
    let database = await res.locals.db;
    let result = {
        id: null,
        pincode: null,
        created: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        let user = emptyUser();
        ensureRequestHasContent(req);

        user.location = escapeOrNull(req.params.location);
        user.name = escapeOrNull(req.body.name);
        user.pincode =(await randomNumber(10000,99999)).toString().substring(1, 5);

        //Must supply with a unique name
        await validateUser(result, user, database);

        //Create user in database
        if (!result.error) {
            await saveUser(database, user);

            result.id = user.id;
            result.created = true;
            result.pincode = user.pincode;
            result.token = await tokenhandler.generateToken(database, user, user.pincode);
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
            console.log(`Users.createUser exception: ${exception}`);
        }
    }

    res.send(result);
}

async function validateUser(result, user, database) {
    if (!result.error) {
        if (!user.location || !validator.isUUID(user.location)) {
            result.errorCode = 'NO_LOCATION';
            result.error = 'You must supply a location id';
        }
        else if (!user.name || user.name.length < 1 || user.name.length > 128) {
            result.errorCode = 'NO_NAME';
            result.error = 'You must supply a name of 1-128 chars';
        }
        else {
            let location = await locations.getLocationById(database, user.location);
            if (location && location.id === user.location) {
                await validateUserFromDB(database, user, result);
            }
            else {
                result.errorCode = 'INVALID_LOCATION';
                result.error = 'Invalid location id';
            }
        }
    }
}

async function validateUserFromDB(database, user, result) {
    let dbUser = await getUser(database, user);
    if (dbUser.id) {
        result.errorCode = 'DUPLICATE_NAME';
        result.error = 'Name is already in use';
    }
}

export async function login(req, res) {
    let database = await res.locals.db;
    let result = {
        successful: false,
        token: null,
        errorCode: null,
        error: null
    }

    try {
        if (!result.error) {
            let location = getLocation(req);
            let name = getName(req);
            let pincode = getPincode(req);

            if (!location) {
                result.errorCode = 'MISSING_LOCATION';
                result.error = 'You must supply a location';
            }
            else if (!name) {
                result.errorCode = 'MISSING_NAME';
                result.error = 'You must supply a name';
            }
            else {
                await validateLogin(database, location, name, pincode, result);
            }
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
            console.log(`Users.login exception: ${exception}`);
        }
    }

    res.send(result);
}

export async function userExists(req, res) {
    let database = await res.locals.db;
    let result = {
        found: false,
        errorCode: null,
        error: null
    }

    try {
        if (!result.error) {
            let location = getLocation(req);
            let name = getName(req);

            if (!location) {
                result.errorCode = 'MISSING_LOCATION';
                result.error = 'You must supply a location';
            }
            else if (!name) {
                result.errorCode = 'MISSING_NAME';
                result.error = 'You must supply a name';
            }
            else {
                let user = await getUser(database, {
                    location: location,
                    name: name
                });
            
                result.found = Boolean(user.id);
            }
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
            console.log(`Users.login exception: ${exception}`);
        }
    }

    res.send(result);
}

function getLocation(req) {
    if (req) {
        if (req.params) {
            return escapeOrNull(req.params.location);
        }
    }
    return null;
}

function getName(req) {
    if (req) {
        if (req.body && req.body.name) {
            return escapeOrNull(req.body.name);
        }
        else if (req.params && req.params.name) {
            return escapeOrNull(req.params.name);
        }
    }
    return null;
}

function getPincode(req) {
    if (req) {
        if (req.body) {
            return req.body.pincode;
        }
    }
    return null;
}

async function validateLogin(database, location, name, pincode, result) {
    let user = await getUser(database, {
        location: location,
        name: name
    });
    result.token = null;

    if (user.id) {
        if (pincode === user.pincode) {
            result.token = await tokenhandler.generateToken(database, user, pincode);
        }
    }

    if (result.token) {
        result.successful = true;
    }
    else {
        result.errorCode = 'INCORRECT';
        result.error = 'Invalid name or pincode';
    }
}
