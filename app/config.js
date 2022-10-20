'use strict';

import crypto from 'crypto';

export async function checkConfig(args) {
    const database = args.database;

    let privateKey = await getValue(database, 'privateKey');
    let publicKey = await getValue(database, 'publicKey');

    if (!privateKey || !publicKey) {
        if (isLoggingInfo()) {
            console.log("Config: Generating key pair for login tokens");
        }
        const keys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        privateKey = keys.privateKey;
        publicKey = keys.publicKey;

        await setValue(database, 'privateKey', privateKey);
        if (isLoggingInfo()) {
            console.log(`Private key saved: ${privateKey.replace(/\n/g, "").substring(1, 75)}...`);
        }

        await setValue(database, 'publicKey', publicKey);
        if (isLoggingInfo()) {
            console.log(`Public key saved: ${publicKey.replace(/\n/g, "").substring(1, 75)}...`);
        }
    }
}

export async function getValue(database, key) {
    const result = await database.get("select value from config where keyname=?", key);
    if (result) {
        return result.value;
    }
    else {
        return null;
    }
}

export async function setValue(database, key, value) {
    switch (key) {
        case 'privateKey':
        case 'publicKey':
          break;
        default: throw new Error('Unsupported key name');
    }
    await database.run("replace into config values (?,?)", key, value)
}

const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_ERROR =2;
let currentLogLevel = LOG_LEVEL_NONE;
export function isLoggingErrors() {
    return currentLogLevel>=LOG_LEVEL_ERROR;
}

export function isLoggingInfo() {
    return currentLogLevel>=LOG_LEVEL_INFO;
}

export function setLogLevel(logLevel) {
    switch (logLevel) {
        case "NONE":
            currentLogLevel = LOG_LEVEL_NONE;
            break;
        case "INFO":
            currentLogLevel = LOG_LEVEL_INFO;
            break;
        case "ERROR":
            currentLogLevel = LOG_LEVEL_ERROR;
            break;
    }
}
