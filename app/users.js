'use strict';

import * as uuid from 'uuid';
import * as config from './config.js';
import { escapeOrNull } from './functions.js';
import * as tokenhandler from './tokenhandler.js';

function emptyUser() {
    return {
        id: uuid.v4(),
        type: 'user',
        name: null,
        username: null,
        password: null,
        salt: null,
        created: null
    }
}

async function getUser(database, user) {
    var loadedUser = {};
    if (user.username) {
        var result = await database.get('select id, name, username, password, salt, created from user where username=?', [user.username]);
        if (result) {
            loadedUser.id = result.id;
            loadedUser.type = 'user';
            loadedUser.name = result.name;
            loadedUser.username = result.username;
            loadedUser.password = result.password;
            loadedUser.salt = result.salt;
            loadedUser.created = result.created;
        }
    }

    return loadedUser;
}

async function saveUser(database, user) {
    await database.run('replace into user (id, name, username, password, salt) values (?,?,?,?,?)',
        user.id, user.name, user.username, user.password, user.salt);
}

export async function createUser(req, res) {
    var database = await res.locals.db;
    var result = {
        id: null,
        created: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        var user = emptyUser();

        if (!req.body) {
            req.body = {}
        }

        var passwordHash = tokenhandler.hashPassword(req.body.password);
        user.name = req.body.name ? escapeOrNull(req.body.name) : null;
        user.username = req.body.username ? escapeOrNull(req.body.username) : null;
        user.password = (req.body.password && req.body.password.length >= 8) ? passwordHash.hashValue : null;
        user.salt = passwordHash.salt;

        //Must supply with a unique username
        await validateUsername(result, user, database);

        //Must supply password
        validatePassword(result, req, user);

        //Create user in database
        if (!result.error) {
            saveUser(database, user);

            result.id = user.id;
            result.created = true;
            result.token = await tokenhandler.generateToken(database, user, req.body.password);
        }
    }
    catch (error) {
        if (!result.error) {
            result.error = error;
        }
        if (!result.errorCode) {
            result.errorCode = "UNKOWN";
        }
        if (config.isLoggingErrors()) {
            console.log(`Users.createUser exception: ${error}`);
        }
    }

    res.send(result);
}

function validatePassword(result, req, user) {
    if (!result.error) {
        if (!req.body.password || req.body.password.length < 8) {
            result.errorCode = "INVALID_PASSWORD";
            result.error = "Invalid password (must be at least 8 chars)";
        }
    }
}

async function validateUsername(result, user, database) {
    if (!result.error) {
        if (!user.username || user.username.length < 1 || user.username.length > 128) {
            result.errorCode = "NO_USERNAME";
            result.error = "You must supply a username of 1-128 chars";
        }
        else if (!user.name || user.name.length < 1 || user.name.length > 128) {
            result.errorCode = "NO_NAME";
            result.error = "You must supply a name of 1-128 chars";
        }
        else {
            var dbUser = await getUser(database, user);
            if (dbUser.id) {
                result.errorCode = "DUPLICATE_USERNAME";
                result.error = "Username is taken";
            }
        }
    }
}

export async function login(req, res) {
    var database = await res.locals.db;
    var result = {
        successful: false,
        token: null,
        errorCode: null,
        error: null
    }

    try {
        //Must supply a username
        if (!result.error) {
            var username = "";
            var password = "";
            if (req && req.body) {
                username = escapeOrNull(req.body.username);
                password = req.body.password;
            }

            if (!username) {
                result.errorCode = "USERNAME";
                result.error = "You must supply a username";
            }
            else {
                await validateLogin(database, username, password, result);
            }
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
            console.log(`Users.login exception: ${exception}`);
        }
    }

    res.send(result);
}

async function validateLogin(database, username, password, result) {
    var user = await getUser(database, { username: username });
    result.token = null;

    if (user.id) {
        var passwordHash = tokenhandler.hashPassword(password, user.salt);

        if (passwordHash.hashValue === user.password) {
            result.token = await tokenhandler.generateToken(database, user, password);
        }
    }

    if (result.token) {
        result.successful = true;
    }
    else {
        result.errorCode = "INCORRECT";
        result.error = "Invalid username or password";
    }
}
