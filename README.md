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
By default CORS will not be enabled. If you run the server on a different port than UI (for local testing) you should set the cors parameter to true (see below).

You can change the database path by setting the process variable `database`. The port can be set with variable `port`. Use `info=true` for additional logging and enable CORS with `cors=true`:
```console
pi@raspberry:~$ export database="jidserver.db"
pi@raspberry:~$ export port=5000
pi@raspberry:~$ export info=true
pi@raspberry:~$ export cors=true
pi@raspberry:~$ yarn run start

Using database 'jidserver.db'
Enabling Cross-origin resource sharing (CORS) on the server
Server running on port 5000!
```

## Run tests
The test suite can be run by executing `yarn run test` after installation.

## Generate testdata
In order to test [jid-ui](https://github.com/jotajoti/jid-ui) with the jid-server you can generate some random data in your jid-server by running `yarn run test-data`.

This will by default generate 5 admins, 100 users and enter 2.500 jid codes in the system.

These defaults can be changed if you for instance would like to have 3 users who entered 7 jids:
```console
pi@raspberry:~$ export admins=2
pi@raspberry:~$ export users=3
pi@raspberry:~$ export jids=7
pi@raspberry:~$ yarn run generate-test-data

Generating admins
admin 1: jacques@juncker.joti
admin 2: françois-xavier@von der leyen.joti

Generating users
user 1: johann_hartwig_ernst_friis
user 2: niels_rosenkrantz
user 3: ludvig_von_bernstorff

Generating jids
jid 1: 6us19v ludvig_von_bernstorff
jid 2: 5dk01d ludvig_von_bernstorff
jid 3: 5gb45c ludvig_von_bernstorff
jid 4: 5gb79n johann_hartwig_ernst_friis
jid 5: 3id69m niels_rosenkrantz
jid 6: 6ca97z johann_hartwig_ernst_friis
jid 7: 3au59f ludvig_von_bernstorff

Done
```
