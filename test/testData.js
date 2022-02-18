'use strict';

import * as config from '../app/config.js';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';
import * as users from '../app/user.js';

import * as admins from './testAdmin.js';
import * as locations from './testLocation.js';

export var ZAPHOD = {
    name: 'Zaphod Beeblebrox',
    email: 'zaphod@president.universe',
    password: 'Pan-Galactic Gargle Blaster',
    phone: '+44 1978 1980'
};

export var ADA = {
    name: 'Ada Lovelace',
    email: 'alovelace@math.gov',
    password: 'mathmachine'
}

export var JOAN = {
    name: 'Joan Clarke',
    email: 'jclarke@enigma.org',
    password: 'enigmamachine'
}

export var LOCATION_2021 = {
    year: 2021,
    jid: '5gb47f',
    name: 'Guldford Jamboree 2021'
};

export var LOCATION_2022 = {
    year: 2022,
    jid: '5gb52d',
    name: 'Guldford Jamboree 2022'
};

export var ID_REG_EXP = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/;

export var ERROR_MESSAGES = {
    INVALID_NAME_OR_PASSWORD: 'Invalid name or password',
    INVALID_EMAIL_OR_PASSWORD: 'Invalid e-mail or password',
    MISSING_EMAIL: 'You must supply an e-mail',
    TOKEN_SHOULD_BE_NULL: 'Token should be null',
}

export async function setupTestDatabase(test) {
    test.timeout(10000);
    config.setLogLevel("NONE");

    tokenhandler.clearCache();
    var database = await jidDatabase.createDatabase();
    await config.checkConfig({
        database: database
    });
    config.setLogLevel("INFO");

    ZAPHOD.token = await admins.createTestAdmin(database, ZAPHOD.name, ZAPHOD.email, ZAPHOD.password, ZAPHOD.phone);
    var decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: `Bearer ${ZAPHOD.token}` } });
    ZAPHOD.decodedToken = decoding.decoded;

    await createTestLocations(database, ZAPHOD.token);
    await createTestUsers(database);

    return database;
}

async function createTestLocations(database, admin) {
    LOCATION_2021.id = (await locations.create(database, LOCATION_2021.year, LOCATION_2021.jid, LOCATION_2021.name, admin)).id;
    LOCATION_2022.id = (await locations.create(database, LOCATION_2022.year, LOCATION_2022.jid, LOCATION_2022.name, admin)).id;
}

async function createTestUsers(database) {
    await users.createUser({
        body: {
            name: JOAN.name,
            password: JOAN.password
        },
        params: {
            location: LOCATION_2021.id
        }
    }, {
        locals: { db: database },
        send: function (result) { 
            JOAN.token = result.token;
        }
    });
    await users.createUser({
        body: {
            name: ADA.name,
            password: ADA.password
        },
        params: {
            location: LOCATION_2021.id
        }
    }, {
        locals: { db: database },
        send: function (result) { 
            ADA.token = result.token;
        }
    });
}
