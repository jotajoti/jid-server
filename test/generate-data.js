'use strict';

import crypto from 'crypto';
import moment from 'moment';
import randomNumber from 'random-number-csprng';
import * as uuid from 'uuid';
import * as jidDatabase from '../app/database.js';
import * as config from '../app/config.js';

const jidValues = [
    ['1bd11a', '3my95n', '1fr12b', '1ng43z', '1ng79r', '1za01h', '1za09d', '1za17w', '1za41d', '1za55v', '1za73d', '2ae31y', '2ae45e', '2dz47c', '2eg21x', '2eg51e', '2eg71h', '2gb71b', '2lb93m', '2ps79a', '2tn95x', '3au13f', '3au19f', '3au25y', '3au29t', '3au37h', '3au37v', '3au43v', '3au43z', '3au53k', '3au61e', '3au65z', '3au77c', '3au79n', '3au83r', '3au89h', '3au93w', '3bd57r', '3bd65m', '3eg13m', '3gl13f', '3id01p', '3id19f', '3id21d', '3id29m', '3id29x', '3id31a', '3id33x', '3id37x', '3id39t', '3id41e', '3id41f', '3id45c', '3id45r', '3id46m', '3id51d', '3id53z', '3id55f', '3id57b', '3id57e', '3id57u', '3id59e', '3id63k', '3id65a', '3id65g', '3id65r', '3id67b', '3id69c', '3id69g', '3id73d', '3id85x', '3id91y', '3id91z', '3id92h', '3id95v', '3id95z', '3id97v', '3in15m', '3in67f', '3ir97s', '3kr57w', '3kr65d', '3lk37n', '3lk79t', '3my25b', '3my31r', '3my45r', '3my56c', '3my57f', '3my57z', '3my65g', '3my69n', '3my81b', '3my87x', '3my95m', '3my98f', '3my99c', '3nz23m', '3nz39h', '3pf05n', '3ph23d', '3ph23z', '3ph34d', '3ph39d', '3ph69z', '3pk13f', '3pk27p', '3vn54f', '4au67d', '4gg58w', '4ru67k', '5at37u', '5be31g', '5bg53k', '5bo13q', '5cy05u', '5cy49k', '5cy57y', '5cz69c', '5cz91g', '5de69c', '5de77p', '5dk03m', '5dk99t', '5fi15e', '5fi59d', '5fj26v', '5fo03x', '5gb03b', '5gb03w', '5gb07g', '5gb09e', '5gb11w', '5gb13b', '5gb15d', '5gb15r', '5gb17b', '5gb17t', '5gb19r', '5gb21u', '5gb23u', '5gb27a', '5gb27t', '5gb31c', '5gb33z', '5gb37g', '5gb37h', '5gb39b', '5gb39z', '5gb41d', '5gb41z', '5gb45v', '5gb49u', '5gb51c', '5gb53e', '5gb55c', '5gb55w', '5gb57t', '5gb59n', '5gb61g', '5gb61x', '5gb67w', '5gb69p', '5gb71g', '5gb71t', '5gb73h', '5gb75t', '5gb77d', '5gb79a', '5gb81v', '5gb81z', '5gb85c', '5gb87y', '5gb89p', '5gb91h', '5gb91v', '5gb95z', '5gb99d', '5gi41h', '5gp51c', '5gr01m', '5gr10m', '5gr75n', '5ie57c', '5it23e', '5it71b', '5lk59t', '5mt29y', '5mt69w', '5mt73a', '5nl59p', '5no25k', '5no51z', '5no61t', '5no71r', '5no81e', '5no89z', '5no97e', '5no98n', '5pl15m', '5pl25a', '5pl67c', '5pt09y', '5pt11p', '5pt23a', '5pt31y', '5pt35z', '5pt41g', '5pt43f', '5pt57e', '5pt79x', '5pt83g', '5pt99w', '5rs25k', '5se27t', '5se33p', '5se33s', '5se51u', '5se53z', '5se69x', '5se71y', '5se73u', '5se75i', '5se79v', '5se89g', '5se93g', '5tr16y', '5tr31v', '5tr55k', '5tr79u', '6ar31r', '6bo19a', '6bo31c', '6bo39k', '6bo54d', '6bo55c', '6bo73h', '6bo89m', '6bo99d', '6br01n', '6br21m', '6br79w', '6ca27n', '6ca73a', '6ca85t', '6ca93n', '6ci07c', '6co01h', '6co13d', '6co17z', '6co19r', '6co33e', '6co41h', '6co41y', '6co47x', '6co49n', '6co55g', '6co73h', '6co79z', '6cr27b', '6cr89k', '6cy57y', '6ec29v', '6mx07f', '6mx11m', '6mx17b', '6mx21n', '6mx46d', '6mx75b', '6mx75m', '6mx83z', '6mx87p', '6mx97w', '6pa41a', '6pe27y', '6pr47d', '6py05e', '6tt51g', '6us01r', '6us35y', '6us45c', '6us57h', '6us79g', '6us79o', '6us87m', '6us89a', '6us91y', '6ve37x', '6ve55f', '6ve75a', '6ve75h', '6ve95w', '7gb00g', '7gb63n', '7hu89g', '7hu98g'],
    ['1ci55u', '1na75b', '1za47b', '2eg19m', '2lb73r', '3au19n', '3au35b', '3au49n', '3au61h', '3au63b', '3au99z', '3bd15e', '3id17g', '3id39x', '3id47a', '3id49v', '3id59p', '3id63z', '3id79m', '3id85v', '3id87f', '3id99a', '3in33w', '3my35b', '3my45c', '3my53d', '3nz17r', '3nz88w', '3ph09w', '3pk07b', '3pk27v', '3tw01g', '5ba09t', '5cy09e', '5cy15x', '5cy35c', '5cy75v', '5cy99r', '5de15x', '5dk89r', '5fi93b', '5fr39c', '5gb17u', '5gb31h', '5gb35n', '5gb49t', '5gb59b', '5gb65p', '5gb71b', '5gb73x', '5gb77t', '5gb81u', '5gb83a', '5gb83w', '5gb95d', '5it07b', '5it99a', '5je83g', '5mt51p', '5mt67x', '5nl27k', '5no29c', '5no35x', '5no83p', '5pl05b', '5pt15x', '5pt85c', '5pt97p', '5se33c', '5se51h', '5se61h', '5se61m', '5se75z', '6bo67e', '6ca41v', '6co41r', '6co47z', '6mx01d', '6mx35e', '6mx41p', '6mx61k', '6mx61w', '6tt83w', '6us15n', '6us17h', '6us19v', '6us29d', '6us49d', '6us99e', '6ve01k', '7gb85r'],
    ['1mu45h', '3au25x', '3au67d', '3au85g', '3id01x', '3id03p', '3id13a', '3id51u', '3id67h', '3id89r', '3id95t', '3id97u', '3id97x', '3nz41t', '3nz67b', '3ph51m', '3tw77g', '4au61e', '5ch99d', '5dk27t', '5dk33e', '5fi76z', '5gb21m', '5gb27c', '5gb51t', '5gb53b', '5gb59u', '5gb61n', '5gb67e', '5gb69n', '5gb81m', '5gb91t', '5gb95f', '5gb97p', '5nl55k', '5no79y', '5pl37k', '5pt19y', '5pt35c', '5pt55v', '5sa47c', '5se43f', '5se51y', '5se59b', '5sy35h', '6bo89x', '6ca49k', '6ca49z', '6ca55k', '6ca63z', '6co05g', '6co99b', '6cr17a', '6us79z'],
    ['3au23f', '3au33k', '3au39p', '3au59f', '3id37f', '3id59k', '3id97c', '3lk59t', '5dk12j', '5gb79p', '5gb81h', '5rs93d', '5se73h', '5si09y', '6bo27k', '6ca97z', '6co89t', '6us28r'],
    ['3bd19k', '3id47t', '3id53c', '3id93d', '3nz05k', '3ph63h', '4ua77c', '5cy95n', '5gb33t', '5gb44d', '5gb93t', '5gb99h', '5nl59e', '5se13k', '6ca49b', '6co13q', '6us13t'],
    ['3id41y', '3id69m', '3id55w', '3id59g', '3id71g', '5gb11f', '5gb27r', '5gb53m', '5gb57u', '5gb79n', '6br59c', '6tt51d'],
    ['3id17a', '3my23g', '3id09u', '5tr31y', '3nz23h', '5gb43w', '5mt75n', '5no05k', '5tr39f'],
    ['3my89f', '3my95z', '5gb45c', '6cw11k', '5se21u', '5no07v', '5dk01t'],
    ['3id07b', '5gb25d', '3in31r', '5gb69y'],
    ['5dk01d', '5se09e']
];

