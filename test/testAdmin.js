'use strict';

import assert from 'assert';
import * as tokenhandler from '../app/tokenhandler.js';
import * as admins from '../app/admin.js';
import * as testData from './testData.js';

describe('Admin', async function () {
    let database = null;
    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#createAdmin', async function () {
        it('Should create a new admin', async function () {
            await testCreateAdmin(testData.ADA.name, testData.ADA.email, testData.ADA.password, '+45 12345678');
        });
        it('Should fail if no username is specified', async function () {
            await testCreateAdminFailure(testData.JOAN.name, null, null, "NO_EMAIL", "You must supply a valid e-mail of 1-256 chars");
        });
        it('Should fail if e-mail is taken', async function () {
            await testCreateAdminFailure(testData.ADA.name, testData.ADA.email, null, "DUPLICATE_EMAIL", "E-mail is already in use");
        });
        it('Should fail if password is too short', async function () {
            await testCreateAdminFailure(testData.JOAN.name, testData.JOAN.email, 'enigma',
                "INVALID_PASSWORD", "You must supply with a password of at least 8 characters");
        });
        it('Should fail if no password', async function () {
            await testCreateAdminFailure(testData.JOAN.name, testData.JOAN.email, null, "INVALID_PASSWORD", "You must supply with a password of at least 8 characters");
        });
        it('Should fail if no request body', async function () {
            await testCreateAdminFailure(null, null, null, "NO_EMAIL", "You must supply a valid e-mail of 1-256 chars");
        });
        it('Should allow that no name is provided', async function () {
            await testCreateAdmin(null, testData.JOAN.email, testData.JOAN.password, '+45 12345678');
        });
    });

    async function testCreateAdmin(name, email, password, phone) {
        const response = await createTestAdmin(database, name, email, password, phone);
        await assertCreateAdminResponse(name, email, response, null, null, true);
    }

    async function testCreateAdminFailure(name, email, password, errorCode, error) {
        const response = await createTestAdmin(database, name, email, password, null);
        await assertCreateAdminResponse(name, email, response, errorCode, error, false);
    }

    async function assertCreateAdminResponse(name, email, response, errorCode, error, created) {
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
            const decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: `Bearer ${response.token}` } });
            const token = decoding.decoded;

            assert.equal(token.id, response.id, `Token id does not match: ${token.id}`);
            assert.equal(token.type, 'admin', `Incorrect token type: ${token.type}`);
            assert.equal(token.username, email, `E-mail incorrect in token: ${token.username}`);
            assert.equal(token.name, name, `Name incorrect in token: ${token.name}`);
        }
        else {
            assert.equal(response.token, null, `${testData.ERROR_MESSAGES.TOKEN_SHOULD_BE_NULL}: ${response.token}`);
        }
    }
})

export async function createTestAdmin(database, name, email, password, phone) {
    let response;
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
    return response;
}
