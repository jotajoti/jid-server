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
    let database = null;

    before(async function () {
        database = await testData.setupTestDatabase(this);
    });
    after(async function() {
        database.close();
    });

    describe('#getStats', async function () {
        it('Should return empty stats', async function () {
            const location = (await locations.create(database, 2021, '5dk11a', 'Test location 1', testData.ZAPHOD.token)).id;
            const response = await getStats(database, location);

            assertResultData(response,0,0,0,0,0,0,0,null,null);
        });
        it('Should fail with no location', async function () {
            const response = await getStats(database);

            assertResultData(response,0,0,0,0,0,0,0,'NO_LOCATION','No location specified');
        });
        it('Should return 1 user with no jids', async function () {
            const location = (await locations.create(database, 2021, '5dk22b', 'Test location 2', testData.ZAPHOD.token)).id;
            await users.createUser(database, location, {name: 'Agrajag'}, uuid.v4());

            const response = await getStats(database, location);

            assertResultData(response,1,0,0,0,0,0,0,null,null);
            assertUser(response, 'Agrajag', 0, 0);
        });
        it('Should return 1 jid', async function () {
            const location = (await locations.create(database, 2021, '5dk33c', 'Test location 3', testData.ZAPHOD.token)).id;
            const user = await users.createUser(database, location, {name: 'Slartibartfast'}, uuid.v4());

            await saveJid(database, '5dk33c', location, user.token, '2019-10-18 20:31:00');

            const response = await getStats(database, location);

            assertResultData(response,1,1,1,1,0,0,0,null,null);
            assertUser(response, 'Slartibartfast', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18 20:31');
        });
        it('Should return 2 jids but only 1 unique', async function () {
            const location = (await locations.create(database, 2021, '5dk44d', 'Test location 4', testData.ZAPHOD.token)).id;
            const ford = await users.createUser(database, location, {name: 'Trillian'}, uuid.v4());
            await saveJid(database, '5dk45d', location, ford.token, '2019-10-18 20:31:00');

            const arthur = await users.createUser(database, location, {name: 'Marvin'}, uuid.v4());
            await saveJid(database, '5dk45d', location, arthur.token, '2019-10-18 20:15:00');

            const response = await getStats(database, location);

            assertResultData(response,2,1,2,1,0,0,0,null,null);
            assertUser(response, 'Marvin', 1, 1);
            assertUser(response, 'Trillian', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18T20:15');
        });
        it('Should return 2 countries', async function () {
            const location = (await locations.create(database, 2021, '5dk55e', 'Test location 5', testData.ZAPHOD.token)).id;
            const ford = await users.createUser(database, location, {name: 'Almighty Bob'}, uuid.v4());
            await saveJid(database, '5dk17x', location, ford.token, '2019-10-18 21:31:00');
            await saveJid(database, '5se71y', location, ford.token, '2019-10-18 21:33:00');

            const arthur = await users.createUser(database, location, {name: 'Effrafax'}, uuid.v4());
            await saveJid(database, '5dk17x', location, arthur.token, '2019-10-18 21:45:00');

            const response = await getStats(database, location);

            assertResultData(response,2,2,3,2,0,0,0,null,null);
            assertUser(response, 'Almighty Bob', 2, 2);
            assertUser(response, 'Effrafax', 1, 1);
            assertCountry(response, 'dk', 1, '2019-10-18T21:31');
            assertCountry(response, 'se', 1, '2019-10-18T21:33');
        });
        it('Should return more data', async function () {
            this.timeout(30000); //Allow 30 seconds for this test

            const location = (await locations.create(database, 2021, '5dk66f', 'Test location 6', testData.ZAPHOD.token)).id;
            const ford = await users.createUser(database, location, {name: 'Ford'}, uuid.v4());
            const arthur = await users.createUser(database, location, {name: 'Arthur'}, uuid.v4());
            const eddie = await users.createUser(database, location, {name: 'Eddie'}, uuid.v4());
            const marvin = await users.createUser(database, location, {name: 'Marvin'}, uuid.v4());
            const slartibartfast = await users.createUser(database, location, {name: 'Slartibartfast'}, uuid.v4());
            const deep = await users.createUser(database, location, {name: 'Deep Thought'}, uuid.v4());
            const frankie = await users.createUser(database, location, {name: 'Frankie Mouse'}, uuid.v4());
            const benjy = await users.createUser(database, location, {name: 'Benjy mouse'}, uuid.v4());
            const majikthise = await users.createUser(database, location, {name: 'Majikthise'}, uuid.v4());
            const milliways = await users.createUser(database, location, {name: 'Milliways'}, uuid.v4());
            await users.createUser(database, location, {name: 'Vroomfondel'}, uuid.v4());

            await saveJid(database, '5gb69y', location, ford.token, '2019-10-18 21:01');
            await saveJid(database, '5gb69y', location, arthur.token, '2019-10-19 22:02');
            await saveJid(database, '5gb69y', location, eddie.token, '2019-10-20 23:03');
            await saveJid(database, '5gb69y', location, marvin.token, '2019-10-18 00:04');
            await saveJid(database, '3in31r', location, slartibartfast.token, '2019-10-19 01:05');
            await saveJid(database, '3in31r', location, deep.token , '2019-10-20 02:06');
            await saveJid(database, '3in31r', location, frankie.token , '2019-10-18 09:07');
            await saveJid(database, '5no07v', location, benjy.token , '2019-10-19 10:08');
            await saveJid(database, '5no07v', location, majikthise.token , '2019-10-20 11:09');
            await saveJid(database, '5dk03m', location, arthur.token , '2019-10-18 12:10');
            await saveJid(database, '5dk03m', location, eddie.token , '2019-10-19 13:11');
            await saveJid(database, '5dk03m', location, marvin.token , '2019-10-20 14:12');
            await saveJid(database, '5dk03m', location, slartibartfast.token , '2019-10-18 15:13');
            await saveJid(database, '5dk03m', location, deep.token , '2019-10-19 16:14');
            await saveJid(database, '5dk03m', location, frankie.token , '2019-10-20 17:15');
            await saveJid(database, '5dk03m', location, benjy.token , '2019-10-18 18:16');
            await saveJid(database, '5gb79n', location, arthur.token , '2019-10-19 19:17');
            await saveJid(database, '5gb79n', location, eddie.token , '2019-10-20 20:18');
            await saveJid(database, '5gb79n', location, deep.token , '2019-10-18 21:19');
            await saveJid(database, '5gb79n', location, benjy.token , '2019-10-19 22:20');
            await saveJid(database, '5be31g', location, eddie.token , '2019-10-20 23:21');
            await saveJid(database, '5de69c', location, marvin.token , '2019-10-18 00:22');
            await saveJid(database, '5de69c', location, slartibartfast.token , '2019-10-19 01:23');
            await saveJid(database, '5de69c', location, deep.token , '2019-10-20 07:24');
            await saveJid(database, '5de69c', location, majikthise.token , '2019-10-18 08:25');
            await saveJid(database, '5de69c', location, milliways.token , '2019-10-19 09:26');
            await saveJid(database, '5fi15e', location, arthur.token , '2019-10-20 10:27');
            await saveJid(database, '5fi15e', location, marvin.token , '2019-10-18 11:28');
            await saveJid(database, '5gb07g', location, arthur.token , '2019-10-19 12:29');
            await saveJid(database, '5dk34p', location, benjy.token , '2019-10-20 13:30');
            await saveJid(database, '5dk99t', location, marvin.token , '2019-10-18 14:31');
            await saveJid(database, '5dk99t', location, slartibartfast.token , '2019-10-19 15:32');
            await saveJid(database, '5dk99t', location, deep.token , '2019-10-20 16:33');
            await saveJid(database, '5se27t', location, eddie.token , '2019-10-18 17:34');
            await saveJid(database, '5se33s', location, marvin.token , '2019-10-19 18:35');
            await saveJid(database, '5se33s', location, deep.token , '2019-10-20 19:36');

            const response = await getStats(database, location);

            assertResultData(response,11,8,36,13,0,0,0,null,null);
            assertUser(response, 'Arthur', 5, 3);
            assertUser(response, 'Marvin', 6, 5);
            assertUser(response, 'Deep Thought', 6, 5);
            assertUser(response, 'Eddie', 5, 4);
            assertUser(response, 'Frankie Mouse', 2, 2);
            assertUser(response, 'Slartibartfast', 4, 3);
            assertUser(response, 'Ford', 1, 1);
            assertUser(response, 'Benjy mouse', 4, 3);
            assertUser(response, 'Vroomfondel', 0, 0);
            assertUser(response, 'Majikthise', 2, 2);
            assertUser(response, 'Milliways', 1, 1);
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
            const location = (await locations.create(database, 2021, '5dk77g', 'Test location 7', testData.ZAPHOD.token)).id;
            const ford = await users.createUser(database, location, {name: 'Ford'}, uuid.v4());
            await saveJid(database, '5dk45d', location, ford.token, '2019-10-18 20:31:00');
    
            const arthur = await users.createUser(database, location, {name: 'Arthur'}, uuid.v4());
            await saveJid(database, '5dk54e', location, arthur.token, moment().toISOString());
    
            const response = await getStats(database, location);
    
            assertResultData(response,2,1,2,2,1,1,0,null,null);
            assertUser(response, 'Arthur', 1, 1);
            assertUser(response, 'Ford', 1, 1);
            assertCountry(response, 'dk', 2, '2019-10-18T20:31');
        });
    });
});

async function saveJid(database, jidCode, location, saveToken, timestamp) {
    tk.freeze(moment(timestamp).toDate());
    await jids.saveJid(database, jidCode, location, saveToken);
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
    let found = false;
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
    let found = false;
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
    let response;
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
