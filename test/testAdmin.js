'use strict';

import assert from 'assert';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';
import * as config from '../app/config.js';
import * as admins from '../app/admin.js';
import * as CONST from './testConstant.js';
import { response } from 'express';

describe('Admin', async function () {
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
    after(async function() {
        database.close();
    });

    describe('#createAdmin', async function () {
        it('Should create a new admin', async function () {
            await testCreateAdmin(CONST.ADA_LOVELACE, CONST.ALOVELACE_AT_MATH_DOT_GOV, 'mathmachine', '+45 12345678');
        });
        it('Should fail if no username is specified', async function () {
            await testCreateAdminFailure(CONST.JOAN_CLARKE, null, null, "NO_EMAIL", "You must supply a valid e-mail of 1-256 chars");
        });
        it('Should fail if e-mail is taken', async function () {
            await testCreateAdminFailure(CONST.ADA_LOVELACE, CONST.ALOVELACE_AT_MATH_DOT_GOV, null, "DUPLICATE_EMAIL", "E-mail is already in use");
        });
        it('Should fail if password is too short', async function () {
            await testCreateAdminFailure(CONST.JOAN_CLARKE, CONST.JCLARKE_AT_ENIGMA_DOT_ORG, 'enigma',
                "INVALID_PASSWORD", "You must supply with a password of at least 8 characters");
        });
        it('Should fail if no password', async function () {
            await testCreateAdminFailure(CONST.JOAN_CLARKE, CONST.JCLARKE_AT_ENIGMA_DOT_ORG, null, "INVALID_PASSWORD", "You must supply with a password of at least 8 characters");
        });
        it('Should fail if no request body', async function () {
            await testCreateAdminFailure(null, null, null, "NO_EMAIL", "You must supply a valid e-mail of 1-256 chars");
        });
        it('Should allow that no name is provided', async function () {
            await testCreateAdmin(null, CONST.JCLARKE_AT_ENIGMA_DOT_ORG, 'enigmamachine', '+45 12345678');
        });
    });

    async function testCreateAdmin(name, email, password, phone) {
        var response;
        const req = {
            body: {
                'name': name,
                'email': email
            }
        };
        if (password !== null) {
            req.body.password = password;
        }
        if (phone !== null) {
            req.body.phone = phone;
        }

        const res = {
            locals: { db: database },
            send: function (args) { response = args; }
        };

        await admins.createAdmin(req, res);

        await assertCreateAdminResponse(req, response, null, null, true);
    }

    async function testCreateAdminFailure(name, email, password, errorCode, error) {
        var response;
        const req = {
            body: {
                'name': name
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

        await admins.createAdmin(req, res);

        await assertCreateAdminResponse(req, response, errorCode, error, false);
    }

    async function assertCreateAdminResponse(req, response, errorCode, error, created) {
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
            const decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: "Bearer " + response.token } });
            const token = decoding.decoded;

            assert.equal(token.id, response.id, `Token id does not match: ${token.id}`);
            assert.equal(token.type, 'admin', `Incorrect token type: ${token.type}`);
            assert.equal(token.username, req.body.email, `E-mail incorrect in token: ${token.username}`);
            assert.equal(token.name, req.body.name, `Name incorrect in token: ${token.name}`);
        }
        else {
            assert.equal(response.token, null, `${CONST.TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        }
    }
})

export async function createTestAdmins(database) {
    var response = await doTestAdminLogin(database);
    if (!response.successful) {
        response = await createTestAdmin(database, CONST.ZAPHOD, CONST.ZAPHOD_MAIL, CONST.ZAPHOD_PASSWORD, CONST.ZAPHOD_PHONE);
    }
    return response;
}

async function doTestAdminLogin(database) {
    var response;
    const req = {
        body: {
            'email': CONST.ZAPHOD_MAIL,
            'password': CONST.ZAPHOD_PASSWORD
        }
    };
    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await admins.login(req, res);
    return response;
}

export async function createTestAdmin(database, name, email, password, phone) {
    var token = null;
    await admins.createAdmin({
        body: {
            'name': name,
            'email': email,
            'password': password,
            'phone': phone
        }
    }, {
        locals: { db: database },
        send: function (args) { token = args.token; }
    });
    return token;
}
