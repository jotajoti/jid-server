'use strict';

import * as config from '../app/config.js';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';

import * as admins from './testAdmin.js';
import * as users from './testUser.js';
import * as locations from './testLocation.js';

export const ZAPHOD = {
    name: 'Zaphod Beeblebrox',
    email: 'zaphod@president.universe',
    password: 'Pan-Galactic Gargle Blaster',
    phone: '+44 1978 1980'
};

export const ARTHUR_2021 = {
    name: 'Arthur Dent',
    email: 'arthur@dent.thgttg',
    pincode: null
}

export const ARTHUR_2022 = {
    name: 'Arthur Dent',
    email: 'arthur@dent.thgttg',
    pincode: null
}

export const FORD = {
    name: 'Ford Prefect',
    email: 'ford@prefect.betelgeuse',
    pincode: null
}

export const LOCATION_2021 = {
    year: 2021,
    jid: '5gb47f',
    name: 'Guildford Jamboree 2021'
};

export const LOCATION_2022 = {
    year: 2022,
    jid: '5gb52d',
    name: 'Guildford Jamboree 2022'
};

export const ID_REG_EXP = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/;

export const ERROR_MESSAGES = {
    INVALID_NAME_OR_PINCODE: 'Invalid name or pincode',
    INVALID_EMAIL_OR_PASSWORD: 'Invalid e-mail or password',
    MISSING_EMAIL: 'You must supply an e-mail',
    TOKEN_SHOULD_BE_NULL: 'Token should be null',
}

export async function setupTestDatabase(test) {
    try {
        test.timeout(30000);
        config.setLogLevel("NONE");

        tokenhandler.clearCache();
        const database = await jidDatabase.createDatabase({
            databaseFile: ':memory:',
            traceMigration: false
        });
        await config.checkConfig({
            database: database
        });
        config.setLogLevel("INFO");

        ZAPHOD.token = (await admins.createTestAdmin(database, ZAPHOD.name, ZAPHOD.email, ZAPHOD.password, ZAPHOD.phone)).token;
        const decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: `Bearer ${ZAPHOD.token}` } });
        ZAPHOD.decodedToken = decoding.decoded;

        await createTestLocations(database, ZAPHOD.token);
        await createTestUsers(database);

        return database;
    }
    catch (exception) {
        console.log(`Setup Test Database exception: ${exception}`);
    }
}

async function createTestLocations(database, admin) {
    LOCATION_2021.id = (await locations.create(database, LOCATION_2021.year, LOCATION_2021.jid, LOCATION_2021.name, admin)).id;
    LOCATION_2022.id = (await locations.create(database, LOCATION_2022.year, LOCATION_2022.jid, LOCATION_2022.name, admin)).id;
}

async function createTestUsers(database) {
    FORD.token = (await users.createUser(database, LOCATION_2021.id, FORD)).token;
    const decodingFord = await tokenhandler.decodeUserToken(database, { headers: { authorization: `Bearer ${FORD.token}` } });
    FORD.decodedToken = decodingFord.decoded;

    ARTHUR_2021.token = (await users.createUser(database, LOCATION_2021.id, ARTHUR_2021)).token;
    const decoding2021 = await tokenhandler.decodeUserToken(database, { headers: { authorization: `Bearer ${ARTHUR_2021.token}` } });
    ARTHUR_2021.decodedToken = decoding2021.decoded;

    ARTHUR_2022.token = (await users.createUser(database, LOCATION_2022.id, ARTHUR_2022)).token;
    const decoding2022 = await tokenhandler.decodeUserToken(database, { headers: { authorization: `Bearer ${ARTHUR_2022.token}` } });
    ARTHUR_2022.decodedToken = decoding2022.decoded;
}
