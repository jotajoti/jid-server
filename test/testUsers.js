'use strict';

import assert from 'assert';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';

const INVALIED_USERNAME_OR_PASSWORD = 'Invalid username or password';
const TOKEN_SHOULD_BE_NULL = 'Token should be null';
const JOAN_CLARKE = 'Joan Clarke';
const ADA_LOVELACE = 'Ada Lovelace';
const ALOVELACE_AT_MATH_DOT_GOV = 'alovelace@math.gov';

describe('User', async function () {
    var database = null;
    var regExpForId = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/;
    before(async function () {
        this.timeout(10000);

        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
    });
    describe('#createUser', async function () {

        it('Should create a new user', async function () {
            await testCreateUser(JOAN_CLARKE, 'jclarke', 'enigmamachine', null);
        });
        it('Should create user with mail', async function () {
            await testCreateUser(ADA_LOVELACE, 'alovelace', 'mathiscool', ALOVELACE_AT_MATH_DOT_GOV);
        });
        it('Should create user mail and no password', async function () {
            await testCreateUser('Grace Hopper', 'ghopper', null, 'ghopper@navalreserve.gov');
        });
        it('Should fail if no username is specified', async function () {
            await testCreateUserFailure(JOAN_CLARKE, null, null, null, "NO_USERNAME", "You must supply a username of 1-128 chars");
        });
        it('Should fail if username is taken', async function () {
            await testCreateUserFailure(JOAN_CLARKE, 'jclarke', null, null, "DUPLICATE_USERNAME", "Username is taken");
        });
        it('Should fail if password is too short', async function () {
            await testCreateUserFailure(JOAN_CLARKE, 'clarke', 'enigma', null, "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)");
        });
        it('Should fail if e-mail is invalid', async function () {
            await testCreateUserFailure(JOAN_CLARKE, 'clarke', null, 'jclark@enigma', "INVALID_EMAIL", "Invalid e-mail (max 128 chars)");
        });
        it('Should fail if no e-mail and no password', async function () {
            await testCreateUserFailure('Annie Easley', 'aeasley', null, null, "NO_PASSWORD", "You must supply with a password a valid e-mail address");
        });
        it('Should fail if no request body', async function () {
            await testCreateUserFailure(null, null, null, null, "NO_USERNAME", "You must supply a username of 1-128 chars");
        });
        it('Should fail if no name is provided', async function () {
            await testCreateUserFailure(null, 'clarke', 'enigmamachine', null, "NO_NAME", "You must supply a name of 1-128 chars");
        });
    });

    async function testCreateUser(name, username, password, email) {
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
        if (email !== null) {
            req.body.email = email;
        }

        const res = {
            locals: { db: database },
            send: function (args) { response = args; }
        };

        await users.createUser(req, res);

        await assertCreateUserResponse(req, response, null, null, true);
    }

    async function testCreateUserFailure(name, username, password, email, errorCode, error) {
        var response;
        const req = {
            body: {
                'name': name
            }
        };
        if (username !== null) {
            req.body.username = username;
        }
        if (password !== null) {
            req.body.password = password;
        }
        if (email !== null) {
            req.body.email = email;
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
            assert.match(response.id, regExpForId, `Invalid user id: ${response.id}`);
        }
        else {
            assert.equal(response.id, null, `Reponse id should be null: ${response.id}`);
        }

        if (created) {
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, `Token id does not match: ${token.id}`);
            assert.equal(token.username, req.body.username, `Username incorrect in token: ${token.username}`);
            assert.equal(token.name, req.body.name, `Name incorrect in token: ${token.name}`);
            assert.equal(token.email, req.body.email, `Invalid E-mail: ${token.email}`);
        }
        else {
            assert.equal(response.token, null, `${TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        }
    }
})
