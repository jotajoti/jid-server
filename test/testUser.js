'use strict';

import assert from 'assert';
import * as uuid from 'uuid';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';
import * as config from '../app/config.js';
import * as users from '../app/user.js';
import * as admins from './testAdmin.js';
import * as locations from './testLocation.js';
import * as CONST from './testConstant.js';

describe('User', async function () {
    var database = null;
    var decodedAdminToken = null;
    before(async function () {
        this.timeout(10000);
        config.setLogLevel("NONE");

        tokenhandler.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
        config.setLogLevel("INFO");

        var admin = await admins.createTestAdmins(database);
        var decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: "Bearer " + admin } });
        decodedAdminToken = decoding.decoded;
        await locations.createTestLocations(database, admin);
    });
    describe('#createUser', async function () {
        it('Should create a new user', async function () {
            await testCreateUser(CONST.LOCATION_2021.id, CONST.JOAN_CLARKE, 'enigmamachine');
        });
        it('Should allow same user on a different location', async function () {
            await testCreateUser(CONST.LOCATION_2022.id, CONST.JOAN_CLARKE, 'enigmamachine');
        });
        it('Should fail if no location is specified', async function () {
            await testCreateUserFailure(null, CONST.JOAN_CLARKE, null, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if location does not exist', async function () {
            await testCreateUserFailure(uuid.v4(), CONST.JOAN_CLARKE, null, "INVALID_LOCATION", "Invalid location id");
        });
        it('Should fail if name is taken', async function () {
            await testCreateUserFailure(CONST.LOCATION_2021.id, CONST.JOAN_CLARKE, null, "DUPLICATE_NAME", "Name is already in use");
        });
        it('Should fail if password is too short', async function () {
            await testCreateUserFailure(CONST.LOCATION_2021.id, 'Annie Easley', 'naca', "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no password', async function () {
            await testCreateUserFailure(CONST.LOCATION_2021.id, 'Annie Easley', null, "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no request body', async function () {
            await testCreateUserFailure(null, null, null, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if no name is provided', async function () {
            await testCreateUserFailure(CONST.LOCATION_2021.id, null, 'enigmamachine', "NO_NAME", "You must supply a name of 1-128 chars");
        });
    });

    async function testCreateUser(location, name, password) {
        var response;
        const req = {
            body: {
                location: location,
                name: name
            }
        };
        if (password !== null) {
            req.body.password = password;
        }

        const res = {
            locals: { db: database },
            send: function (args) { response = args; }
        };

        await users.createUser(req, res);

        await assertCreateUserResponse(req, response, null, null, true);
    }

    async function testCreateUserFailure(location, name, password, errorCode, error) {
        var response;
        const req = {
            body: {
            }
        };
        if (location !== null) {
            req.body.location = location;
        }
        if (name !== null) {
            req.body.name = name;
        }
        if (password !== null) {
            req.body.password = password;
        }

        const res = {
            locals: { db: database },
            send: function (args) { response = args; }
        };

        await users.createUser(req, res);

        await assertCreateUserResponse(req, response, errorCode, error, false);
    }

    async function assertCreateUserResponse(req, response, errorCode, error, created) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorect error message: ${response.error}`);
        assert.equal(response.created, created, `Incorrect Created value: ${response.created}`);
        if (created) {
            assert.match(response.id, CONST.ID_REG_EXP, `Invalid user id: ${response.id}`);
        }
        else {
            assert.equal(response.id, null, `Reponse id should be null: ${response.id}`);
        }

        if (created) {
            const decoding = await tokenhandler.decodeUserToken(database, { headers: { authorization: "Bearer " + response.token } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, `Token id does not match: ${token.id}`);
            assert.equal(token.type, 'user', `Incorrect token type: ${token.type}`);
            assert.equal(token.username, req.body.username, `Username incorrect in token: ${token.username}`);
            assert.equal(token.name, req.body.name, `Name incorrect in token: ${token.name}`);
        }
        else {
            assert.equal(response.token, null, `${CONST.TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        }
    }
})
