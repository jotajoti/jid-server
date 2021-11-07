'use strict';

import assert from 'assert';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';
import * as config from '../app/config.js';
import * as users from '../app/user.js';
import * as CONST from './testConstant.js';

describe('User', async function () {
    var database = null;
    before(async function () {
        this.timeout(10000);
        config.setLogLevel("NONE");

        tokenhandler.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
        config.setLogLevel("INFO");
    });
    describe('#createUser', async function () {
        it('Should create a new user', async function () {
            await testCreateUser(CONST.JOAN_CLARKE, 'jclarke', 'enigmamachine');
        });
        it('Should fail if no username is specified', async function () {
            await testCreateUserFailure(CONST.JOAN_CLARKE, null, null, "NO_USERNAME", "You must supply a username of 1-128 chars");
        });
        it('Should fail if username is taken', async function () {
            await testCreateUserFailure(CONST.JOAN_CLARKE, 'jclarke', null, "DUPLICATE_USERNAME", "Username is taken");
        });
        it('Should fail if password is too short', async function () {
            await testCreateUserFailure(CONST.JOAN_CLARKE, 'clarke', 'enigma', "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no password', async function () {
            await testCreateUserFailure('Annie Easley', 'aeasley', null, "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if no request body', async function () {
            await testCreateUserFailure(null, null, null, "NO_USERNAME", "You must supply a username of 1-128 chars");
        });
        it('Should fail if no name is provided', async function () {
            await testCreateUserFailure(null, 'clarke', 'enigmamachine', "NO_NAME", "You must supply a name of 1-128 chars");
        });
    });

    async function testCreateUser(name, username, password) {
        var response;
        const req = {
            body: {
                'name': name,
                'username': username
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

    async function testCreateUserFailure(name, username, password, errorCode, error) {
        var response;
        const req = {
            body: {

            }
        };
        if (name !== null) {
            req.body.name = name;
        }
        if (username !== null) {
            req.body.username = username;
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
            const decoding = await tokenhandler.decodeUserToken(database, { headers: { authorization: response.token } });
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
