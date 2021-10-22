'use strict';

import assert from 'assert';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';

const INVALIED_USERNAME_OR_PASSWORD = 'Invalid username or password';
const TOKEN_SHOULD_BE_NULL = 'Token should be null';
const JOAN_CLARKE = 'Joan Clarke';
const ADA_LOVELACE = 'Ada Lovelace';
const ALOVELACE_AT_MATH_DOT_GOV = 'alovelace@math.gov';

describe('Login', async function () {
    var database = null;
    var regExpForId = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/;
    before(async function () {
        this.timeout(10000);

        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });

        await createTestUsers(database);
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

            await assertLoginResponse(response, null, null, true, 'jclarke', JOAN_CLARKE, null);
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

            await assertLoginResponse(response, null, null, true, 'alovelace', ADA_LOVELACE, ALOVELACE_AT_MATH_DOT_GOV);
        });
        it('Should fail login with incorrect password', async function () {
            await testFailedLogin('jclarke', 'incorrect', 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD);
        });
        it('Should fail login with incorrect username', async function () {
            await testFailedLogin('joanclarke', 'enigmamachine', 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD);
        });
        it('Should fail login with missing username', async function () {
            await testFailedLogin(null, 'enigmamachine', 'USERNAME', 'You must supply a username');
        });
        it('Should fail login with missing password', async function () {
            await testFailedLogin('jclarke', null, 'INCORRECT', INVALIED_USERNAME_OR_PASSWORD);
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

            await assertLoginResponse(response, 'USERNAME', 'You must supply a username', false);
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
            assert.equal(verifyResponse.token.name, ADA_LOVELACE, `Name incorrect in token: ${verifyResponse.token.name}`);
            assert.equal(verifyResponse.token.email, ALOVELACE_AT_MATH_DOT_GOV, `E-mail incorrect in token: ${verifyResponse.token.name}`);
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

    async function assertLoginResponse(response, errorCode, error, successful, username, name, email) {
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

    async function testFailedLogin(username, password, errorCode, error) {
        var response;
        const req = {
            body: {
            }
        };

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

        await users.login(req, res);

        await assertLoginResponse(response, errorCode, error, false);
    }
})
async function createTestUsers(database) {
    await users.createUser({
        body: {
            'name': JOAN_CLARKE,
            'username': 'jclarke',
            'password': 'enigmamachine'
        }
    }, {
        locals: { db: database },
        send: function (args) { /* empty method */ }
    });
    await users.createUser({
        body: {
            'name': ADA_LOVELACE,
            'username': 'alovelace',
            'password': 'mathiscool',
            'email': ALOVELACE_AT_MATH_DOT_GOV
        }
    }, {
        locals: { db: database },
        send: function (args) { /* empty method */ }
    });
}

