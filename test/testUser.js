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
            await testCreateUser(testData.LOCATION_2021.id, {name: 'Slartibartfast the Magrathean'});
        });
        it('Should allow same user on a different location', async function () {
            await testCreateUser(testData.LOCATION_2022.id, {name: testData.FORD.name});
        });
        it('Should fail if no location is specified', async function () {
            await testCreateUserFailure(null, {name: testData.FORD.name}, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if location does not exist', async function () {
            await testCreateUserFailure(uuid.v4(), {name: testData.FORD.name}, "INVALID_LOCATION", "Invalid location id");
        });
        it('Should fail if name is taken', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, {name: testData.FORD.name}, "DUPLICATE_NAME", "Name is already in use");
        });
        it('Should fail if no request body', async function () {
            await testCreateUserFailure(null, {name: null}, "NO_LOCATION", "You must supply a location id");
        });
        it('Should fail if no name is provided', async function () {
            await testCreateUserFailure(testData.LOCATION_2021.id, {name: null}, "NO_NAME", "You must supply a name of 1-128 chars");
        });
        it('Should find user by name', async function () {
            const response = await findUser(database, testData.LOCATION_2021.id, testData.ARTHUR_2021.name);
            await assertUserFound(response, null, null, true);
        });
        it('Should not find user by name', async function () {
            const response = await findUser(database, testData.LOCATION_2021.id, 'Trillian');
            await assertUserFound(response, null, null, false);
        });
    });

    async function testCreateUser(location, user) {
        const response = await createUser(database, location, user);
        await assertCreateUserResponse(response, null, null, true, user.name);
    }

    async function testCreateUserFailure(location, user, errorCode, error) {
        const response = await createUser(database, location, user);
        await assertCreateUserResponse(response, errorCode, error, false, user.name);
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

    async function assertUserFound(response, errorCode, error, found) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorect error message: ${response.error}`);
        assert.equal(response.found, found, `Reponse found should be ${found}: ${response.id}`);
    }
})

export async function createUser(database, location, user) {
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
    if (user !== null && user.name !== null) {
        req.body.name = user.name;
    }

    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await users.createUser(req, res);
    user.pincode = response.pincode;

    return response;
}

export async function findUser(database, location, name) {
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
        req.params.name = name;
    }

    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await users.userExists(req, res);

    return response;
}