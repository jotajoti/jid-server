'use strict';

import jwt from 'jsonwebtoken';
import assert from 'assert';
import moment from 'moment';
import * as config from '../app/config.js';
import * as location from '../app/location.js';
import * as testData from './testData.js';
import * as admins from './testAdmin.js';

const INVALID_JID_FORMAT = "Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter";
const INVALID_FORMAT = "INVALID FORMAT";

describe('Location', async function () {
    var database = null;
    var adminToken = null;
    var decodedAdminToken = null;
    before(async function () {
        ({ database, adminToken, decodedAdminToken } = await testData.setupTestDatabase(this));
    });
    after(async function() {
        database.close();
    });

    describe('#Create Location', async function () {
        it('Should create a new location', async function () {
            var response = await create(database, 2021, "5gb21p", "Marylebone Joti 2021", adminToken);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, decodedAdminToken.id, 2021, "5gb21p", "gb", "Marylebone Joti 2021");
        });
        it('Should allow a duplicated location in a different year', async function () {
            var response = await create(database, 2020, "5gb21p", "London Joti 2020", adminToken);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, decodedAdminToken.id, 2020, "5gb21p", "gb", "London Joti 2020");
        });
        it('Should allow uppercase jid code', async function () {
            var response = await create(database, 2020, "5GB21X", "Guildford Joti 2020 (uppercase)", adminToken);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, decodedAdminToken.id, 2020, "5gb21x", "gb", "Guildford Joti 2020 (uppercase)");
        });
        it('Should create a new location with no name', async function () {
            var response = await create(database, 2021, "5gb27g", null, adminToken);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, decodedAdminToken.id, 2021, "5gb27g", "gb", null);
        });
        it('Should fail with missing year', async function () {
            var response = await create(database, null, "5gb75a", "Red Lion Joti", adminToken);

            var currentYear = moment().year();
            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, database, decodedAdminToken.id);
        });
        it('Should fail with an invalid year in past', async function () {
            var response = await create(database, 2019, "5gb19p", "Pinnock Joti 2019", adminToken);

            var currentYear = moment().year();
            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, database, decodedAdminToken.id, 2019, "5gb19p", "gb", "Pinnock Joti 2019");
        });
        it('Should fail with an invalid year in future', async function () {
            var currentYear = moment().year();
            var response = await create(database, currentYear+1, "5gb74p", `Budgemoor Joti ${currentYear + 1}`, adminToken);

            assertErrors(response, "INVALID_YEAR", `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, decodedAdminToken.id, currentYear+1, "5gb74p", "gb", `Budgemoor Joti ${currentYear + 1}`);
        });
        it('Should fail with missing token', async function () {
            var response = await create(database, 2021, "5us55u", "Arlington 2021", null);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!");
            assertCreateAdminResponseCode(response, false, decodedAdminToken.id);
        });
        it('Should fail because location jid code is invalid', async function () {
            var response = await create(database, 2021, "8usx14j", "Mostly Harmless 2021", adminToken);

            assertErrors(response, INVALID_FORMAT, INVALID_JID_FORMAT);
            assertCreateAdminResponseCode(response, false, database, decodedAdminToken.id, 2021, "8usx14j", "gb", "Mostly Harmless 2021");
        });
        it('Should fail with missing jid code', async function () {
            var response = await create(database, 2021, null, "Betelgeuse 2021", adminToken);

            assertErrors(response, INVALID_FORMAT,INVALID_JID_FORMAT);
            assertCreateAdminResponseCode(response, false, decodedAdminToken.id, 2021, null, null, "Betelgeuse 2021");
        });
        it('Should fail with duplicated location', async function () {
            var response = await create(database, 2021, "5gb21p", "Dovestone Joti 2021", adminToken);

            assertErrors(response, "DUPLICATE_LOCATION", "A location for jid 5gb21p for the year 2021 is already created");
            assertCreateAdminResponseCode(response, false, database, decodedAdminToken.id, 2021, "5gb21p", "gb", "Dovestone Joti 2021");
        });
        it('Should reply that token is expired', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            var payload = {
                id: decodedAdminToken.id,
                username: decodedAdminToken.username,
                name: decodedAdminToken.name,
                type: 'admin'
            }

            var signOptions = {
                expiresIn: "0s",
                algorithm: "RS256"
            };
            const expiredToken = await jwt.sign(payload, privateKey, signOptions);

            var response = await create(database, 2021, "5gb74p", "Marylebone Joti 2021", expiredToken);

            assertErrors(response, "TOKEN EXPIRED", "jwt expired");
            assertCreateAdminResponseCode(response, false, database, decodedAdminToken.id);
        });
    });

    describe('#Get Locations', async function () {
        it('Should fetch 0 locations', async function () {
            var adminToken = await admins.createTestAdmin(database, "Tricia McMillan", "trillian@earth.gov", "Trillian", null);
            var response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, []);
        });
        it('Should fetch 1 location', async function () {
            var adminToken = await admins.createTestAdmin(database, "Marvin", "marvin@siriuscybernetics.com", "Paranoid", null);
            await create(database, 2022, "7GB55D", "SCC", adminToken)
            var response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, ["SCC"]);
        });
        it('Should fetch 3 locations', async function () {
            var adminToken = await admins.createTestAdmin(database, "Ford Prefect", "marvin@guildford.uk", "Betelgeuse", null);
            await create(database, 2020, "5GB13D", "Guildford", adminToken)
            await create(database, 2021, "5GB25E", "London", adminToken)
            await create(database, 2022, "5GB46F", "Betelgeuise", adminToken)
            var response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, ["Guildford", "London", "Betelgeuise"]);
        });
        it('Should fail with missing token', async function () {
            var response = await getLocations(null);

            assertErrors(response, "MISSING AUTHORIZATION", "No authorization header found!");
            assertGetLocationsResponseCode(response, []);
        });
        it('Should fail with invalid token', async function () {
            var response = await getLocations("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ0ZGI2ZTVkLWI1YTMtNGU4Yy1iMWE0LThmYmJhZGRhOWIwZCIsInVzZXJuYW1lIjoiemFwaG9kQHByZXNpZGVudC51bml2ZXJzZSIsIm5hbWUiOiJaYXBob2QgQmVlYmxlYnJveCIsInR5cGUiOiJhZG1pbiIsImlhdCI6MTY0NDE3NDkyMCwiZXhwIjoxNjQ0MzQ3NzIwfQ.fNfBKaiBfqJaP3J8wol_oxFyinJK_zXeeIWooiMGP0ThjAitBdEpJHuAdUeJktUt0QKKUMhnugZOaJkJgJ6YuHkrVWHls4JpZswfNx3pOBPdAz43UxY0afHKpj9TDc9l2h20lw_aaaVjxe05K3qGx1g9sFESHRP6b7iYUunQpbPAK_LbEZQJl9Owd2kPZ3bIau94WeLgr-vU235cB6CzyYQhf5rQek6hY9IOsQ0mg2XdzZfjZbwZwIs0_zKbfs9MvpENNoQgBMnJZXtIStqRxb_bQPqm4MXttzu13qjH8czv1iOMKRSmgog2CcSeZxdDWw4yMok8Ci7c5gsLmavKtKmyq41FzKxBHpbojBJbde0A3hzNG_6iwodkmRCTUl7zbwq4Lum7qbGqaGnnKpANFDQrLEgJRxxhOYC7LL-kaEMgyDcOp-fz5_Y3iTPFnJp8ccZnfAsOX58Eymo8zIfVBfpBRvUX9VTbUumJzL2zgNbaxWBPCO-KJIEyYKFHRVWJf0fEPJ2eqqjp_babooJtCrw_MXTTxTcNPno6TdUAQHBunnkZugbdb2_UYD0F6OqjU8B1NlD0F7789OLzsEjruVn6ueSENLIItiCbymRPkUwirS7FvJJI4m-tCEBooHho05q7L-IOAQxjrg7zBCJ4f-coEoY18exrVVXXeKY5ZEo");

            assertErrors(response, "INVALID TOKEN", "invalid signature");
            assertGetLocationsResponseCode(response, []);
        });
    });

    async function getLocations(ownerToken) {
        var response;
        if (ownerToken !== null) {
            ownerToken = "Bearer " + ownerToken;
        }
        const req = {
            body: { },
            headers: { authorization: ownerToken }
        };
        const res = {
            locals: {
                db: database
            },
            send: function (args) { response = args; }
        };

        await location.getLocations(req, res);
        return response;
    }

    function assertErrors(response, errorCode, error) {
        assert.equal(response.errorCode, errorCode, `Incorrect ErrorCode: ${response.errorCode}`);
        assert.equal(response.error, error, `Incorrect ErrorMessage: ${response.error}`);
    }

    async function assertCreateAdminResponseCode(response, created, database, owner, year, jid, country, name) {
        assert.equal(response.created, created, `Incorrect Created value: ${response.created}`);

        if (created) {
            var locationFromDB = await location.getLocationById(database, response.id);
            assert.equal(locationFromDB.id, response.id, `Incorrect location id: ${locationFromDB.id}`);
            assert.equal(locationFromDB.jid, jid, `Incorrect jid: ${locationFromDB.jid}`);
            assert.equal(locationFromDB.country, country, `Incorrect country: ${locationFromDB.country}`);
            assert.equal(locationFromDB.owner, owner, `Incorrect owner id: ${locationFromDB.id}`);
            assert.equal(locationFromDB.year, year, `Incorrect year: ${locationFromDB.year}`);
            assert.equal(locationFromDB.name, name, `Incorrect name: ${locationFromDB.name}`);
        }
    }

    function assertGetLocationsResponseCode(response, locations) {
        assert.equal(response.locations.length, locations.length, `Incorrect Locations found: ${response.locations}`);
        for (const locName of locations) {
            var found = false;
            for (const responseLocation of response.locations) {
                if (responseLocation.name===locName) {
                    found = true;
                    break;
                }
            }
            assert.equal(found, true, `Location not found in response: ${locName}`);
        }
    }
})

export async function create(database, year, jidCode, name, ownerToken) {
    var response;
    if (ownerToken !== null) {
        ownerToken = "Bearer " + ownerToken;
    }
    const req = {
        body: { },
        headers: { authorization: ownerToken }
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
