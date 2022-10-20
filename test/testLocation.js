'use strict';

import jwt from 'jsonwebtoken';
import assert from 'assert';
import moment from 'moment';
import * as config from '../app/config.js';
import * as location from '../app/location.js';
import * as testData from './testData.js';
import * as admins from './testAdmin.js';

const INVALID_JID_FORMAT = 'Invalid JID format. Must be a 5 char string with a number, 2 letters, 2 numbers and a letter';
const INVALID_FORMAT = 'INVALID FORMAT';

describe('Location', async function () {
    let database = null;
    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#Create Location', async function () {
        it('Should create a new location', async function () {
            const response = await create(database, 2021, '5gb21p', 'Marylebone Joti 2021', testData.ZAPHOD.token);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, testData.ZAPHOD.decodedToken.id, 2021, '5gb21p', 'gb', 'Marylebone Joti 2021');
        });
        it('Should allow a duplicated location in a different year', async function () {
            const response = await create(database, 2020, '5gb21p', 'London Joti 2020', testData.ZAPHOD.token);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, testData.ZAPHOD.decodedToken.id, 2020, '5gb21p', 'gb', 'London Joti 2020');
        });
        it('Should allow uppercase jid code', async function () {
            const response = await create(database, 2020, '5GB21X', 'Guildford Joti 2020 (uppercase)', testData.ZAPHOD.token);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, testData.ZAPHOD.decodedToken.id, 2020, '5gb21x', 'gb', 'Guildford Joti 2020 (uppercase)');
        });
        it('Should create a new location with no name', async function () {
            const response = await create(database, 2021, '5gb27g', null, testData.ZAPHOD.token);

            assertErrors(response, null, null);
            assertCreateAdminResponseCode(response, true, database, testData.ZAPHOD.decodedToken.id, 2021, '5gb27g', 'gb', null);
        });
        it('Should fail with missing year', async function () {
            const response = await create(database, null, '5gb75a', 'Red Lion Joti', testData.ZAPHOD.token);

            const currentYear = moment().year();
            assertErrors(response, 'INVALID_YEAR', `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, database, testData.ZAPHOD.decodedToken.id);
        });
        it('Should fail with an invalid year in past', async function () {
            const response = await create(database, 2019, '5gb19p', 'Pinnock Joti 2019', testData.ZAPHOD.token);

            const currentYear = moment().year();
            assertErrors(response, 'INVALID_YEAR', `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, database, testData.ZAPHOD.decodedToken.id, 2019, '5gb19p', 'gb', 'Pinnock Joti 2019');
        });
        it('Should fail with an invalid year in future', async function () {
            const currentYear = moment().year();
            const response = await create(database, currentYear+1, '5gb74p', `Budgemoor Joti ${currentYear + 1}`, testData.ZAPHOD.token);

            assertErrors(response, 'INVALID_YEAR', `You must supply a year in the range 2020-${currentYear}`);
            assertCreateAdminResponseCode(response, false, testData.ZAPHOD.decodedToken.id, currentYear+1, '5gb74p', 'gb', `Budgemoor Joti ${currentYear + 1}`);
        });
        it('Should fail with missing token', async function () {
            const response = await create(database, 2021, '5us55u', 'Arlington 2021', null);

            assertErrors(response, 'MISSING AUTHORIZATION', 'No authorization header found!');
            assertCreateAdminResponseCode(response, false, testData.ZAPHOD.decodedToken.id);
        });
        it('Should fail because location jid code is invalid', async function () {
            const response = await create(database, 2021, '8usx14j', 'Mostly Harmless 2021', testData.ZAPHOD.token);

            assertErrors(response, INVALID_FORMAT, INVALID_JID_FORMAT);
            assertCreateAdminResponseCode(response, false, database, testData.ZAPHOD.decodedToken.id, 2021, '8usx14j', 'gb', 'Mostly Harmless 2021');
        });
        it('Should fail with missing jid code', async function () {
            const response = await create(database, 2021, null, 'Betelgeuse 2021', testData.ZAPHOD.token);

            assertErrors(response, INVALID_FORMAT,INVALID_JID_FORMAT);
            assertCreateAdminResponseCode(response, false, testData.ZAPHOD.decodedToken.id, 2021, null, null, 'Betelgeuse 2021');
        });
        it('Should fail with duplicated location', async function () {
            const response = await create(database, 2021, '5gb21p', 'Dovestone Joti 2021', testData.ZAPHOD.token);

            assertErrors(response, 'DUPLICATE_LOCATION', 'A location for jid 5gb21p for the year 2021 is already created');
            assertCreateAdminResponseCode(response, false, database, testData.ZAPHOD.decodedToken.id, 2021, '5gb21p', 'gb', 'Dovestone Joti 2021');
        });
        it('Should reply that token is expired', async function () {
            const privateKey = await config.getValue(database, 'privateKey');
            const payload = {
                id: testData.ZAPHOD.decodedToken.id,
                username: testData.ZAPHOD.decodedToken.username,
                name: testData.ZAPHOD.decodedToken.name,
                type: 'admin'
            }

            const signOptions = {
                expiresIn: '0s',
                algorithm: 'RS256'
            };
            const expiredToken = await jwt.sign(payload, privateKey, signOptions);

            const response = await create(database, 2021, '5gb74p', 'Marylebone Joti 2021', expiredToken);

            assertErrors(response, 'TOKEN EXPIRED', 'jwt expired');
            assertCreateAdminResponseCode(response, false, database, testData.ZAPHOD.decodedToken.id);
        });
    });

    describe('#Get Locations', async function () {
        it('Should fetch 0 locations', async function () {
            const adminToken = (await admins.createTestAdmin(database, 'Tricia McMillan', 'trillian@earth.gov', 'Trillian', null)).token;
            const response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, []);
        });
        it('Should fetch 1 location', async function () {
            const adminToken = (await admins.createTestAdmin(database, 'Marvin', 'marvin@siriuscybernetics.com', 'Paranoid', null)).token;
            await create(database, 2022, '7GB55D', 'SCC', adminToken)
            const response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, ['SCC']);
        });
        it('Should fetch 3 locations', async function () {
            const adminToken = (await admins.createTestAdmin(database, 'Ford Prefect', 'marvin@guildford.uk', 'Betelgeuse', null)).token;
            await create(database, 2020, '5GB13D', 'Guildford', adminToken)
            await create(database, 2021, '5GB25E', 'London', adminToken)
            await create(database, 2022, '5GB46F', 'Betelgeuise', adminToken)
            const response = await getLocations(adminToken);

            assertErrors(response, null, null);
            assertGetLocationsResponseCode(response, ['Guildford', 'London', 'Betelgeuise']);
        });
        it('Should fail with missing token', async function () {
            const response = await getLocations(null);

            assertErrors(response, 'MISSING AUTHORIZATION', 'No authorization header found!');
            assertGetLocationsResponseCode(response, []);
        });
        it('Should fail with invalid token', async function () {
            const response = await getLocations('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ0ZGI2ZTVkLWI1YTMtNGU4Yy1iMWE0LThmYmJhZGRhOWIwZCIsInVzZXJuYW1lIjoiemFwaG9kQHByZXNpZGVudC51bml2ZXJzZSIsIm5hbWUiOiJaYXBob2QgQmVlYmxlYnJveCIsInR5cGUiOiJhZG1pbiIsImlhdCI6MTY0NDE3NDkyMCwiZXhwIjoxNjQ0MzQ3NzIwfQ.fNfBKaiBfqJaP3J8wol_oxFyinJK_zXeeIWooiMGP0ThjAitBdEpJHuAdUeJktUt0QKKUMhnugZOaJkJgJ6YuHkrVWHls4JpZswfNx3pOBPdAz43UxY0afHKpj9TDc9l2h20lw_aaaVjxe05K3qGx1g9sFESHRP6b7iYUunQpbPAK_LbEZQJl9Owd2kPZ3bIau94WeLgr-vU235cB6CzyYQhf5rQek6hY9IOsQ0mg2XdzZfjZbwZwIs0_zKbfs9MvpENNoQgBMnJZXtIStqRxb_bQPqm4MXttzu13qjH8czv1iOMKRSmgog2CcSeZxdDWw4yMok8Ci7c5gsLmavKtKmyq41FzKxBHpbojBJbde0A3hzNG_6iwodkmRCTUl7zbwq4Lum7qbGqaGnnKpANFDQrLEgJRxxhOYC7LL-kaEMgyDcOp-fz5_Y3iTPFnJp8ccZnfAsOX58Eymo8zIfVBfpBRvUX9VTbUumJzL2zgNbaxWBPCO-KJIEyYKFHRVWJf0fEPJ2eqqjp_babooJtCrw_MXTTxTcNPno6TdUAQHBunnkZugbdb2_UYD0F6OqjU8B1NlD0F7789OLzsEjruVn6ueSENLIItiCbymRPkUwirS7FvJJI4m-tCEBooHho05q7L-IOAQxjrg7zBCJ4f-coEoY18exrVVXXeKY5ZEo');

            assertErrors(response, 'INVALID TOKEN', 'invalid signature');
            assertGetLocationsResponseCode(response, []);
        });
        it('Should get this years location', async function () {
            //Create new location for this year
            const jid = '5gb97z';
            const year = moment().year();
            const name = 'Betelgeuse Joti '+year;
            const createResponse = await create(database, year, jid, name, testData.ZAPHOD.token);
            assertErrors(createResponse, null, null);
            assertCreateAdminResponseCode(createResponse, true, database, testData.ZAPHOD.decodedToken.id, year, jid, 'gb', name);

            const response = await getLocation(jid);
            assertLocation(response, year, jid, 'gb', name);
        });
        it('Should get last years location', async function () {
            //Create new location for this year
            const jid = '5gb38f';
            const year = moment().year()-1;
            const name = 'Betelgeuse Joti '+year;
            const createResponse = await create(database, year, jid, name, testData.ZAPHOD.token);
            assertErrors(createResponse, null, null);
            assertCreateAdminResponseCode(createResponse, true, database, testData.ZAPHOD.decodedToken.id, year, jid, 'gb', name);

            const response = await getLocation(jid, year);
            assertLocation(response, year, jid, 'gb', name);
        });
        it('Should find no location', async function () {
            const jid = '5gb17o';
            const response = await getLocation(jid);
            assertErrors(response, null, null);
            assert.equal(response.location, null, `Location should be null: ${JSON.stringify(response.location)}`);
        });
    });

    async function getLocation(jid, year) {
        let response;
        const req = {
            body: { jid: jid },
        };
        if (year) {
            req.body.year = year;
        }
        const res = {
            locals: {
                db: database
            },
            send: function (args) { response = args; }
        };

        await location.getLocation(req, res);
        return response;
    }

    async function getLocations(ownerToken) {
        let response;
        if (ownerToken !== null) {
            ownerToken = `Bearer ${ownerToken}`;
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

    function assertLocation(location, year, jid, country, name) {
        assertErrors(location, null, null);
        assert.notEqual(location.location, null, `Location should not be null: ${location.location}`);
        assert.notEqual(location.location.id, null, `Location id should not be null: ${location.location.id}`);
        assert.equal(location.location.year, year, `Location year should be ${year}: ${location.location.year}`);
        assert.equal(location.location.jid, jid, `Location jid should be ${jid}: ${location.location.jid}`);
        assert.equal(location.location.country, country, `Location country should be ${country}: ${location.location.country}`);
        assert.equal(location.location.name, name, `Location name should be ${name}: ${location.location.name}`);
        assert.notEqual(location.location.created, null, `Location created should not be null: ${location.location.created}`);
    }
    
    async function assertCreateAdminResponseCode(response, created, database, owner, year, jid, country, name) {
        assert.equal(response.created, created, `Incorrect Created value: ${response.created}`);

        if (created) {
            const locationFromDB = await location.getLocationById(database, response.id);
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
            let found = false;
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
    let response;
    if (ownerToken !== null) {
        ownerToken = `Bearer ${ownerToken}`;
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
