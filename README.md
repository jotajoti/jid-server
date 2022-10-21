# jid-server 
[![codecov](https://codecov.io/gh/jotajoti/jid-server/branch/master/graph/badge.svg)](https://codecov.io/gh/jotajoti/jid-server)
[![jid-server](https://circleci.com/gh/jotajoti/jid-server.svg?style=shield)](https://app.circleci.com/pipelines/github/jotajoti/jid-server)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=jotajoti_jid-server&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=jotajoti_jid-server)

API server for storing jid codes, to be used by [jid-ui](https://github.com/jotajoti/jid-ui).

The jid-server uses an internal SQLite database for storing data in a file.

## Installation
Requires a recent version of [NodeJS](https://nodejs.org/en/download/package-manager/), [NPM](https://www.npmjs.com/get-npm) and [Yarn](https://yarnpkg.com/getting-started/install).

Download from GitHub and install dependencies using `yarn install`.

This will also install the required SQLite database software.

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

This will by default generate 3 admins, 5 locations, 100 users and enter 2.500 jid codes in the system for this year.

These defaults can be changed if you for instance would like to have 3 users who entered 7 jids on 2 locations in 2 years:
```console
pi@raspberry:~$ export admins=2
pi@raspberry:~$ export locations=10
pi@raspberry:~$ export users=3
pi@raspberry:~$ export jids=7
pi@raspberry:~$ yarn run generate-test-data

Generating admins
admin 1: Slartibartfast Astra <slartibartfast@astra.joti>
admin 2: Fenchurch Vogon <fenchurch@vogon.joti>

Generating locations
Location 1 36a31c02-a2d7-43eb-9c65-b98940950ef9: Year 2022 Owner 1351ea3d-2bdc-4218-bf71-9f0c8332c05b JID 3id17a Kakrafroon Kappa Jota
Location 2 049a2785-1ea1-4da5-955f-2384c53d5823: Year 2022 Owner 1351ea3d-2bdc-4218-bf71-9f0c8332c05b JID 5gb11f Frogstar World B Joti
Location 1 84d47a8f-b708-43db-af7c-44122d2a8787: Year 2021 Owner 1351ea3d-2bdc-4218-bf71-9f0c8332c05b JID 6bo89x Magrathea Jota
Location 2 d036b5b4-f22a-4d86-868c-02cbd0bd53a8: Year 2021 Owner e17d57d7-7cff-4e4d-9b3e-07a6cbcfd600 JID 5no05k Milliways Jota/Joti

Generating users
user 1: Blart Gadz
user 2: Anjie Paranoid
user 3: Oolon Mown

Generating jids
jid 1: 6mx46d 84d47a8f-b708-43db-af7c-44122d2a8787 Blart Gadz
jid 2: 6cw11k d036b5b4-f22a-4d86-868c-02cbd0bd53a8 Oolon Mown
jid 3: 3id97x 36a31c02-a2d7-43eb-9c65-b98940950ef9 Anjie Paranoid
jid 4: 5se59b d036b5b4-f22a-4d86-868c-02cbd0bd53a8 Oolon Mown
jid 5: 5gb27r 84d47a8f-b708-43db-af7c-44122d2a8787 Blart Gadz
jid 6: 6br59c 36a31c02-a2d7-43eb-9c65-b98940950ef9 Anjie Paranoid
jid 7: 5se09e 36a31c02-a2d7-43eb-9c65-b98940950ef9 Anjie Paranoid

Done
```
