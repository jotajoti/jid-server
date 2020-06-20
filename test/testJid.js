'use strict';

import assert from 'assert';
import moment from 'moment';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';
import * as jid from '../app/jid.js';

describe('Jid', async function () {
    var database = null;
    var token = null;
    var decodedToken = null;
    before(async function () {
        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });

        //Create a user for the test
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
        token = response.token;
        var decoding = await users.decodeToken(database, { headers: { authorization: response.token } });
        decodedToken = decoding.decoded;
    });
    describe('#save', async function () {
        it('Should save a new code', async function () {
            var { response, req } = await save("5dk14j", token, database);

            assertErrors(response, null, null, true);
            assert.equal(response.code.country, "dk", "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            const created = moment(response.code.created);
            assert(created.isBetween(moment().subtract(1, 'seconds'), moment()), "Invalid Created timestamp: " + created.format());
        });
        it('Should fail with missing token', async function () {
            var { response, req } = await save("5dk14j", null, database);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!", false);
            assert.equal(response.code, null, "Incorrect Code: " + response.code);
        });
        it('Should fail because jid code\'s start with 1-7', async function () {
            var { response, req } = await save("8dk14j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code\'s cannot start with a letter', async function () {
            var { response, req } = await save("ddk14j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code\'s country should be letters', async function () {
            var { response, req } = await save("55514j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code\'s country should be an existing country', async function () {
            var { response, req } = await save("5kd14j", token, database);

            assertErrors(response, "INVALID COUNTRY", "Invalid country code: kd", false);
            assert.equal(response.code.country, "kd", "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code\'s char 4-5 should be numbers', async function () {
            var { response, req } = await save("5dk1jj", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code\'s last char should be a letter', async function () {
            var { response, req } = await save("5dk211", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should fail because jid code is too long', async function () {
            var { response, req } = await save("5dk21k5", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assert.equal(response.code.country, null, "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        });
        it('Should reply that jid code is a duplicate', async function () {
            var { response, req } = await save("5dk14j", token, database);

            assertErrors(response, "DUPLICATE", "Duplicated code (already registered on user jclarke)", false);
            assert.equal(response.code.country, "dk", "Incorrect Country: " + response.code.country);
            assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
            assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
            const created = moment(response.code.created);
            assert(created.isBetween(moment().subtract(1, 'seconds'), moment()), "Invalid Created timestamp: " + created.format());
        });
    });
})

async function save(jidCode, token, database) {
    var response;
    const req = {
        body: { jid: jidCode },
        headers: { authorization: token }
    };
    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await jid.save(req, res);
    return { response, req };
}

function assertErrors(response, errorCode, error, saved) {
    assert.equal(response.errorCode, errorCode, "Incorrect ErrorCode: " + response.errorCode);
    assert.equal(response.error, error, "Incorrect ErrorMessage: " + response.error);
    assert.equal(response.saved, saved, "Should have saved jid code: " + response.saved);
}
