'use strict';

import assert from 'assert';
import moment from 'moment';
import crypto from 'crypto';
import * as uuid from 'uuid';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';
import * as stats from '../app/stats.js';

var saveUser = async function (database, firstName, lastName) {
    var username = (`${firstName}_${lastName}`).replace(/[ .\-æøåÆØÅü]/g, "_").toLowerCase();
    var salt = crypto.randomBytes(32);
    var user = {
        id: uuid.v4(),
        name: `${firstName} ${lastName}`,
        username: username,
        password: crypto.pbkdf2Sync(crypto.randomBytes(32).toString('base64'), salt, 1, 128, 'sha512').toString('base64'),
        salt: salt,
        email: username + "@jidtest.org"
    }
    await database.run('replace into user (id, name, username, password, salt, email) values (?,?,?,?,?,?)',
        user.id, user.name, user.username, user.password, user.salt, user.email);
    return user;
};
var saveJid = async function (database, jidcode, user, created) {
    await database.run("insert into jid (userid, jid, country, created) values (?,?,?,?)",
        user.id, jidcode, jidcode.substring(1, 3), moment(created, "YYYY-MM-DD HH:mm").format());
};

describe('Stats', async function () {
    var database = null;
    var userList = [];

    before(async function () {
        this.timeout(10000);

        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
    });

    // Sanitize the dates, to avoid timezone conflict
    const sanitizeDate = date => date.substring(0, 16);
    const sanitizeCountries = countries => countries.forEach(country => {
        country.created = sanitizeDate(country.created)
    });

    describe('#getStats', async function () {
        it('Should return empty stats', async function () {
            var response = await getStats(database);

            assertResultData(response,0,0,0,0,null,null);
        });
        it('Should return 1 user with no jids', async function () {
            var user = await saveUser(database, 'Joan', 'Clarke');
            userList.push(user);

            var response = await getStats(database);

            assertResultData(response,1,0,0,0,null,null);
            assertUser(response, "Joan Clarke", 0, 0);
        });
        it('Should return 1 jid', async function () {
            await saveJid(database, '5dk01d', userList[0], "2019-10-18 20:31");

            var response = await getStats(database);
            sanitizeCountries(response.countries);

            assertResultData(response,1,1,1,1,null,null);
            assertUser(response, "Joan Clarke", 1, 1);
            assertCountry(response, "dk", 1, "2019-10-18T20:31");
        });
        it('Should return 2 jids but only 1 unique', async function () {
            var user = await saveUser(database, 'Ada', 'Lovelace');
            userList.push(user);
            await saveJid(database, '5dk01d', user, "2019-10-18 20:45");

            var response = await getStats(database);
            sanitizeCountries(response.countries);

            assertResultData(response,2,1,2,1,null,null);
            assertUser(response, "Ada Lovelace", 1, 1);
            assertUser(response, "Joan Clarke", 1, 1);
            assertCountry(response, "dk", 1, "2019-10-18T20:31");
        });
        it('Should return 2 countries', async function () {
            await saveJid(database, '5se09e', userList[0], "2019-10-18 21:15");

            var response = await getStats(database);
            sanitizeCountries(response.countries);

            assertResultData(response,2,2,3,2,null,null);
            assertUser(response, "Ada Lovelace", 1, 1);
            assertUser(response, "Joan Clarke", 2, 2);
            assertCountry(response, "dk", 1, "2019-10-18T20:31");
            assertCountry(response, "se", 1, "2019-10-18T21:15");
        });
        it('Should return more data', async function () {
            userList.push(await saveUser(database, 'Grace', 'Hopper'));
            userList.push(await saveUser(database, 'Annie', 'Easley'));
            userList.push(await saveUser(database, 'Radia', 'Perlman'));
            userList.push(await saveUser(database, 'Mary', 'Keller'));
            userList.push(await saveUser(database, 'Katherine', 'Johnson'));
            userList.push(await saveUser(database, 'Anna', 'Winlock'));
            userList.push(await saveUser(database, 'Hedy', 'Lamarr'));
            userList.push(await saveUser(database, 'Klara', 'Neumann'));
            userList.push(await saveUser(database, 'Milly', 'Koss'));

            await saveJid(database, '5gb69y', userList[0], "2019-10-18 21:01");
            await saveJid(database, '5gb69y', userList[1], "2019-10-19 22:02");
            await saveJid(database, '5gb69y', userList[2], "2019-10-20 23:03");
            await saveJid(database, '5gb69y', userList[3], "2019-10-18 00:04");
            await saveJid(database, '3in31r', userList[4], "2019-10-19 01:05");
            await saveJid(database, '3in31r', userList[5], "2019-10-20 02:06");
            await saveJid(database, '3in31r', userList[6], "2019-10-18 09:07");
            await saveJid(database, '5no07v', userList[7], "2019-10-19 10:08");
            await saveJid(database, '5no07v', userList[8], "2019-10-20 11:09");
            await saveJid(database, '5dk03m', userList[1], "2019-10-18 12:10");
            await saveJid(database, '5dk03m', userList[2], "2019-10-19 13:11");
            await saveJid(database, '5dk03m', userList[3], "2019-10-20 14:12");
            await saveJid(database, '5dk03m', userList[4], "2019-10-18 15:13");
            await saveJid(database, '5dk03m', userList[5], "2019-10-19 16:14");
            await saveJid(database, '5dk03m', userList[6], "2019-10-20 17:15");
            await saveJid(database, '5dk03m', userList[7], "2019-10-18 18:16");
            await saveJid(database, '5gb79n', userList[1], "2019-10-19 19:17");
            await saveJid(database, '5gb79n', userList[2], "2019-10-20 20:18");
            await saveJid(database, '5gb79n', userList[5], "2019-10-18 21:19");
            await saveJid(database, '5gb79n', userList[7], "2019-10-19 22:20");
            await saveJid(database, '5be31g', userList[2], "2019-10-20 23:21");
            await saveJid(database, '5de69c', userList[3], "2019-10-18 00:22");
            await saveJid(database, '5de69c', userList[4], "2019-10-19 01:23");
            await saveJid(database, '5de69c', userList[5], "2019-10-20 07:24");
            await saveJid(database, '5de69c', userList[8], "2019-10-18 08:25");
            await saveJid(database, '5de69c', userList[9], "2019-10-19 09:26");
            await saveJid(database, '5fi15e', userList[1], "2019-10-20 10:27");
            await saveJid(database, '5fi15e', userList[3], "2019-10-18 11:28");
            await saveJid(database, '5gb07g', userList[1], "2019-10-19 12:29");
            await saveJid(database, '5dk34p', userList[7], "2019-10-20 13:30");
            await saveJid(database, '5dk99t', userList[3], "2019-10-18 14:31");
            await saveJid(database, '5dk99t', userList[4], "2019-10-19 15:32");
            await saveJid(database, '5dk99t', userList[5], "2019-10-20 16:33");
            await saveJid(database, '5se27t', userList[2], "2019-10-18 17:34");
            await saveJid(database, '5se33s', userList[3], "2019-10-19 18:35");
            await saveJid(database, '5se33s', userList[5], "2019-10-20 19:36");

            var response = await getStats(database);
            sanitizeCountries(response.countries);

            assertResultData(response,11,8,39,15,null,null);
            assertUser(response, "Ada Lovelace", 6, 3);
            assertUser(response, "Annie Easley", 6, 5);
            assertUser(response, "Mary Keller", 6, 5);
            assertUser(response, "Grace Hopper", 5, 4);
            assertUser(response, "Anna Winlock", 4, 3);
            assertUser(response, "Radia Perlman", 4, 3);
            assertUser(response, "Joan Clarke", 3, 3);
            assertUser(response, "Hedy Lamarr", 2, 2);
            assertUser(response, "Katherine Johnson", 2, 2);
            assertUser(response, "Klara Neumann", 1, 1);
            assertUser(response, "Milly Koss", 0, 0);
            assertCountry(response, "dk", 4, "2019-10-18T12:10");
            assertCountry(response, "gb", 3, "2019-10-18T00:04");
            assertCountry(response, "se", 3, "2019-10-18T17:34");
            assertCountry(response, "de", 1, "2019-10-18T00:22");
            assertCountry(response, "in", 1, "2019-10-18T09:07");
            assertCountry(response, "fi", 1, "2019-10-18T11:28");
            assertCountry(response, "no", 1, "2019-10-19T10:08");
            assertCountry(response, "be", 1, "2019-10-20T23:21");
        });
    });
});

