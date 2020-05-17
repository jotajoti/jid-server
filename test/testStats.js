'use strict';

import assert from 'assert';
import moment from 'moment';
import crypto from 'crypto';
import uuid from 'uuid';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';
import * as users from '../app/users.js';
import * as stats from '../app/stats.js';

describe('Stats', async function () {
    var database = null;
    var userList = [];

    before(async function () {
        users.clearCache();
        database = await jidDatabase.createDatabase();
        await config.checkConfig({
            database: database
        });
    });
    describe('#getStats', async function () {
        it('Should return empty stats', async function () {
            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.equal(response.users.length, 0, "Incorrect Users: " + JSON.stringify(response.users));
            assert.equal(response.countries.length, 0, "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 0, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 0, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 0, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
        });
        it('Should return 1 user with no jids', async function () {
            var user = await saveUser(database, 'Joan', 'Clarke');
            userList.push(user);

            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.deepEqual(response.users, [{"name":"Joan Clarke","jids":0,"countries":0}], "Incorrect Users: " + JSON.stringify(response.users));
            assert.equal(response.countries.length, 0, "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 0, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 0, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 0, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
        });
        it('Should return 1 jid', async function () {
            await saveJid(database, '5dk01d', userList[0], "2019-10-18 20:31");

            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.deepEqual(response.users, [{ "name": "Joan Clarke", "jids": 1, "countries": 1 }], "Incorrect Users: " + JSON.stringify(response.users));
            assert.deepEqual(response.countries, [{ "country": "dk", "countryName": "Denmark", "jids": 1, "created": "2019-10-18T20:31:00+02:00" }], "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 1, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 1, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 1, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
        });
        it('Should return 2 jids but only 1 unique', async function () {
            var user = await saveUser(database, 'Ada', 'Lovelace');
            userList.push(user);
            await saveJid(database, '5dk01d', user, "2019-10-18 20:45");

            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.deepEqual(response.users, [
                { "name": "Ada Lovelace", "jids": 1, "countries": 1 },
                { "name": "Joan Clarke", "jids": 1, "countries": 1 }], "Incorrect Users: " + JSON.stringify(response.users));
            assert.deepEqual(response.countries, [
                { "country": "dk", "countryName": "Denmark", "jids": 1, "created": "2019-10-18T20:31:00+02:00" }], "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 1, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 2, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 1, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
        });
        it('Should return 2 countries', async function () {
            await saveJid(database, '5se09e', userList[0], "2019-10-18 21:15");

            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.deepEqual(response.users, [
                { "name": "Joan Clarke", "jids": 2, "countries": 2 },
                { "name": "Ada Lovelace", "jids": 1, "countries": 1 }], "Incorrect Users: " + JSON.stringify(response.users));
            assert.deepEqual(response.countries, [
                { "country": "dk", "countryName": "Denmark", "jids": 1, "created": "2019-10-18T20:31:00+02:00" },
                { "country": "se", "countryName": "Sweden", "jids": 1, "created": "2019-10-18T21:15:00+02:00" }], "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 2, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 3, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 2, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
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

            var response;
            const req = {};
            const res = {
                locals: { db: database },
                send: function (args) { response = args; }
            };

            await stats.getStats(req, res);

            assert.deepEqual(response.users, [
                {"name":"Ada Lovelace","jids":6,"countries":3},
                {"name":"Annie Easley","jids":6,"countries":5},
                {"name":"Mary Keller","jids":6,"countries":5},
                {"name":"Grace Hopper","jids":5,"countries":4},
                {"name":"Anna Winlock","jids":4,"countries":3},
                {"name":"Radia Perlman","jids":4,"countries":3},
                {"name":"Joan Clarke","jids":3,"countries":3},
                {"name":"Hedy Lamarr","jids":2,"countries":2},
                {"name":"Katherine Johnson","jids":2,"countries":2},
                {"name":"Klara Neumann","jids":1,"countries":1},
                {"name":"Milly Koss","jids":0,"countries":0}], "Incorrect Users: " + JSON.stringify(response.users));
            assert.deepEqual(response.countries, [
                { "country": "dk", "countryName": "Denmark", "jids": 4, "created": "2019-10-18T12:10:00+02:00" },
                { "country": "gb", "countryName": "United Kingdom of Great Britain and Northern Ireland", "jids": 3, "created": "2019-10-18T00:04:00+02:00" },
                { "country": "se", "countryName": "Sweden", "jids": 3, "created": "2019-10-18T17:34:00+02:00" },
                { "country": "de", "countryName": "Germany", "jids": 1, "created": "2019-10-18T00:22:00+02:00" },
                { "country": "in", "countryName": "India", "jids": 1, "created": "2019-10-18T09:07:00+02:00" },
                { "country": "fi", "countryName": "Finland", "jids": 1, "created": "2019-10-18T11:28:00+02:00" },
                { "country": "no", "countryName": "Norway", "jids": 1, "created": "2019-10-19T10:08:00+02:00" },
                { "country": "be", "countryName": "Belgium", "jids": 1, "created": "2019-10-20T23:21:00+02:00" }], "Incorrect Countries: " + JSON.stringify(response.countries));
            assert.equal(response.totals.countries, 8, "Incorrect Countries count: " + response.totals.countries);
            assert.equal(response.totals.jids, 39, "Incorrect Jids count: " + response.totals.jids);
            assert.equal(response.totals.unique, 15, "Incorrect Unique Jids count: " + response.totals.unique);
            assert.equal(response.errorCode, null, "Incorrect ErrorCode: " + response.errorCode);
            assert.equal(response.error, null, "Incorrect ErrorMessage: " + response.error);
        });
    });
});

var saveUser = async function (database, firstName, lastName) {
    var username = (firstName + "_" + lastName).replace(/[ \.\-æøåÆØÅü]/g, "_").toLowerCase();
    var salt = crypto.randomBytes(32);
    var user = {
        id: uuid.v4(),
        name: firstName + " " + lastName,
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
