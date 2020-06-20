'use strict';

import assert from 'assert';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';

describe('Login', async function () {
    var database = null;
    var regExpForId = /[a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9]/;
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

            assert.equal(response.errorCode, null, "ErrorCode should be null: " + response.errorCode);
            assert.equal(response.error, null, "Error message should be null: " + response.error);
            assert.equal(response.created, true, "Created should be true: " + response.created);
            assert.match(response.id, regExpForId, "Invalid user id: " + response.id);
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, "Token id does not match: " + token.id);
            assert.equal(token.username, req.body.username, "Username incorrect in token: " + token.username);
            assert.equal(token.name, req.body.name, "Name incorrect in token: " + token.name);
            assert.equal(token.email, null, "E-mail should be empty: " + token.email);
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

            assert.equal(response.errorCode, null, "ErrorCode should be null: " + response.errorCode);
            assert.equal(response.error, null, "Error message should be null: " + response.error);
            assert.equal(response.created, true, "Created should be true: " + response.created);
            assert.match(response.id, regExpForId, "Invalid user id: " + response.id);
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, "Token id does not match: " + token.id);
            assert.equal(token.username, req.body.username, "Username incorrect in token");
            assert.equal(token.name, req.body.name, "Name incorrect in token: " + token.name);
            assert.equal(token.email, req.body.email, "E-mail incorrect in token: " + token.email);
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

            assert.equal(response.errorCode, null, "ErrorCode should be null: " + response.errorCode);
            assert.equal(response.error, null, "Error message should be null: " + response.error);
            assert.equal(response.created, true, "Created should be true: " + response.created);
            assert.match(response.id, regExpForId, "Invalid user id: " + response.id);
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.equal(token.id, response.id, "Token id does not match: " + token.id);
            assert.equal(token.username, req.body.username, "Username incorrect in token: " + token.username);
            assert.equal(token.name, req.body.name, "Name incorrect in token: " + token.name);
            assert.equal(token.email, req.body.email, "E-mail incorrect in token: " + token.email);
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

            assert.equal(response.errorCode, "NO_USERNAME", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "You must supply a username of 1-128 chars", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
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

            assert.equal(response.errorCode, "DUPLICATE_USERNAME", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Username is taken", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
        });
        it('Should fail if password is too short', async function () {
            var response;
            const req = {
                body: {
                    'name': 'Joan Clarke',
                    'username': 'clarke',
                    'password': 'enigma'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.createUser(req, res);

            assert.equal(response.errorCode, "INVALID_PASSWORD", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Invalid password (must be at least 8 chars)", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
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

            assert.equal(response.errorCode, "INVALID_EMAIL", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Invalid e-mail (max 128 chars)", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
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

            assert.equal(response.errorCode, "NO_PASSWORD", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "You must supply with a password a valid e-mail address", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
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

            assert.equal(response.errorCode, "NO_USERNAME", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "You must supply a username of 1-128 chars", "Incorrect error: " + response.error);
            assert.equal(response.created, false, "Created should be false: " + response.created);
            assert.equal(response.token, null, "Token should be null: " + response.token);
        });
    });
    describe('#login', async function () {
        it('Should get valid login token', async function () {
            var response;
            const req = {
                body: {
                    'username': 'jclarke',
                    'password': 'enigmamachine'
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await users.login(req, res);

            assert.equal(response.errorCode, null, "ErrorCode should be null: " + response.errorCode);
            assert.equal(response.error, null, "Error message should be null: " + response.error);
            assert.equal(response.successful, true, "Successful should be true: " + response.successful);
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.match(token.id, regExpForId, "Invalid token id: " + token.id);
            assert.equal(token.username, req.body.username, "Username incorrect in token: " + token.username);
            assert.equal(token.name, 'Joan Clarke', "Name incorrect in token: " + token.name);
            assert.equal(token.email, null, "E-mail should be empty: " + token.email);
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

            assert.equal(response.errorCode, null, "ErrorCode should be null: " + response.errorCode);
            assert.equal(response.error, null, "Error message should be null: " + response.error);
            assert.equal(response.successful, true, "Successful should be true: " + response.successful);
            const decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
            const token = decoding.decoded;
            assert.match(token.id, regExpForId, "Invalid token id: " + token.id);
            assert.equal(token.username, req.body.username, "Username incorrect in token: " + token.username);
            assert.equal(token.name, 'Ada Lovelace', "Name incorrect in token: " + token.name);
            assert.equal(token.email, "alovelace@math.gov", "Invalid e-mail: " + token.email);
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

            assert.equal(response.errorCode, "INCORRECT", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Invalid username or password", "Incorrect error message: " + response.error);
            assert.equal(response.successful, false, "Successful should be false: " + response.successful);
            assert.equal(response.token, null, "Response token should be null: " + response.successful);
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

            assert.equal(response.errorCode, "INCORRECT", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Invalid username or password", "Incorrect error message: " + response.error);
            assert.equal(response.successful, false, "Successful should be false: " + response.successful);
            assert.equal(response.token, null, "Response token should be null: " + response.successful);
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

            assert.equal(response.errorCode, "USERNAME", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "You must supply a username", "Incorrect error message: " + response.error);
            assert.equal(response.successful, false, "Successful should be false: " + response.successful);
            assert.equal(response.token, null, "Response token should be null: " + response.successful);
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

            assert.equal(response.errorCode, "INCORRECT", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "Invalid username or password", "Incorrect error message: " + response.error);
            assert.equal(response.successful, false, "Successful should be false: " + response.successful);
            assert.equal(response.token, null, "Response token should be null: " + response.successful);
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

            assert.equal(response.errorCode, "USERNAME", "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, "You must supply a username", "Incorrect error message: " + response.error);
            assert.equal(response.successful, false, "Successful should be false: " + response.successful);
            assert.equal(response.token, null, "Response token should be null: " + response.successful);
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

            assert.equal(verifyResponse.valid, true, "Valid should be true: " + verifyResponse.valid);
            assert.equal(verifyResponse.error, null, "Error message should be null: " + verifyResponse.error);
            assert.match(verifyResponse.token.id, regExpForId, "Invalid token id: " + verifyResponse.token.id);
            assert.equal(verifyResponse.token.username, req.body.username, "Username incorrect in token: " + verifyResponse.token.username);
            assert.equal(verifyResponse.token.name, 'Ada Lovelace', "Name incorrect in token: " + verifyResponse.token.name);
            assert.equal(verifyResponse.token.email, 'alovelace@math.gov', "E-mail incorrect in token: " + verifyResponse.token.name);
            const issuedAt = moment(parseInt(verifyResponse.token.iat) * 1000);
            const expires = moment(parseInt(verifyResponse.token.exp) * 1000);
            assert(issuedAt.isBetween(moment().subtract(1, 'seconds'), moment()), "Invalid issued time: " + issuedAt.format());
            assert(expires.isBetween(moment().add(48 * 60 * 60 - 2, 'seconds'), moment().add(48, 'hours')), "Invalid expiration time: " + expires.format());
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

            assert.equal(verifyResponse.valid, false, "Valid should be false: " + verifyResponse.valid);
            assert.equal(verifyResponse.error, "JsonWebTokenError: invalid signature", "Invalid Error message: " + verifyResponse.error);
            assert.equal(verifyResponse.token, null, "Token should be null: " + verifyResponse.token);
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

            assert.equal(response.valid, false, "Valid should be false: " + response.valid);
            assert.equal(response.error, "TokenExpiredError: jwt expired", "Invalid Error message: " + response.error);
            assert.equal(response.token, null, "Token should be null: " + response.token);
        });
    });
})