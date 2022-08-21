'use strict';

import assert from 'assert';
import tk from 'timekeeper';
import moment from 'moment';
import * as uuid from 'uuid';
import * as stats from '../app/stats.js';
import * as users from './testUser.js';
import * as jids from './testJid.js';
import * as testData from './testData.js';
import * as locations from './testLocation.js';

describe('Stats', async function () {
    var database = null;

    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#getStats', async function () {
        it('Should return empty stats', async function () {
            var location = (await locations.create(database, 2021, '5dk11a', 'Test location 1', testData.ZAPHOD.token)).id;
            var response = await getStats(database, location);

            assertResultData(response,0,0,0,0,0,0,0,null,null);
        });
        it('Should fail with no location', async function () {
            var response = await getStats(database);

            assertResultData(response,0,0,0,0,0,0,0,'NO_LOCATION','No location specified');
        });
        it('Should return 1 user with no jids', async function () {
            var location = (await locations.create(database, 2021, '5dk22b', 'Test location 2', testData.ZAPHOD.token)).id;
            await users.createUser(database, location, 'Joan', uuid.v4());

            var response = await getStats(database, location);

            assertResultData(response,1,0,0,0,0,0,0,null,null);
            assertUser(response, 'Joan', 0, 0);
        });
        it('Should return 1 jid', async function () {
            var location = (await locations.create(database, 2021, '5dk33c', 'Test location 3', testData.ZAPHOD.token)).id;
            var user = await users.createUser(database, location, 'Joan', uuid.v4());

            await saveJid(database, '5dk33c', location, user.token, '2019-10-18 20:31:00');

            var response = await getStats(database, location);

            assertResultData(response,1,1,1,1,0,0,0,null,null);
            assertUser(response, 'Joan', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18 20:31');
        });
        it('Should return 2 jids but only 1 unique', async function () {
            var location = (await locations.create(database, 2021, '5dk44d', 'Test location 4', testData.ZAPHOD.token)).id;
            var joan = await users.createUser(database, location, 'Joan', uuid.v4());
            await saveJid(database, '5dk45d', location, joan.token, '2019-10-18 20:31:00');

            var ada = await users.createUser(database, location, 'Ada', uuid.v4());
            await saveJid(database, '5dk45d', location, ada.token, '2019-10-18 20:15:00');

            var response = await getStats(database, location);

            assertResultData(response,2,1,2,1,0,0,0,null,null);
            assertUser(response, 'Ada', 1, 1);
            assertUser(response, 'Joan', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18T20:15');
        });
        it('Should return 2 countries', async function () {
            var location = (await locations.create(database, 2021, '5dk55e', 'Test location 5', testData.ZAPHOD.token)).id;
            var joan = await users.createUser(database, location, 'Joan', uuid.v4());
            await saveJid(database, '5dk17x', location, joan.token, '2019-10-18 21:31:00');
            await saveJid(database, '5se71y', location, joan.token, '2019-10-18 21:33:00');

            var ada = await users.createUser(database, location, 'Ada', uuid.v4());
            await saveJid(database, '5dk17x', location, ada.token, '2019-10-18 21:45:00');

            var response = await getStats(database, location);

            assertResultData(response,2,2,3,2,0,0,0,null,null);
            assertUser(response, 'Joan', 2, 2);
            assertUser(response, 'Ada', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18T21:31');
            assertCountry(response, 'se', 1, '2019-10-18T21:33');
        });
        it('Should return more data', async function () {
            this.timeout(30000); //Allow 30 seconds for this test

            var location = (await locations.create(database, 2021, '5dk66f', 'Test location 6', testData.ZAPHOD.token)).id;
            var joan = await users.createUser(database, location, 'Joan', uuid.v4());
            var ada = await users.createUser(database, location, 'Ada', uuid.v4());
            var grace = await users.createUser(database, location, 'Grace', uuid.v4());
            var annie = await users.createUser(database, location, 'Annie', uuid.v4());
            var radia = await users.createUser(database, location, 'Radia', uuid.v4());
            var mary = await users.createUser(database, location, 'Mary', uuid.v4());
            var anna = await users.createUser(database, location, 'Anna', uuid.v4());
            var hedy = await users.createUser(database, location, 'Hedy', uuid.v4());
            var klara = await users.createUser(database, location, 'Klara', uuid.v4());
            var milly = await users.createUser(database, location, 'Milly', uuid.v4());
            await users.createUser(database, location, 'Katherine', uuid.v4());

            await saveJid(database, '5gb69y', location, joan.token, '2019-10-18 21:01');
            await saveJid(database, '5gb69y', location, ada.token, '2019-10-19 22:02');
            await saveJid(database, '5gb69y', location, grace.token, '2019-10-20 23:03');
            await saveJid(database, '5gb69y', location, annie.token, '2019-10-18 00:04');
            await saveJid(database, '3in31r', location, radia.token, '2019-10-19 01:05');
            await saveJid(database, '3in31r', location, mary.token , '2019-10-20 02:06');
            await saveJid(database, '3in31r', location, anna.token , '2019-10-18 09:07');
            await saveJid(database, '5no07v', location, hedy.token , '2019-10-19 10:08');
            await saveJid(database, '5no07v', location, klara.token , '2019-10-20 11:09');
            await saveJid(database, '5dk03m', location, ada.token , '2019-10-18 12:10');
            await saveJid(database, '5dk03m', location, grace.token , '2019-10-19 13:11');
            await saveJid(database, '5dk03m', location, annie.token , '2019-10-20 14:12');
            await saveJid(database, '5dk03m', location, radia.token , '2019-10-18 15:13');
            await saveJid(database, '5dk03m', location, mary.token , '2019-10-19 16:14');
            await saveJid(database, '5dk03m', location, anna.token , '2019-10-20 17:15');
            await saveJid(database, '5dk03m', location, hedy.token , '2019-10-18 18:16');
            await saveJid(database, '5gb79n', location, ada.token , '2019-10-19 19:17');
            await saveJid(database, '5gb79n', location, grace.token , '2019-10-20 20:18');
            await saveJid(database, '5gb79n', location, mary.token , '2019-10-18 21:19');
            await saveJid(database, '5gb79n', location, hedy.token , '2019-10-19 22:20');
            await saveJid(database, '5be31g', location, grace.token , '2019-10-20 23:21');
            await saveJid(database, '5de69c', location, annie.token , '2019-10-18 00:22');
            await saveJid(database, '5de69c', location, radia.token , '2019-10-19 01:23');
            await saveJid(database, '5de69c', location, mary.token , '2019-10-20 07:24');
            await saveJid(database, '5de69c', location, klara.token , '2019-10-18 08:25');
            await saveJid(database, '5de69c', location, milly.token , '2019-10-19 09:26');
            await saveJid(database, '5fi15e', location, ada.token , '2019-10-20 10:27');
            await saveJid(database, '5fi15e', location, annie.token , '2019-10-18 11:28');
            await saveJid(database, '5gb07g', location, ada.token , '2019-10-19 12:29');
            await saveJid(database, '5dk34p', location, hedy.token , '2019-10-20 13:30');
            await saveJid(database, '5dk99t', location, annie.token , '2019-10-18 14:31');
            await saveJid(database, '5dk99t', location, radia.token , '2019-10-19 15:32');
            await saveJid(database, '5dk99t', location, mary.token , '2019-10-20 16:33');
            await saveJid(database, '5se27t', location, grace.token , '2019-10-18 17:34');
            await saveJid(database, '5se33s', location, annie.token , '2019-10-19 18:35');
            await saveJid(database, '5se33s', location, mary.token , '2019-10-20 19:36');

            var response = await getStats(database, location);

            assertResultData(response,11,8,36,13,0,0,0,null,null);
            assertUser(response, 'Ada', 5, 3);
            assertUser(response, 'Annie', 6, 5);
            assertUser(response, 'Mary', 6, 5);
            assertUser(response, 'Grace', 5, 4);
            assertUser(response, 'Anna', 2, 2);
            assertUser(response, 'Radia', 4, 3);
            assertUser(response, 'Joan', 1, 1);
            assertUser(response, 'Hedy', 4, 3);
            assertUser(response, 'Katherine', 0, 0);
            assertUser(response, 'Klara', 2, 2);
            assertUser(response, 'Milly', 1, 1);
            assertCountry(response, 'dk', 3, '2019-10-18T12:10');
            assertCountry(response, 'gb', 3, '2019-10-18T00:04');
            assertCountry(response, 'se', 2, '2019-10-18T17:34');
            assertCountry(response, 'de', 1, '2019-10-18T00:22');
            assertCountry(response, 'in', 1, '2019-10-18T09:07');
            assertCountry(response, 'fi', 1, '2019-10-18T11:28');
            assertCountry(response, 'no', 1, '2019-10-19T10:08');
            assertCountry(response, 'be', 1, '2019-10-20T23:21');
        });
        it('Should return resent data', async function () {
            this.timeout(30000); //Allow 30 seconds for this test
            var location = (await locations.create(database, 2021, '5dk77g', 'Test location 7', testData.ZAPHOD.token)).id;
            var joan = await users.createUser(database, location, 'Joan', uuid.v4());
            await saveJid(database, '5dk45d', location, joan.token, '2019-10-18 20:31:00');
    
            var ada = await users.createUser(database, location, 'Ada', uuid.v4());
            await saveJid(database, '5dk54e', location, ada.token, moment().toISOString());
    
            var response = await getStats(database, location);
    
            assertResultData(response,2,1,2,2,1,1,0,null,null);
            assertUser(response, 'Ada', 1, 1);
            assertUser(response, 'Joan', 1, 1);
            assertCountry(response, 'dk', 2, '2019-10-18T20:31');
        });
    });
});

async function saveJid(database, jidCode, location, saveToken, timestamp) {
    tk.freeze(moment(timestamp).toDate());
    var result = await jids.saveJid(database, jidCode, location, saveToken);
    tk.reset();
}

function assertResultData(response, userCount, countryCount, jidCount, uniqueJidCount, changeCount, changeUnique, changeCountries, errorCode, error) {
    assert.equal(response.users.length, userCount, 'Incorrect Users: ' + JSON.stringify(response.users));
    assert.equal(response.totals.countries, countryCount, 'Incorrect Countries count: ' + response.totals.countries);
    assert.equal(response.totals.jids, jidCount, 'Incorrect Jids count: ' + response.totals.jids);
    assert.equal(response.totals.unique, uniqueJidCount, 'Incorrect Unique Jids count: ' + response.totals.unique);
    assert.equal(response.totals.change.jids, changeCount, 'Incorrect Jids count: ' + response.totals.jids);
    assert.equal(response.totals.change.unique, changeUnique, 'Incorrect Unique Jids count: ' + response.totals.unique);
    assert.equal(response.totals.change.countries, changeCountries, 'Incorrect Countries count: ' + response.totals.countries);
    assert.equal(response.errorCode, errorCode, 'Incorrect ErrorCode: ' + response.errorCode);
    assert.equal(response.error, error, 'Incorrect ErrorMessage: ' + response.error);
}

function assertUser(response, userName, jidCount, countryCount) {
    var found = false;
    response.users.forEach(user => {
        if (user.name === userName) {
            assert.equal(user.jids, jidCount, `Invalid jid count for ${userName}: ${user.jids}`);
            assert.equal(user.countries, countryCount, `Invalid country count for ${userName}: ${user.countries}`);
            found = true;
        }
    });

    assert.equal(found, true, 'User not found: '+userName);
}

function assertCountry(response, countryCode, jidCount, createdTimestamp) {
    var found = false;
    response.countries.forEach(country => {
        if (country.country === countryCode) {
            assert.equal(country.jids, jidCount, `Invalid jid count for ${countryCode}: ${country.jids}`);
            switch (countryCode) {
                case 'dk':
                    assertCountryValue('Denmark', country);
                    break;
                case 'se':
                    assertCountryValue('Sweden', country);
                    break;
                case 'gb':
                    assertCountryValue('United Kingdom of Great Britain and Northern Ireland', country);
                    break;
                case 'de':
                    assertCountryValue('Germany', country);
                    break;
                case 'in':
                    assertCountryValue('India', country);
                    break;
                case 'fi':
                    assertCountryValue('Finland', country);
                    break;
                case 'no':
                    assertCountryValue('Norway', country);
                    break;
                case 'be':
                    assertCountryValue('Belgium', country);
                    break;
                default:
                    assert.fail(`Unknown country code for test: ${countryCode}`);
            }
            assert.equal(moment(country.created).toISOString(), moment(createdTimestamp).toISOString(), `Invalid created timestamp for ${countryCode}: ${country.created}`);
            found = true;
        }
    });

    assert.equal(found, true, `Country not found: ${countryCode}`);

    function assertCountryValue(expectedCountry, country) {
        assert.equal(country.countryName, expectedCountry, `Invalid country name for ${countryCode}: ${country.countryName}`);
    }
}

async function getStats(database, location) {
    var response;
    const req = {
        params: {
            location: location
        }
    };
    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await stats.getStats(req, res);
    return response;
}
