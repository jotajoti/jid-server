'use strict';

import assert from 'assert';
import * as uuid from 'uuid';
import * as tokenhandler from '../app/tokenhandler.js';
import * as users from '../app/user.js';
import * as testData from './testData.js';

describe('User', async function () {
    let database = null;
    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#createUser', async function () {
        it('Should create a new user', async function () {
            await testCreateUser(testData.LOCATION_2021.id, 'Slartibartfast the Magrathean', 'norway42');
        });
        it('Should allow same user on a different location', async function () {
            await testCreateUser(testData.LOCATION_2022.id, testData.FORD.name, testData.FORD.password);
        });
        it('Should fail if no location is specified', async function () {
            await testCreateUserFailure(null, testData.FORD.name, null, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if location does not exist', async function () {
            await testCreateUserFailure(uuid.v4(), testData.FORD.name, null, "INVALID_LOCATION", "Invalid location id");
        });
        it('Should fail if name is taken', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, testData.FORD.name, null, "DUPLICATE_NAME", "Name is already in use");
        });
        it('Should fail if password is too short', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, 'Marvin the Paranoid Android', '42', "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no password', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, 'Marvin the Paranoid Android', null, "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no request body', async function () {
            await testCreateUserFailure(null, null, null, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if no name is provided', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, null, testData.FORD.password, "NO_NAME", "You must supply a name of 1-128 chars");
        });
    });

    async function testCreateUser(location, name, password) {
        const response = await createUser(database, location, name, password);
        await assertCreateUserResponse(response, null, null, true, name);
    }

    async function testCreateUserFailure(location, name, password, errorCode, error) {
        const response = await createUser(database, location, name, password);
        await assertCreateUserResponse(response, errorCode, error, false, name);
    }

    async function assertCreateUserResponse(response, errorCode, error, created, name) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorect error message: ${response.error}`);
        assert.equal(response.created, created, `Incorrect Created value: ${response.created}`);
        if (created) {
            assert.match(response.id, testData.ID_REG_EXP, `Invalid user id: ${response.id}`);
        }
        else {
            assert.equal(response.id, null, `Reponse id should be null: ${response.id}`);
        }

        if (created) {
            const decoding = await tokenhandler.decodeUserToken(database, { headers: { authorization: `Bearer ${response.token}` } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, `Token id does not match: ${token.id}`);
            assert.equal(token.type, 'user', `Incorrect token type: ${token.type}`);
            assert.equal(token.username, null, `Username incorrect in token: ${token.username}`);
            assert.equal(token.name, name, `Name incorrect in token: ${token.name}`);
        }
        else {
            assert.equal(response.token, null, `${testData.ERROR_MESSAGES.TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        }
    }
})

export async function createUser(database, location, name, password) {
    let response;
    const req = {
        body: {
        },
        params: {                
        }
    };
    if (location !== null) {
        req.params.location = location;
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

    return response;
}