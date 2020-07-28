# jid-server 
[![codecov](https://codecov.io/gh/jotajoti/jid-server/branch/master/graph/badge.svg)](https://codecov.io/gh/jotajoti/jid-server)
[![jid-server](https://circleci.com/gh/jotajoti/jid-server.svg?style=shield)](https://app.circleci.com/pipelines/github/jotajoti/jid-server)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=jotajoti_jid-server&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=jotajoti_jid-server)

API server for storing jid codes, to be used by [jid-ui](https://github.com/jotajoti/jid-ui).

The jis-server uses an internal SQLite data for storing data in a file.

## Installation
Requires a recent version of [NodeJS](https://nodejs.org/en/download/package-manager/), [NPM](https://www.npmjs.com/get-npm) and [Yarn](https://yarnpkg.com/getting-started/install).

Download from GitHub and install dependencies using `yarn install`.

This will also install the required SQLite database.

## Running jid-server
You start the server by executing `yarn run start`. By default the server listens in TCP port 4000 and stores data in the SQLite database file `jiddata.db`.

You can change the database path by setting the process variable `database` and the default port by setting the process variable `port` like this:
```console
pi@raspberry:~$ export database="jidserver.db"
pi@raspberry:~$ export port=5000
pi@raspberry:~$ yarn run start

Using database 'jidserver.db'
Server running on port 5000!
```

## Run tests
The test suite can be run by executing `yarn run test` after installation.

## Generate testdata
In order to test [jid-ui](https://github.com/jotajoti/jid-ui) with the jid-server you can generate some random data in your jid-server by running `yarn run test-data`.

This will by default generate 100 users and enter 2.500 jid codes in the system.

These defaults can be changed if you for instance would like to have 3 users who entered 7 jids:
```console
pi@raspberry:~$ export users=3
pi@raspberry:~$ export jids=7
pi@raspberry:~$ node test/generate-data.js

Generating users
user 1: carl_eduard_rotwitt
user 2: j_c__reedtz_thott
user 3: carl_christopher_georg_l_kke_rasmussen

Generating jids
jid 1: 5cy95n j_c__reedtz_thott
jid 2: 5gb83a carl_eduard_rotwitt
jid 3: 3id17a carl_christopher_georg_l_kke_rasmussen
jid 4: 5pl05b carl_christopher_georg_l_kke_rasmussen
jid 5: 6ca55k j_c__reedtz_thott
jid 6: 3id52a carl_christopher_georg_l_kke_rasmussen
jid 7: 4ua77c j_c__reedtz_thott
Done
```