async function run() {
    //Database access
    const adminCount = process.env.admins || 3;
    const years = process.env.years || 1;
    const locationCount = process.env.locations || 5;
    const userCount = process.env.users || 100;
    const jidCount = process.env.jids || 2500;
    let startTime = process.env.start || '2022-10-14 16:00';
    startTime = moment(startTime, 'YYYY-MM-DD HH:mm');
    const hours = process.env.hours || 48;
    const path = process.env.database || 'jiddata.db';

    config.setLogLevel('INFO');
    const database = await jidDatabase.createDatabase({
        databaseFile: path,
        traceMigration: false
    });
    await config.checkConfig({
        database: database
    });

    const admins = await generateAdmins(database, adminCount, startTime);
    const locations = await generateLocations(database, locationCount, years, admins, startTime);
    const userList = await generateUsers(database, userCount, locations, startTime);
    await generateJids(database, userList, jidCount, startTime, hours);

    if (config.isLoggingInfo()) {
        console.log('\nDone');
    }
    database.close();
}

async function generateJids(database, userList, jidCount, startTime, hours) {
    if (config.isLoggingInfo()) {
        console.log('\nGenerating jids');
    }
    const saved = [];

    let i = 1;
    while (i <= jidCount) {
        //Some skilllists might be empty - so we keep trying until we find one
        let user = null;
        while (user == null) {
            const usersWithSkill = userList.bySkill[await randomNumber(0,9)];
            if (usersWithSkill.length>1) {
                user = usersWithSkill[await randomNumber(0,usersWithSkill.length-1)];
            }
            else if (usersWithSkill.length===1) {
                user = usersWithSkill[0];
            }
        }

        const jidcode = await generateJidCode(jidValues, saved, user.location+user.name);
        const created = moment(startTime).add(await randomNumber(0, hours * 60 * 60 + 1), 'seconds').toISOString();

        await database.run('insert into jid (id, userid, location, jid, country, created) values (?,?,?,?,?,?)',
            uuid.v4(), user.id, user.location, jidcode, jidcode.substring(1, 3), created);
        saved.push(jidcode + user.name);

        if (config.isLoggingInfo()) {
            console.log(`jid ${i}: ${jidcode} ${user.location} ${user.name}`);
        }
        i++;
    }
}

