'use strict';

import assert from 'assert';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import * as tokenhandler from '../app/tokenhandler.js';
import * as config from '../app/config.js';
import * as admins from '../app/admin.js';
import * as testData from './testData.js';

describe('Admin Login', async function () {
    var database = null;
    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#login', async function () {
        it('Should get valid login token', async function () {
            var response;
            const req = {
                body: {
                    'email': testData.ZAPHOD.email,
                    'password': testData.ZAPHOD.password
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await admins.login(req, res);

            await assertLoginResponse(response, null, null, true, testData.ZAPHOD.email, testData.ZAPHOD.name);
        });
        it('Should fail login with incorrect password', async function () {
            await testFailedLogin(testData.ZAPHOD.email, 'incorrect', 'INCORRECT', testData.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
        });
        it('Should fail login with incorrect e-mail', async function () {
            await testFailedLogin('zaphod', testData.ZAPHOD.password, 'INCORRECT', testData.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
        });
        it('Should fail login with missing e-mail', async function () {
            await testFailedLogin(null, testData.ZAPHOD.password, 'MISSING_EMAIL', testData.ERROR_MESSAGES.MISSING_EMAIL);
        });
        it('Should fail login with missing password', async function () {
            await testFailedLogin(testData.ZAPHOD.email, null, 'INCORRECT', testData.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
        });
        it('Should fail login with missing request body', async function () {
            var response;
            const req = {
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await admins.login(req, res);

            await assertLoginResponse(response, 'MISSING_EMAIL', testData.ERROR_MESSAGES.MISSING_EMAIL, false);
        });
    });

    describe('#verify', async function () {
        it('Should verify login token', async function () {
            var response;
            const req = {
                body: {
                    'email': testData.ZAPHOD.email,
                    'password': testData.ZAPHOD.password
                }
            };

            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await admins.login(req, res)
            const token = response.token;

            var verifyResponse;
            const verifyReq = {
                headers: {
                    authorization: `Bearer ${token}`
                }
            };
            const verifyRes = {
                locals: { db: database },
                send: function (args) { verifyResponse = args; }
            };
            await tokenhandler.verifyToken(verifyReq, verifyRes);

            assert.equal(verifyResponse.valid, true, `Valid should be true: ${verifyResponse.valid}`);
            assert.equal(verifyResponse.error, null, `Error message should be null: ${verifyResponse.error}`);
            assert.match(verifyResponse.token.id, testData.ID_REG_EXP, `Invalid token id: ${verifyResponse.token.id}`);
            assert.equal(verifyResponse.token.type, 'admin', `Invalid token type: ${verifyResponse.token.type}`);
            assert.equal(verifyResponse.token.username, testData.ZAPHOD.email, `E-mail incorrect in token: ${verifyResponse.token.username}`);
            assert.equal(verifyResponse.token.name, testData.ZAPHOD.name, `Name incorrect in token: ${verifyResponse.token.name}`);
            const issuedAt = moment(parseInt(verifyResponse.token.iat) * 1000);
            const expires = moment(parseInt(verifyResponse.token.exp) * 1000);
            assert(issuedAt.isBetween(moment().subtract(1, 'seconds'), moment()), `Invalid issued time: ${issuedAt.toISOString()}`);
            assert(expires.isBetween(moment().add(48 * 60 * 60 - 2, 'seconds'), moment().add(48, 'hours')), `Invalid expiration time: ${expires.toISOString()}`);
        });
        it('Should fail with invalid signature', async function () {
            var verifyResponse;
            const verifyReq = {
                headers: {
                    authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZlMjhkNzMyLTNjMjMtNGJkOC1hZjYwLWRkNzMyYWJmNGQ2NSIsInVzZXJuYW1lIjoiemFwaG9kQHByZXNpZGVudC51bml2ZXJzZSIsIm5hbWUiOiJaYXBob2QgQmVlYmxlYnJveCIsInR5cGUiOiJhZG1pbiIsImlhdCI6MTYzNTcwMzA5MywiZXhwIjoxNjM1ODc1ODkzfQ.H1Sp9ttSEuQsGOwvaKaWXKLQ1emnLLk70WypLX_l7K0oXhmgQVM_6b_kasktM02j-8vyf3AI9BO9aPlMNaaODAsBf5NsCJOPxs8K27jVEbS3K9XM9jrD3W097ErpmdLbZxuqLZzRwHNp-2BO7p27OEM-NELXt3BPd2n8kEKTF27lEoc8Qb9LPOpijy7y9k7pkTT8UKNvjjlbdfS4fXC5hVktpDN-FGMxfxBUpMc5ZM6Q_M_li4wKfOqSz4OILxKcz3QDRcRevWJiFoPGcstmAl84USKsA6ih2hi62aVeM0vsd9oLqWgyqLtszCk3XLQFNXe1l1QE0foLHWpoexWrrJNslFcB7Ebb7riaS46vNOt-KNbfuJWC6tAaivYMcNXzQZkkfKEm2NWaGTiyzvm-pLl0F_UWGL79ilbZnUCkvUsdHL3Q-GY8ZR9bjjx_acDB4K4Amv9tyqxrn-gmozDwpnPjJk0Vp6ZuIS6MH8uNKiuuTnhm1No_WD8yidvs97XdQ7nUMoOD5qrJWcbO1hw29dg-6gPBdIAYarPXovp69PYzu36c7z06b8l7coQdk6EzkRiPl6Q56qGXcC4f7xSzfNk2x4tbPVuA8pRRHiYCUIk_OSyQhBQekjRazPmlw22gJne-uSZvwpxmTWiYqoNIuO6O23QlN5guY8AjBkym9dk"
                }
            };
            const verifyRes = {
                locals: { db: database },
                send: function (args) { verifyResponse = args; }
            };
            await tokenhandler.verifyToken(verifyReq, verifyRes);

            assert.equal(verifyResponse.valid, false, `Valid should be false: ${verifyResponse.valid}`);
            assert.equal(verifyResponse.error, "invalid signature", `Invalid Error message: ${verifyResponse.error}`);
            assert.equal(verifyResponse.token, null, `${testData.ERROR_MESSAGES.TOKEN_SHOULD_BE_NULL}: ${verifyResponse.token}`);
        });
        it('Should fail with expired token', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            var payload = {
                id: "7d07f3d9-05a6-4ab1-8787-0bd00a1ed75d",
                username: testData.ZAPHOD.email,
                name: testData.ZAPHOD.name,
                type: 'admin'
            }

            var signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const token = await jwt.sign(payload, privateKey, signOptions);

            var response;
            const req = {
                headers: {
                    authorization: `Bearer ${token}`
                }
            };
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };
            await tokenhandler.verifyToken(req, res);

            assert.equal(response.valid, false, `Valid should be false: ${response.valid}`);
            assert.equal(response.error, "jwt expired", `Invalid Error message: ${response.error}`);
            assert.equal(response.token, null, `${testData.ERROR_MESSAGES.TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        });
    });

    async function assertLoginResponse(response, errorCode, error, successful, email, name) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorrect error message: ${response.error}`);
        assert.equal(response.successful, successful, `Inccorect successful value ${response.successful}`);
        if (successful) {
            const decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: `Bearer ${response.token}` } });
            const token = decoding.decoded;
            assert.match(token.id, testData.ID_REG_EXP, `Invalid token id: ${token.id}`);
            assert.equal(token.type, 'admin', `Incorrect token type: ${token.type}`);
            assert.equal(token.username, email, `Username incorrect in token: ${token.username}`);
            assert.equal(token.name, name, `Name incorrect in token: ${token.name}`);
        }
        else {
            assert.equal(response.token, null, `Response token should be null: ${response.successful}`);
        }
    }

    async function testFailedLogin(email, password, errorCode, error) {
        var response;
        const req = {
            body: {
            }
        };

        if (email !== null) {
            req.body.email = email;
        }

        if (password !== null) {
            req.body.password = password;
        }

        const res = {
            locals: { db: database },
            send: function (args) { response = args; }
        };

        await admins.login(req, res);

        await assertLoginResponse(response, errorCode, error, false);
    }
})
