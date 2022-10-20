'use strict';

import jwt from 'jsonwebtoken';
import assert from 'assert';
import moment from 'moment';
import * as config from '../app/config.js';
import * as jid from '../app/jid.js';
import * as testData from './testData.js';

const UNEXPECTED_SOCKET_MESSAGE = 'Unexpected socket message';
const INVALID_JID_FORMAT = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter";
const INVALID_FORMAT = "INVALID FORMAT";

describe('Jid', async function () {
    let database = null;
    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#save', async function () {
        it('Should save a new code', async function () {
            const { response, socket } = await saveJid(database, "5dk14j", testData.ADA.decodedToken.location, testData.ADA.token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, "5dk14j", socket, "dk", testData.ADA.decodedToken.id, testData.ADA.decodedToken.name);
        });
        it('Should save the same code on a different year', async function () {
            const { response, socket } = await saveJid(database, "5dk37j", testData.ADA.decodedToken.location, testData.ADA.token);
            assertErrors(response, null, null, true);
            assertResponseCode(response, "5dk37j", socket, "dk", testData.ADA.decodedToken.id, testData.ADA.decodedToken.name);

            const { response: response2, socket: socket2 } = await saveJid(database, "5dk37j", testData.ADA.decodedToken2022.location, testData.ADA.token2022);
            assertErrors(response2, null, null, true);
            assertResponseCode(response2, "5dk37j", socket2, "dk", testData.ADA.decodedToken2022.id, testData.ADA.decodedToken2022.name);
        });
        it('Should save same code on a different user', async function () {
            const { response, socket } = await saveJid(database, "5dk14j", testData.JOAN.decodedToken.location, testData.JOAN.token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, "5dk14j", socket, "dk", testData.JOAN.decodedToken.id, testData.JOAN.decodedToken.name);
        });
        it('Should fail with missing token', async function () {
            const { response, socket } = await saveJid(database, "5dk14j", testData.JOAN.decodedToken.location, null);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!", false);
            assert.equal(response.code, null, `Incorrect Code: ${response.code}`);
            assert.equal(socket.messages.length, 0, `${UNEXPECTED_SOCKET_MESSAGE}: ${JSON.stringify(socket.messages)}`);
        });
        it('Should fail with missing location', async function () {
            const { response, socket } = await saveJid(database, "5dk15j", null, testData.ADA.token);

            assertErrors(response, "INVALID TOKEN", "Invalid or missing location", false);
            assert.equal(response.code, null, `Incorrect Code: ${response.code}`);
            assert.equal(socket.messages.length, 0, `${UNEXPECTED_SOCKET_MESSAGE}: ${JSON.stringify(socket.messages)}`);
        });
        it('Should fail because jid code\'s start with 1-7', async function () {
            await assertInvalidFormat("8dk14j");
        });
        it('Should fail because jid code\'s cannot start with a letter', async function () {
            await assertInvalidFormat("ddk14j");
        });
        it('Should fail because jid code\'s country should be letters', async function () {
            await assertInvalidFormat("55514j");
        });
        it('Should fail because jid code\'s country should be an existing country', async function () {
            await assertInvalidJidCode("5kd14j", testData.ADA.token, testData.ADA.decodedToken.location, "INVALID COUNTRY", "Invalid country code: kd", "kd", testData.ADA.decodedToken.id);
        });
        it('Should fail because jid code\'s char 4-5 should be numbers', async function () {
            await assertInvalidFormat("5dk1jj");
        });
        it('Should fail because jid code\'s last char should be a letter', async function () {
            await assertInvalidFormat("5dk211");
        });
        it('Should fail because jid code is too long', async function () {
            await assertInvalidFormat("5dk21k5");
        });
        it('Should reply that jid code is a duplicate', async function () {
            await assertInvalidJidCode("5dk14j", testData.ADA.token, testData.LOCATION_2021.id, "DUPLICATE", "Duplicated code (already registered on user Ada Lovelace)", "dk", testData.ADA.decodedToken.id);
        });
        it('Should reply that token is expired', async function () {
            const privateKey = await config.getValue(database, 'privateKey');

            const payload = {
                id: testData.ADA.decodedToken.id,
                name: testData.ADA.decodedToken.name,
                type: 'user',
                location: testData.ADA.decodedToken.location
            }
            const signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const expiredToken = await jwt.sign(payload, privateKey, signOptions);

            const { response, socket } = await saveJid(database, "5dk17k", testData.ADA.decodedToken.location, expiredToken);

            assertErrors(response, "TOKEN EXPIRED", "jwt expired", false);
            assert.equal(response.code, null, `Incorrect Code: ${response.code}`);
            assert.equal(socket.messages.length, 0, `${UNEXPECTED_SOCKET_MESSAGE}: ${JSON.stringify(socket.messages)}`);
        });
    });

    async function assertInvalidJidCode(jidCode, loginToken, location, errorCode, error, countryCode, userid, username) {
        const { response, socket } = await saveJid(database, jidCode, location, loginToken);

        assertErrors(response, errorCode, error, false);
        assertResponseCode(response, jidCode, socket, countryCode, userid, username);
    }

    function assertErrors(response, errorCode, error, saved) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorrect ErrorMessage: ${response.error}`);
        assert.equal(response.saved, saved, `Should have saved jid code: ${response.saved}`);
    }

    function assertResponseCode(response, jid, socket, countryCode, userid, username) {
        assert.equal(response.code.country, countryCode, `Incorrect Country: ${response.code.country}`);
        assert.equal(response.code.jid, jid, `Incorrect Jid: ${response.code.jid}`);
        assert.equal(response.code.userid, userid, `Incorrect Userid: ${response.code.userid}`);
        if (response.saved) {
            assert.equal(socket.messages.length, 1, `${UNEXPECTED_SOCKET_MESSAGE} count: ${socket.messages.length}`);
            assert.equal(socket.messages[0].key, "new jid", `${UNEXPECTED_SOCKET_MESSAGE}: ${socket.messages[0].key}`);
            assert.equal(socket.messages[0].value.jid, response.code.jid, `Unexpected socket jid: ${socket.messages[0].value.jid}`);
            assert.equal(socket.messages[0].value.country, response.code.country, `Unexpected socket country: ${socket.messages[0].value.country}`);
            assert.equal(socket.messages[0].value.userid, response.code.userid, `Unexpected socket userid: ${socket.messages[0].value.userid}`);
            assert.equal(socket.messages[0].value.user, username, `Unexpected socket user: ${socket.messages[0].value.user}`);
        }
        else if (response.errorCode === "DUPLICATE") {
            const createdTimestamp = moment(response.code.created);
            assert(createdTimestamp.isBetween(moment().subtract(1, 'seconds'), moment()), `Invalid Created timestamp: ${createdTimestamp.toISOString()}`);
        }
        else {
            assert.equal(response.code.created, null, `Incorrect Timestamp: ${response.code.created}`);
            assert.equal(socket.messages.length, 0, `${UNEXPECTED_SOCKET_MESSAGE}: ${JSON.stringify(socket.messages)}`);
        }
    }

    async function assertInvalidFormat(jidCode) {
        await assertInvalidJidCode(jidCode, testData.ADA.token, testData.ADA.decodedToken.location, INVALID_FORMAT, INVALID_JID_FORMAT, null, 
            testData.ADA.decodedToken.id, testData.JOAN.decodedToken.name);
    }
})

export async function saveJid(database, jidCode, location, saveToken) {
    if (saveToken !== null) {
        saveToken = `Bearer ${saveToken}`;
    }
    const req = {
        body: { jid: jidCode },
        params: { location: location },
        headers: { authorization: saveToken }
    };
    const socket = {
        messages: [],
        emit: function (key, value) {
            this.messages.push({
                key: key,
                value: value
            })
        }
    };
    let response;
    const res = {
        locals: {
            db: database,
            socket: socket
        },
        send: function (args) { response = args; }
    };

    await jid.save(req, res);
    return { response, socket };
}