async function generateJidCode(jidValues, saved, name) {
    let jidcode = '';

    const jids = jidValues[await randomNumber(0, 9)];
    if (jids.length > 0) {
        const innerIndex = await randomNumber(0, jids.length - 1);
        jidcode = jids[innerIndex].toString();
    }

    let attempts = 0;
    while (saved.includes(`${jidcode} ${name}`) && attempts < 10) {
        const number = await randomNumber(10, 99);
        jidcode = jidcode.substring(0, 3) + number.toString() + jidcode.substring(5);
        attempts++;
    }

    saved.push(`${jidcode} ${name}`);
    return jidcode;
}

async function generateAdmins(database, count, startTime) {
    if (config.isLoggingInfo()) {
        console.log('\nGenerating admins');
    }
    const firstNames = ['Zaphod','Arthur','Marvin','Fenchurch','Trillian','Tricia','Slartibartfast','Ford','Prostetnic'];
    const lastNames = ['Beeblebrox','Dent','Paranoid','Android','McMillan','Astra','Magrathean','Prefect','Vogon','Jeltz'];

    const adminList = {
        ids: [],
        emails: []
    };

    let i = 1;
    while (i <= count) {
        const firstName = firstNames[await randomNumber(0,firstNames.length-1)];
        const lastName = lastNames[await randomNumber(0,lastNames.length-1)];
        const emailName = firstName.toLowerCase();
        const emailDomain = `@${lastName}.joti`.toLowerCase();
        const email = `${emailName}${emailDomain}`;
        const salt = crypto.randomBytes(32).toString('base64');
        const admin = {
            id: uuid.v4(),
            email: email,
            password: crypto.pbkdf2Sync(crypto.randomBytes(32).toString('base64'), salt, 1, 128, 'sha512').toString('base64'),
            salt: salt,
            name: `${firstName} ${lastName}`,
            phone: '+'+Math.random().toString().slice(2,12),
            created: moment(startTime).add(await randomNumber(0, 60*60), 'seconds').toISOString()
        }
        if (adminList.emails.includes(admin.email)) {
            let postfix = 1;
            while (adminList.emails.includes(`${emailName}-${postfix}${emailDomain}`)) {
                postfix++;
            }
            admin.email = `${emailName}-${postfix}${emailDomain}`;
            admin.name = `${admin.name}-${postfix}`;
        }
        while (adminList.ids.includes(admin.id)) {
            admin.id = uuid.v4();
        }

        await database.run('replace into admin (id, email, password, salt, name, phone, created) values (?,?,?,?,?,?,?)',
            admin.id, admin.email, admin.password, admin.salt, admin.name, admin.phone, admin.created);

        adminList.ids.push(admin.id);
        adminList.emails.push(admin.email);

        if (config.isLoggingInfo()) {
            console.log(`admin ${i}: ${admin.name} <${admin.email}>`);
        }
        i++;
    }

    return adminList;
}

