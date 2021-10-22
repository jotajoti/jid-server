'use strict';

import jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import emailValidator from 'email-validator';
import { escape } from './functions.js';
import crypto from 'crypto';
import * as config from './config.js';

var cache = {
    privateKey: null,
    publicKey: null
};

var emptyUser = function () {
    var salt = crypto.randomBytes(32);
    return {
        id: uuid.v4(),
        name: null,
        username: null,
        password: null,
        salt: salt.toString('base64'),
        email: null,
        created: null
    }
}

var generateToken = async function (database, user, password) {
    if (!cache.privateKey) {
        cache.privateKey = await config.getValue(database, 'privateKey');
    }

    //Generate payload
    var payload = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
    }

    //Validate password
    var passwordValid = password != null;
    if (user.password && user.password.length >= 8 && user.salt && user.salt.length >= 40 && password) {
        var hash = crypto.pbkdf2Sync(password, user.salt, 100000, 128, 'sha512').toString('base64');

        passwordValid = user.password === hash;
    }

    if (passwordValid || user.email != null) {
        // Token signing options
        var signOptions = {
            expiresIn: "48h",
            algorithm: "RS256"
        };
        return jwt.sign(payload, cache.privateKey, signOptions);
    }
    else {
        return null;
    }
}

var getUser = async function (database, user) {
    var loadedUser = {};
    if (user.id || user.username) {
        var result = await database.get('select id, name, username, password, salt, email, created from user where id=? or username=?', [user.id, user.username]);
        if (result) {
            loadedUser.id = result.id;
            loadedUser.name = result.name;
            loadedUser.username = result.username;
            loadedUser.password = result.password;
            loadedUser.salt = result.salt;
            loadedUser.email = result.email;
            loadedUser.created = result.created;
        }
    }

    return loadedUser;
}

var saveUser = async function (database, user) {
    await database.run('replace into user (id, name, username, password, salt, email) values (?,?,?,?,?,?)',
        user.id, user.name, user.username, user.password, user.salt, user.email);
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
        user.name = req.body.name ? escape(req.body.name) : null;
        user.username = req.body.username ? escape(req.body.username) : null;
        user.password = (req.body.password && req.body.password.length >= 8) ? crypto.pbkdf2Sync(req.body.password, user.salt, 100000, 128, 'sha512').toString('base64') : null;
        user.email = req.body.email ? escape(req.body.email) : null;

        //Must supply with a unique username
        await validateUsername(result, user, database);

        //Must supply password or e-mail
        validatePassword(result, req, user);

        //Create user in database
        if (!result.error) {
            saveUser(database, user);
            result.id = user.id;
            result.created = true;
            result.token = await generateToken(database, user, req.body.password);
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
        if (!req.body.password && !user.email) {
            result.errorCode = "NO_PASSWORD";
            result.error = "You must supply with a password a valid e-mail address";
        }
        else if (req.body.password && req.body.password.length < 8) {
            result.errorCode = "INVALID_PASSWORD";
            result.error = "Invalid password (must be at least 8 chars)";
        }
        else if (user.email && (!emailValidator.validate(user.email) || user.email.length > 128)) {
            result.errorCode = "INVALID_EMAIL";
            result.error = "Invalid e-mail (max 128 chars)";
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
                username = escape(req.body.username);
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
        console.log("Exception: "+exception);
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

    if (user.id) {
        var hash = crypto.pbkdf2Sync("" + password, user.salt, 100000, 128, 'sha512').toString('base64');

        if (hash === user.password) {
            result.token = await generateToken(database, user, password);
            if (result.token) {
                result.successful = true;
            }
        }
        else {
            result.errorCode = "INCORRECT";
            result.error = "Invalid username or password";
        }
    }
    else {
        result.errorCode = "INCORRECT";
        result.error = "Invalid username or password";
    }
}

export async function verifyToken(req, res) {
    var database = await res.locals.db;

    var result = {
        valid: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        var token = await decodeToken(database, req);
        if (token.valid) {
            result.valid = true;
            result.token = token.decoded;
        }
        else {
            result.error = token.error;
            result.errorCode = token.errorCode;
        }
    }
    catch (exception) {
        if (exception.name === "JsonWebTokenError" || exception.name === "TokenExpiredError") {
            result.error = `${exception.name}: ${exception.message}`;
            if (!result.errorCode) {
                result.errorCode = "TOKEN_INVALID";
            }
        }
        else {
            result.error = exception;
            if (!result.errorCode) {
                result.errorCode = "EXCEPTION";
            }
        }
        if (config.isLoggingErrors()) {
            console.log("Users.verifyToken exception: " + exception);
        }
    }

    res.send(result);
}

export async function decodeToken(database, req) {
    var result = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    }
    try {
        if (!cache.publicKey) {
            cache.publicKey = await config.getValue(database, 'publicKey');
        }

        if (!req || !req.headers || !req.headers.authorization) {
            throw new Error("No authorization header found!");
        }
        else {
            const token = req.headers.authorization;

            // Token signing options
            var verifyOptions = {
                expiresIn: "48h",
                algorithm: ["RS256"]
            };

            if (jwt.verify(token, cache.publicKey, verifyOptions)) {
                const decoded = jwt.decode(token, { complete: true });
                result.valid = true;
                result.decoded = decoded.payload;
            }
        }
    }
    catch (exception) {
        if (config.isLoggingErrors()) {
            console.log("Users.decodeToken exception: " + exception);
        }

        result.error = exception.message;
        result.errorCode = "EXCEPTION";
    }

    return result;
}

export async function clearCache() {
    cache = {};
}
