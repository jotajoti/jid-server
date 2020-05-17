'use strict';

import * as config from './config.js';

export async function getStats(req, res) {
    var database = await res.locals.db;

    var result = {
        users: [],
        countries: [],
        totals: {
            jids: 0,
            unique: 0,
            countries: 0
        },
        error: null,
        errorCode: null
    };

    try {
        var rows = await database.all(
            'select ' +
            '  count(distinct jid.jid) as jids, ' +
            '  count(distinct jid.country) as countries, ' +
            '  user.id, ' +
            '  user.name ' +
            'from user ' +
            'left join jid on (jid.userid=user.id) ' +
            'group by user.id, user.name ' +
            'order by jids desc, countries, user.name');
        for (const row of rows) {
            result.users.push({
                name: row.name,
                jids: row.jids,
                countries: row.countries
            });
            result.totals.jids += row.jids;
        }

        var row = await database.get(
            'select count(distinct jid) as jids '+
            'from jid');
        result.totals.unique += row.jids;

        var rows = await database.all(
            'select '+
            '  count(distinct jid) as jids, '+
            '  country.code, '+
            '  country.country, '+
            '  min(created) as created '+
            'from jid '+
            'join country on (jid.country=country.code) '+
            'group by country.code, country.country '+
            'order by jids desc, created, country.code');
        for (const row of rows) {
            result.countries.push({
                country: row.code,
                countryName: row.country,
                jids: row.jids,
                created: row.created
            });
            result.totals.countries++;
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