async function generateLocations(database, count, years, admins, startTime) {
    if (config.isLoggingInfo()) {
        console.log('\nGenerating locations');
    }
    const locationNames = ['Magrathea','Frogstar World B','Milliways','Kakrafroon Kappa','Earth','Krikkit','Brontitall'];
    const locationPostfix = ['Jamboree','Joti','Jota','Jota/Joti','Gathering'];
    const saved = [];
    const locations = [];

    for (let i=0;i<years;i++) {
        let year = moment().year()-i;
        let j = 1;
        while (j <= count) {
            const name = locationNames[await randomNumber(0,locationNames.length-1)]+' '+locationPostfix[await randomNumber(0,locationPostfix.length-1)];
            const jidcode = await generateJidCode(jidValues, saved, '');
            const location = {
                id: uuid.v4(),
                year: year,
                jid: jidcode,
                country: jidcode.substring(1, 3),
                name: name,
                owner: admins.ids[await randomNumber(0,admins.ids.length-1)],
                created: moment(startTime).add(await randomNumber(0, 60*60), 'seconds').toISOString()
            }

            await database.run('replace into location (id, year, jid, country, name, owner, created) values (?,?,?,?,?,?,?)',
                location.id, location.year, location.jid, location.country, location.name, location.owner, location.created);

            locations.push(location);

            if (config.isLoggingInfo()) {
                console.log(`Location ${j} ${location.id}: Year ${location.year} Owner ${location.owner} JID ${location.jid} ${location.name}`);
            }
            j++;
        }
    }

    return locations;
}

async function generateUsers(database, count, locations, startTime) {
    if (config.isLoggingInfo()) {
        console.log('\nGenerating users');
    }
    const firstNames = [
        'Zaphod','Arthur','Marvin','Fenchurch','Trillian','Tricia','Slartibartfast','Ford','Prostetnic',
        'Agrajag','Alice','Almighty Bob','Anjie','Blart','Colin','Constant','Dr.','Dan','Deep','Dionah',
        'Eccentrica','Eddie','Effrafax','Enid','Eric','Frankie','Benjy','Frat','Gag','Gail','Gargravarr',
        'Gogrilla','Googleplex','Grunthos','Heimdall','Thor','Hotblack','Oolon','Phouchg','Loonquawl'
    ];
    const lastNames = [
        'Beeblebrox','Dent','Paranoid','Android','McMillan','Astra','Magrathean','Prefect','Vogon','Jeltz',
        'Allitnils','Megafreighter','Aseed','Versenwald III','Mown','Streetmentioner','Thought','Carlinton',
        'Housney','Disaster Area','Gallumbits','Kapelsen','Bartlett','Mouse','Gadz','Halfrunt','Andrews',
        'Mincefriend','Starthinker','Flatulent','Desiato','Colluphid','Hudson','Hooli','McKenna','Steafel'
    ];

    const userList = {
        ids: [],
        names: [],
        bySkill: [[], [], [], [], [], [], [], [], [], []]
    };
    let i = 1;
    while (i <= count) {
        const firstName = firstNames[await randomNumber(0,firstNames.length-1)];
        const lastName = lastNames[await randomNumber(0,lastNames.length-1)];
        const salt = crypto.randomBytes(32).toString('base64');
        const user = {
            id: uuid.v4(),
            location: locations[await randomNumber(0,locations.length-1)].id,
            name: `${firstName} ${lastName}`,
            password: crypto.pbkdf2Sync(crypto.randomBytes(32).toString('base64'), salt, 1, 128, 'sha512').toString('base64'),
            salt: salt,
            created: moment(startTime).add(await randomNumber(0, 60*60), 'seconds').toISOString()
        }
        if (userList.names.includes(user.name)) {
            let postfix = 1;
            while (userList.names.includes(`${user.name}-${postfix}`)) {
                postfix++;
            }
            user.name = `${user.name}-${postfix}`;
        }
        while (userList.ids.includes(user.id)) {
            user.id = uuid.v4();
        }

        await database.run('replace into user (id, location, name, password, salt, created) values (?,?,?,?,?,?)',
            user.id, user.location, user.name, user.password, user.salt, user.created);

        userList.ids.push(user.id);
        userList.names.push(user.name);

        const skill = await generateSkill();
        userList.bySkill[skill].push(user);

        if (config.isLoggingInfo()) {
            console.log(`user ${i}: ${user.name}`);
        }
        i++;
    }

    return userList;
}

async function generateSkill() {
    let skill = await randomNumber(0, 144);
    if (skill < 1) {
        skill = 0;
    }
    else if (skill < 2) {
        skill = 1;
    }
    else if (skill < 3) {
        skill = 2;
    }
    else if (skill < 5) {
        skill = 3;
    }
    else if (skill < 8) {
        skill = 4;
    }
    else if (skill < 21) {
        skill = 5;
    }
    else if (skill < 34) {
        skill = 6;
    }
    else if (skill < 55) {
        skill = 7;
    }
    else if (skill < 89) {
        skill = 8;
    }
    else {
        skill = 9;
    }
    return skill;
}

run();
