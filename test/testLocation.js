'use strict';

import jwt from 'jsonwebtoken';
import assert from 'assert';
import moment from 'moment';
import * as jidDatabase from '../app/database.js';
import * as tokenhandler from '../app/tokenhandler.js';
import * as config from '../app/config.js';
import * as CONST from './testConstant.js';
import * as location from '../app/location.js';
import * as admins from '../app/admin.js';

const UNEXPECTED_SOCKET_MESSAGE = 'Unexpected socket message';
const INVALID_JID_FORMAT = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter";
const INVALID_FORMAT = "INVALID FORMAT";

describe('Location', async function () {
    var database = null;
    var token = null;
    var decodedToken = null;
    before(async function () {
        this.timeout(10000);
        config.setLogLevel("NONE");

        tokenhandler.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
        config.setLogLevel("INFO");

        token = await createTestAdmins(database);
        var decoding = await tokenhandler.decodeAdminToken(database, { headers: { authorization: token } });
        decodedToken = decoding.decoded;
    });

    describe('#save', async function () {
        it('Should create a new location', async function () {
            var response = await create(2021, "5gb21p", "Marylebone Joti 2021", token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, true, decodedToken.id, 2021, "5gb21p", "Marylebone Joti 2021");
        });
        it('Should allow a duplicated location in a different year', async function () {
            var response = await create(2020, "5gb21p", "Marylebone Joti 2020", token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, true, decodedToken.id, 2020, "5gb21p", "Marylebone Joti 2020");
        });
        it('Should allow uppercase jid code', async function () {
            var response = await create(2020, "5GB21X", "Marylebone Joti 2020 (uppercase)", token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, true, decodedToken.id, 2020, "5gb21x", "Marylebone Joti 2020 (uppercase)");
        });
        it('Should create a new location with no name', async function () {
            var response = await create(2021, "5gb27g", null, token);

            assertErrors(response, null, null, true);
            assertResponseCode(response, true, decodedToken.id, 2021, "5gb27g", null);
        });
        it('Should fail with missing year', async function () {
            var response = await create(null, "5gb75a", "Marylebone Joti", token);

            var currentYear = moment().year();
            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`, false);
            assertResponseCode(response, false, decodedToken.id);
        });
        it('Should fail with an invalid year in past', async function () {
            var response = await create(2019, "5gb19p", "Marylebone Joti 2019", token);

            var currentYear = moment().year();
            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`, false);
            assertResponseCode(response, false, decodedToken.id, 2019, "5gb19p", "Marylebone Joti 2019");
        });
        it('Should fail with an invalid year in future', async function () {
            var currentYear = moment().year();
            var response = await create(currentYear+1, "5gb74p", "Marylebone Joti "+(currentYear+1), token);

            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`, false);
            assertResponseCode(response, false, decodedToken.id, currentYear+1, "5gb74p", "Marylebone Joti "+(currentYear+1));
        });
        it('Should fail with missing token', async function () {
            var response = await create(2021, "5us55u", "Arlington 2021", null);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!", false);
            assertResponseCode(response, false, decodedToken.id);
        });
        it('Should fail because location jid code is invalid', async function () {
            var response = await create(2021, "8usx14j", "Arlington 2021", token);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, false, decodedToken.id, 2021, "8usx14j", "Arlington 2021");
        });
        it('Should fail with missing jid code', async function () {
            var response = await create(2021, null, "Arlington 2021", token);

            assertErrors(response, "INVALID FORMAT", "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter", false);
            assertResponseCode(response, false, decodedToken.id, 2021, null, "Arlington 2021");
        });
        it('Should fail with duplicated location', async function () {
            var response = await create(2021, "5gb21p", "Marylebone Joti 2021", token);

            assertErrors(response, "DUPLICATE_LOCATION", "A location for jid 5gb21p for the year 2021 is already created", false);
            assertResponseCode(response, false, decodedToken.id, 2021, "5gb21p", "Marylebone Joti 2021");
        });
        it('Should reply that token is expired', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            var payload = {
                id: decodedToken.id,
                username: decodedToken.username,
                name: decodedToken.name,
                type: 'admin'
            }

            var signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const expiredToken = await jwt.sign(payload, privateKey, signOptions);

            var response = await create(2021, "5gb74p", "Marylebone Joti 2021", expiredToken);

            assertErrors(response, "TOKEN EXPIRED", "jwt expired", false);
            assertResponseCode(response, false, decodedToken.id);
        });
    });

    async function create(year, jidCode, name, token) {
        var response;
        const req = {
            body: { },
            headers: { authorization: token }
        };
        if (year !== null) {
            req.body.year = year;
        }
        if (jidCode !== null) {
            req.body.jid = jidCode;
        }
        if (name !== null) {
            req.body.name = name;
        }
        const res = {
            locals: {
                db: database
            },
            send: function (args) { response = args; }
        };

        await location.createLocation(req, res);
        return response;
    }

    function assertErrors(response, errorCode, error, created) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorrect ErrorMessage: ${response.error}`);
        assert.equal(response.created, created, `Should have created location: ${response.created}`);
    }

    function assertResponseCode(response, created, owner, year, jid, name) {
        assert.equal(response.created, created, `Incorrect Created value: ${response.created}`);
    }

})

async function createTestAdmins(database) {
    var token = null;
    await admins.createAdmin({
        body: {
            'name': CONST.ZAPHOD,
            'email': CONST.ZAPHOD_MAIL,
            'password': CONST.ZAPHOD_PASSWORD,
            'phone': CONST.ZAPHOD_PHONE
        }
    }, {
        locals: { db: database },
        send: function (args) { token = args.token; }
    });

    return token;
}
