'use strict';

import * as uuid from 'uuid';
import * as config from './config.js';
import * as locations from './location.js';
import { escapeOrNull } from './functions.js';
import validator from 'validator';
import * as tokenhandler from './tokenhandler.js';

let USER_FIELDS = 'id, location, name, password, salt, created';

function emptyUser() {
    return {
        id: uuid.v4(),
        location: null,
        type: 'user',
        name: null,
        password: null,
        salt: null,
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
            loadedUser.password = result.password;
            loadedUser.salt = result.salt;
            loadedUser.created = result.created;
        }
    }

    return loadedUser;
}

async function saveUser(database, user) {
    await database.run('replace into user (id, location, name, password, salt) values (?,?,?,?,?)',
        user.id, user.location, user.name, user.password, user.salt);
}

export async function createUser(req, res) {
    let database = await res.locals.db;
    let result = {
        id: null,
        created: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        let user = emptyUser();

        if (!req.body) {
            req.body = {}
        }
        if (!req.params) {
            req.params = {}
        }

        let passwordHash = tokenhandler.hashPassword(req.body.password);
        user.location = escapeOrNull(req.params.location);
        user.name = escapeOrNull(req.body.name);
        user.password = (req.body.password && req.body.password.length >= 8) ? passwordHash.hashValue : null;
        user.salt = passwordHash.salt;

        //Must supply with a unique name
        await validateUser(result, user, database);

        //Must supply password
        validatePassword(result, req, user);

        //Create user in database
        if (!result.error) {
            await saveUser(database, user);

            result.id = user.id;
            result.created = true;
            result.token = await tokenhandler.generateToken(database, user, req.body.password);
        }
    }
    catch (exception) {
        console.log(`Exception: ${JSON.stringify(exception)}`);
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

function validatePassword(result, req, user) {
    if (!result.error) {
        if (!req.body.password || req.body.password.length < 8) {
            result.errorCode = 'INVALID_PASSWORD';
            result.error = 'Invalid password (must be at least 8 chars)';
        }
    }
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
            let password = getPassword(req);

            if (!location) {
                result.errorCode = 'MISSING_LOCATION';
                result.error = 'You must supply a location';
            }
            else if (!name) {
                result.errorCode = 'MISSING_NAME';
                result.error = 'You must supply a name';
            }
            else {
                await validateLogin(database, location, name, password, result);
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
        if (req.body) {
            return escapeOrNull(req.body.name);
        }
    }
    return null;
}

function getPassword(req) {
    if (req) {
        if (req.body) {
            return req.body.password;
        }
    }
    return null;
}

async function validateLogin(database, location, name, password, result) {
    let user = await getUser(database, {
        location: location,
        name: name
    });
    result.token = null;

    if (user.id) {
        let passwordHash = tokenhandler.hashPassword(password, user.salt);

        if (passwordHash.hashValue === user.password) {
            result.token = await tokenhandler.generateToken(database, user, password);
        }
    }

    if (result.token) {
        result.successful = true;
    }
    else {
        result.errorCode = 'INCORRECT';
        result.error = 'Invalid name or password';
    }
}