function assertResultData(response, userCount, countryCount, jidCount, uniqueJidCount, errorCode, error) {
    assert.equal(response.users.length, userCount, "Incorrect Users: " + JSON.stringify(response.users));
    assert.equal(response.totals.countries, countryCount, "Incorrect Countries count: " + response.totals.countries);
    assert.equal(response.totals.jids, jidCount, "Incorrect Jids count: " + response.totals.jids);
    assert.equal(response.totals.unique, uniqueJidCount, "Incorrect Unique Jids count: " + response.totals.unique);
    assert.equal(response.errorCode, errorCode, "Incorrect ErrorCode: " + response.errorCode);
    assert.equal(response.error, error, "Incorrect ErrorMessage: " + response.error);
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

    assert.equal(found, true, "User not found: "+userName);
}

function assertCountry(response, countryCode, jidCount, createdTimestamp) {
    var found = false;
    response.countries.forEach(country => {
        if (country.country === countryCode) {
            assert.equal(country.jids, jidCount, `Invalid jid count for ${countryCode}: ${country.jids}`);
            switch (countryCode) {
                case "dk":
                    assertCountryValue("Denmark", country);
                    break;
                case "se":
                    assertCountryValue("Sweden", country);
                    break;
                case "gb":
                    assertCountryValue("United Kingdom of Great Britain and Northern Ireland", country);
                    break;
                case "de":
                    assertCountryValue("Germany", country);
                    break;
                case "in":
                    assertCountryValue("India", country);
                    break;
                case "fi":
                    assertCountryValue("Finland", country);
                    break;
                case "no":
                    assertCountryValue("Norway", country);
                    break;
                case "be":
                    assertCountryValue("Belgium", country);
                    break;
                default:
                    assert.fail(`Unknown country code for test: ${countryCode}`);
            }
            assert.equal(country.created, createdTimestamp, `Invalid created timestamp for ${countryCode}: ${country.created}`);
            found = true;
        }
    });

    assert.equal(found, true, `Country not found: ${countryCode}`);

    function assertCountryValue(expectedCountry, country) {
        assert.equal(country.countryName, expectedCountry, `Invalid country name for ${countryCode}: ${country.countryName}`);
    }
}

async function getStats(database) {
    var response;
    const req = {};
    const res = {
        locals: { db: database },
        send: function (args) { response = args; }
    };

    await stats.getStats(req, res);
    return response;
}
