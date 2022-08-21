'use strict';

import moment from 'moment';
import * as config from './config.js';
import { escapeOrNull } from './functions.js';

const timestampFormat = "YYYY-MM-DD HH:mm:ss";

export async function getStats(req, res) {
    var database = await res.locals.db;

    var result = {
        users: [],
        countries: [],
        totals: {
            jids: 0,
            unique: 0,
            countries: 0,
            change: {
                jids: 0,
                unique: 0,
                countries: 0
            }
        },
        error: null,
        errorCode: null
    };

    try {
        const nowTimestamp = moment();
        const sinceTimestamp = moment(nowTimestamp).subtract(15, 'minutes');

        if (!req.params) {
            req.params = {}
        }
        let location = escapeOrNull(req.params.location);

        if (location === null || location === undefined) {
            result.errorCode = "NO_LOCATION";
            result.error = "No location specified";
        }
        else {
            result.users = await getUserStats(database, location, nowTimestamp);
            //console.log("Users:\n"+nowTimestamp.format('YYYY-MM-DD HH:mm:ss')+"\n"+JSON.stringify(result.users, null, 2));
            const usersBefore = await getUserStats(database, location, sinceTimestamp);
            //console.log("Before:\n"+sinceTimestamp.format('YYYY-MM-DD HH:mm:ss')+"\n"+JSON.stringify(usersBefore, null, 2));

            result.users.forEach(current => {
                const earlier = usersBefore.find(user => user.userid === current.userid);

                if (earlier) {
                    current.change = {
                        jids: current.jids - earlier.jids,
                        countries: current.countries - earlier.countries,
                        position: earlier.position - current.position
                    };
                }
                else {
                    current.change = {
                        jids: current.jids,
                        countries: current.countries,
                        position: current.position
                    };
                }

                result.totals.jids += current.jids;
            });
            var jidsBefore = 0;
            usersBefore.forEach(item => jidsBefore += item.jids);
            result.totals.change.jids = result.totals.jids - jidsBefore;

            result.totals.unique = await getUniqueJidCount(database, location, nowTimestamp);
            const uniqueJidsBefore = await getUniqueJidCount(database, location, sinceTimestamp);
            result.totals.change.unique = result.totals.unique - uniqueJidsBefore;

            result.countries = await getCountryStats(database, location, nowTimestamp);
            const countriesBefore = await getCountryStats(database, location, sinceTimestamp);
            result.countries.forEach(current => {
                const earlier = countriesBefore.find(country => country.country === current.country);

                if (earlier) {
                    current.change = {
                        jids: current.jids - earlier.jids,
                        position: earlier.position - current.position
                    };
                }
                else {
                    current.change = {
                        jids: current.jids,
                        position: current.position
                    };
                }
            });
            result.totals.countries = result.countries.length;
            result.totals.change.countries = result.totals.countries - countriesBefore.length;
        }
    }
    catch (exception) {
        result.errorCode = "EXCEPTION";
        result.error = exception;
        if (config.isLoggingErrors()) {
            console.log("Stats.getStats exception: " + exception);
        }
    }

    res.send(result);
}

async function getUniqueJidCount(database, location, nowTimestamp) {
    const row = await database.get(
        'select count(distinct jid) as jids ' +
        'from jid ' +
        'where jid.location=$location and jid.created<=$timestamp', {
        '$location': location,
        '$timestamp': nowTimestamp.format(timestampFormat)
    });
    return row.jids;
}

async function getCountryStats(database, location, timestamp) {
    const stats = [];
    const rows = await database.all(
        'select ' +
        '  count(distinct jid) as jids, ' +
        '  country.code, ' +
        '  country.country, ' +
        '  min(created) as created ' +
        'from jid ' +
        'join country on (jid.country=country.code) ' +
        'where jid.location=$location and jid.created<=$timestamp ' +
        'group by country.code, country.country ' +
        'order by jids desc, created, country.code', {
        '$location': location,
        '$timestamp': timestamp.format(timestampFormat)
    });
    var position = 1;
    for (const row of rows) {
        stats.push({
            position: position,
            country: row.code,
            countryName: row.country,
            jids: row.jids,
            created: row.created
        });
        position++;
    }

    return stats;
}

async function getUserStats(database, location, timestamp) {
    const stats = [];

    const rows = await database.all(
        'select ' +
        '  user.id as userid, ' +
        '  user.name, ' +
        '  count(distinct jid.jid) as jids, ' +
        '  count(distinct jid.country) as countries, ' +
        '  max(jid.created) as latest ' +
        'from user ' +
        'left join jid on (jid.userid=user.id) ' +
        'where user.location=$location and (jid.created is null or jid.created<=$timestamp) ' +
        'group by user.id, user.name ' +
        'order by jids desc, countries, latest, user.name', {
        '$location': location,
        '$timestamp': timestamp.format(timestampFormat)
    });
    var position = 1;
    for (const row of rows) {
        stats.push({
            position: position,
            userid: row.userid,
            name: row.name,
            jids: row.jids,
            countries: row.countries,
            latest: row.latest
        });
        position++;
    }

    return stats;
}
