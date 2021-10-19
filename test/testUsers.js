/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-undef */
'use strict';

import assert from 'assert';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';

const INVALIED_USERNAME_OR_PASSWORD = 'Invalid username or password';
const TOKEN_SHOULD_BE_NULL = 'Token should be null';

describe('Login', async function () {
    var database = null;
    var regExpForId = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/;
    before(async function () {
        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
    });
    describe('#createUser', async function () {
        it('Should create a new user', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke',
                    'username': 'jclarke',
                    'password': 'enigmamachine'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, null, null, true, regExpForId);
        });
        it('Should create user with mail', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Ada Lovelace',
                    'username': 'alovelace',
                    'password': 'mathiscool',
                    'email': 'alovelace@math.gov'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, null, null, true, regExpForId);
        });
        it('Should create user mail and no password', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Grace Hopper',
                    'username': 'ghopper',
                    'email': 'ghopper@navalreserve.gov'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, null, null, true, regExpForId);
        });
        it('Should fail if no username is specified', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "NO_USERNAME", "You must supply a username of 1-128 chars", false, regExpForId);
        });
        it('Should fail if username is taken', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke',
                    'username': 'jclarke'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "DUPLICATE_USERNAME", "Username is taken", false, regExpForId);
        });
        it('Should fail if password is too short', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke',
                    'username': 'clarke',
                    'password': 'enigma' //NOSONAR
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "INVALID_PASSWORD", "Invalid password (must be at least 8 chars)", false, regExpForId);
        });
        it('Should fail if e-mail is invalid', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke',
                    'username': 'clarke',
                    'email': 'jclark@enigma'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "INVALID_EMAIL", "Invalid e-mail (max 128 chars)", false, regExpForId);
        });
        it('Should fail if no e-mail and no password', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Annie Easley',
                    'username': 'aeasley'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "NO_PASSWORD", "You must supply with a password a valid e-mail address", false, regExpForId);
        });
        it('Should fail if no request body', async function () {
            var response;
            const req = {
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            await assertCreateUserResponse(database, req, response, "NO_USERNAME", "You must supply a username of 1-128 chars", false, regExpForId);
        });
    });
    describe('#login', async function () {
        it('Should get valid login token', async function () {
            var response;
            const req = {
                body: {
                    'username': 'jclarke',
                    'password': 'enigmamachine' //NOSONAR
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, null, null, true, regExpForId, 'jclarke', 'Joan Clarke', null);
        });
        it('Should get valid login token with e-mail and password', async function () {
            var response;
            const req = {
                body: {
                    'username': 'alovelace',
                    'password': 'mathiscool'
                }
            };

            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, null, null, true, regExpForId, 'alovelace', 'Ada Lovelace', 'alovelace@math.gov');
        });
        it('Should fail login with incorrect password', async function () {
            var response;
            const req = {
                body: {
                    'username': 'jclarke',
                    'password': 'incorrect'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD, false, regExpForId);
        });
        it('Should fail login with incorrect username', async function () {
            var response;
            const req = {
                body: {
                    'username': 'joanclarke',
                    'password': 'enigmamachine'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD, false, regExpForId);
        });
        it('Should fail login with missing username', async function () {
            var response;
            const req = {
                body: {
                    'password': 'enigmamachine'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, 'USERNAME', 'You must supply a username', false, regExpForId);
        });
        it('Should fail login with missing password', async function () {
            var response;
            const req = {
                body: {
                    'username': 'jclarke'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD, false, regExpForId);
        });
        it('Should fail login with missing request body', async function () {
            var response;
            const req = {
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            await assertLoginResponse(database, response, 'USERNAME', 'You must supply a username', false, regExpForId);
        });
    });
    describe('#verify', async function () {
        it('Should verify login token', async function () {
            var response;
            const req = {
                body: {
                    'username': 'alovelace',
                    'password': 'mathiscool'
                }
            };

            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res)
            const token = response.token;

            var verifyResponse;
            const verifyReq = {
                headers: {
                    authorization: token
                }
            };
            const verifyRes = {
                locals: { db: database },
                send: function (args) { verifyResponse = args; }
            };
            await users.verifyToken(verifyReq, verifyRes);

            assert.equal(verifyResponse.valid, true, `Valid should be true: ${verifyResponse.valid}`);
            assert.equal(verifyResponse.error, null, `Error message should be null: ${verifyResponse.error}`);
            assert.match(verifyResponse.token.id, regExpForId, `Invalid token id: ${verifyResponse.token.id}`);
            assert.equal(verifyResponse.token.username, req.body.username, `Username incorrect in token: ${verifyResponse.token.username}`);
            assert.equal(verifyResponse.token.name, 'Ada Lovelace', `Name incorrect in token: ${verifyResponse.token.name}`);
            assert.equal(verifyResponse.token.email, 'alovelace@math.gov', `E-mail incorrect in token: ${verifyResponse.token.name}`);
            const issuedAt = moment(parseInt(verifyResponse.token.iat) * 1000);
            const expires = moment(parseInt(verifyResponse.token.exp) * 1000);
            assert(issuedAt.isBetween(moment().subtract(1, 'seconds'), moment()), `Invalid issued time: ${issuedAt.format()}`);
            assert(expires.isBetween(moment().add(48 * 60 * 60 - 2, 'seconds'), moment().add(48, 'hours')), `Invalid expiration time: ${expires.format()}`);
        });
        it('Should fail with invalid signature', async function () {
            var verifyResponse;
            const verifyReq = {
                headers: {
                    authorization: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBlMmJhOTBiLTkyMWMtNDA5MS05MjgwLTZjMDQxMzI1NzhiYSIsInVzZXJuYW1lIjoiYWxvdmVsYWNlIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImVtYWlsIjoiYWxvdmVsYWNlQG1hdGguZ292IiwiaWF0IjoxNTg4NTA1MjcyLCJleHAiOjE1ODg2NzgwNzJ9.FLz7pmQ-UmNysSzQeyIQn0XbNYGtN2Te4dcL6dWjlN-UO71yRKBWMhq11IfQJQbeEzGpW3S_lnniD_WkUbaHrGWwAMBWcxd0IjVHGmZm-KMhuQ4OnsSZfbisI2I5wsXcsfbzmY3kv7BmH0ZmHFaePXagjFeVXP9FjI22149_t2LvkfeycfpMVGnB2q74NrDiVGa5HNn_cgcyMZjmf6UXmi4XPp1CCYngjBLh2yN36l9oBKtVFYTNGmUOhlbNneAa2L9KcfkJR5fDV_-H__IypGa4hKROb0PCwOcpwC6ZcYK6oNopN5pG0b93dGu2liZ-FQfIje0s7XS1IaoMcrxbSVME163mlSJ-LebiCdQ68hAdXSIB0hvS40jaA4h0jIznzj8I_VQsvo9dJqhtTghKXkFTrY0yJ2BRfSU5MTDCOzSm1FfT7JazcY-GnLzNoImS0yn3XqhTlnnvpbUCSeMenFPf60S95hB63Yny3LwU97LaIKSVmDgi5CCZ580qjUk0Jzi4St8lLSyzzHVPPzPUmtxS5F1LS8F-lgMPF6et58UFtvScIO68jca54BjHHdLLjS4aXaAEmDmYHvO_7vl76whBnlHhTLxV8HSQ1JToKhuYgZIln_wVJ1YmamK3WNkVhbU5tRRYoWYOfxXPDwa65HJzOCkX0dnY-Wc9K07e0B0"
                }
            };
            const verifyRes = {
                locals: { db: database },
                send: function (args) { verifyResponse = args; }
            };
            await users.verifyToken(verifyReq, verifyRes);

            assert.equal(verifyResponse.valid, false, `Valid should be false: ${verifyResponse.valid}`);
            assert.equal(verifyResponse.error, "invalid signature", `Invalid Error message: ${verifyResponse.error}`);
            assert.equal(verifyResponse.token, null, `${TOKEN_SHOULD_BE_NULL}: ${verifyResponse.token}`);
        });
        it('Should fail with expired token', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            var payload = {
                id: "364f3f6e-fdbf-4daa-963c-e6601ec37984",
                username: "jclarke",
                name: "Joan Clarke"
            }
            var signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const token = await jwt.sign(payload, privateKey, signOptions);

            var response;
            const req = {
                headers: {
                    authorization: token
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };
            await users.verifyToken(req, res);

            assert.equal(response.valid, false, `Valid should be false: ${response.valid}`);
            assert.equal(response.error, "jwt expired", `Invalid Error message: ${response.error}`);
            assert.equal(response.token, null, `${TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        });
    });
})

async function assertLoginResponse(database, response, errorCode, error, successful, regExpForId, username, name, email) {
    assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
    assert.equal(response.error, error, `Incorrect error message: ${response.error}`);
    assert.equal(response.successful, successful, `Inccorect successful value ${response.successful}`);
    if (successful) {
        const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
        const token = decoding.decoded;
        assert.match(token.id, regExpForId, `Invalid token id: ${token.id}`);
        assert.equal(token.username, username, `Username incorrect in token: ${token.username}`);
        assert.equal(token.name, name, `Name incorrect in token: ${token.name}`);
        assert.equal(token.email, email, `E-mail incorrect in token: ${token.email}`);
    }
    else {
        assert.equal(response.token, null, `Response token should be null: ${response.successful}`);
    }
}

async function assertCreateUserResponse(database, req, response, errorCode, error, created, regExpForId) {
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
