'use strict';

import * as uuid from 'uuid';
import validator from 'validator';
import * as config from './config.js';
import { escapeOrNull } from './functions.js';
import * as tokenhandler from './tokenhandler.js';

export async function createAdmin(req, res) {
    const database = await res.locals.db;
    const result = {
        id: null,
        created: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        const admin = emptyAdmin();

        if (!req.body) {
            req.body = {}
        }

        const passwordHash = tokenhandler.hashPassword(req.body.password);
        admin.name = escapeOrNull(req.body.name);
        admin.email = escapeOrNull(req.body.email);
        admin.password = (req.body.password && req.body.password.length >= 8) ? passwordHash.hashValue : null;
        admin.salt = passwordHash.salt;
        admin.phone = escapeOrNull(req.body.phone);

        //Must supply with a unique email
        await validateEmail(result, admin, database);

        //Must supply password
        validatePassword(result, req, admin);

        //Create admin in database
        if (!result.error) {
            saveAdmin(database, admin);

            result.id = admin.id;
            result.created = true;
            result.token = await tokenhandler.generateToken(database, admin, req.body.password);
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
            console.log(`Admin.createAdmin exception: ${exception}`);
        }
    }

    res.send(result);
}

export async function login(req, res) {
    const database = await res.locals.db;
    const result = {
        successful: false,
        token: null,
        errorCode: null,
        error: null
    }

    try {
        //Must supply an e-mail
        if (!result.error) {
            let email = "";
            let password = "";

            if (req && req.body) {
                email = escapeOrNull(req.body.email);
                password = req.body.password;
            }

            if (!email) {
                result.errorCode = "MISSING_EMAIL";
                result.error = "You must supply an e-mail";
            }
            else {
                await validateLogin(database, email, password, result);
            }
        }
    }
    catch (exception) {
        console.log('Exception: '+exception);
        if (!result.error) {
            result.error = exception;
        }
        if (!result.errorCode) {
            result.errorCode = "UNKOWN";
        }
        if (config.isLoggingErrors()) {
            console.log(`Admins.login exception: ${exception}`);
        }
    }

    res.send(result);
}

function emptyAdmin() {
    return {
        id: uuid.v4(),
        type: 'admin',
        email: null,
        password: null,
        salt: null,
        name: null,
        phone: null,
        created: null
    }
}

async function validateEmail(result, admin, database) {
    if (!result.error) {
        if (!admin.email || validator.isEmpty(admin.email) || admin.email.length > 256 || !validator.isEmail(admin.email)) {
            result.errorCode = "NO_EMAIL";
            result.error = "You must supply a valid e-mail of 1-256 chars";
        }
        else {
            const dbAdmin = await getAdmin(database, admin);
            if (dbAdmin.id) {
                result.errorCode = "DUPLICATE_EMAIL";
                result.error = "E-mail is already in use";
            }
        }
    }
}

function validatePassword(result, req, admin) {
    if (!result.error) {
        if (!req.body.password || req.body.password.length < 8) {
            result.errorCode = "INVALID_PASSWORD";
            result.error = "You must supply with a password of at least 8 characters";
        }
    }
}

async function getAdmin(database, admin) {
    const loadedAdmin = {};
    if (admin.email) {
        const result = await database.get('select id, email, password, salt, name, phone, created from admin where email=?', [admin.email]);
        if (result) {
            loadedAdmin.id = result.id;
            loadedAdmin.type = 'admin';
            loadedAdmin.email = result.email;
            loadedAdmin.password = result.password;
            loadedAdmin.salt = result.salt;
            loadedAdmin.name = result.name;
            loadedAdmin.phone = result.phone;
            loadedAdmin.created = result.created;
        }
    }

    return loadedAdmin;
}

async function saveAdmin(database, admin) {
    await database.run('insert into admin (id, email, password, salt, name, phone) values (?,?,?,?,?,?)',
        admin.id, admin.email, admin.password, admin.salt, admin.name, admin.phone);
}

async function validateLogin(database, email, password, result) {
    const admin = await getAdmin(database, { email: email });
    result.token = null;

    if (admin.id) {
        const passwordHash = tokenhandler.hashPassword(password, admin.salt);

        if (passwordHash.hashValue === admin.password) {
            result.token = await tokenhandler.generateToken(database, admin, password);
        }
    }

    if (result.token) {
        result.successful = true;
    }
    else {
        result.errorCode = "INCORRECT";
        result.error = "Invalid e-mail or password";
    }
}
