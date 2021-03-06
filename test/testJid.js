/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-undef */
'use strict';

import jwt from 'jsonwebtoken';
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
            var { response, req, socket } = await save("5dk14j", token, database);

            assertErrors(response, null, null, true);
            assertResponseCode(response, req, socket, decodedToken, "dk");
        });
        it('Should fail with missing token', async function () {
            var { response, socket } = await save("5dk14j", null, database);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!", false);
            assert.equal(response.code, null, "Incorrect Code: " + response.code);
            assert.equal(socket.messages.length, 0, "Unexpected socket message: "+JSON.stringify(socket.messages));
        });
        it('Should fail because jid code\'s start with 1-7', async function () {
            var { response, req, socket } = await save("8dk14j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should fail because jid code\'s cannot start with a letter', async function () {
            var { response, req, socket } = await save("ddk14j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should fail because jid code\'s country should be letters', async function () {
            var { response, req, socket } = await save("55514j", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should fail because jid code\'s country should be an existing country', async function () {
            var { response, req, socket } = await save("5kd14j", token, database);

            assertErrors(response, "INVALID COUNTRY", "Invalid country code: kd", false);
            assertResponseCode(response, req, socket, decodedToken, "kd");
        });
        it('Should fail because jid code\'s char 4-5 should be numbers', async function () {
            var { response, req, socket } = await save("5dk1jj", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should fail because jid code\'s last char should be a letter', async function () {
            var { response, req, socket } = await save("5dk211", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should fail because jid code is too long', async function () {
            var { response, req, socket } = await save("5dk21k5", token, database);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, req, socket, decodedToken, null);
        });
        it('Should reply that jid code is a duplicate', async function () {
            var { response, req, socket } = await save("5dk14j", token, database);

            assertErrors(response, "DUPLICATE", "Duplicated code (already registered on user jclarke)", false);
            assertResponseCode(response, req, socket, decodedToken, "dk");
        });
        it('Should reply that token is expired', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            var payload = {
                id: decodedToken.id,
                username: decodedToken.username,
                name: decodedToken.name
            }
            var signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const expiredToken = await jwt.sign(payload, privateKey, signOptions);

            var { response, socket } = await save("5dk17k", expiredToken, database);
            
            assertErrors(response, "TOKEN EXPIRED", "jwt expired", false);
            assert.equal(response.code, null, "Incorrect Code: " + response.code);
            assert.equal(socket.messages.length, 0, "Unexpected socket message: "+JSON.stringify(socket.messages));
        });
    });
})

async function save(jidCode, token, database) {
    var response;
    const req = {
        body: { jid: jidCode },
        headers: { authorization: token }
    };
    const socket = {
        messages: [],
        emit: function(key, value) {
            this.messages.push({
                key: key,
                value: value
            })
        }
    };
    const res = {
        locals: { 
            db: database,
            socket: socket
        },
        send: function (args) { response = args; }
    };

    await jid.save(req, res);
    return { response, req, socket};
}

function assertErrors(response,  errorCode, error, saved) {
    assert.equal(response.errorCode, errorCode, "Incorrect ErrorCode: " + response.errorCode);
    assert.equal(response.error, error, "Incorrect ErrorMessage: " + response.error);
    assert.equal(response.saved, saved, "Should have saved jid code: " + response.saved);
}

function assertResponseCode(response, req, socket, decodedToken, countryCode) {
    assert.equal(response.code.country, countryCode, "Incorrect Country: " + response.code.country);
    assert.equal(response.code.jid, req.body.jid, "Incorrect Jid: " + response.code.jid);
    assert.equal(response.code.userid, decodedToken.id, "Incorrect Userid: " + response.code.userid);
    if (response.saved) {
        assert.equal(socket.messages.length, 1, "Unexpected socket message count: "+socket.messages.length);
        assert.equal(socket.messages[0].key, "new jid", "Unexpected socket message: "+socket.messages[0].key);
        assert.equal(socket.messages[0].value.jid, response.code.jid, "Unexpected socket jid: "+socket.messages[0].value.jid);
        assert.equal(socket.messages[0].value.country, response.code.country, "Unexpected socket country: "+socket.messages[0].value.country);
        assert.equal(socket.messages[0].value.userid, response.code.userid, "Unexpected socket userid: "+socket.messages[0].value.userid);
        assert.equal(socket.messages[0].value.user, decodedToken.name, "Unexpected socket user: "+socket.messages[0].value.user);
    }
    else if (response.errorCode=="DUPLICATE") {
        const createdTimestamp = moment(response.code.created);
        assert(createdTimestamp.isBetween(moment().subtract(1, 'seconds'), moment()), "Invalid Created timestamp: " + createdTimestamp.format());
    }
    else {
        assert.equal(response.code.created, null, "Incorrect Timestamp: " + response.code.created);
        assert.equal(socket.messages.length, 0, "Unexpected socket message: "+JSON.stringify(socket.messages));
    }
}
