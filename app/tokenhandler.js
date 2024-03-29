'use strict';

import validator from 'validator';
import crypto from 'crypto';
import * as config from './config.js';
import jwt from 'jsonwebtoken';

let cache = {
    privateKey: null,
    publicKey: null
};

export function generateSalt() {
    return crypto.randomBytes(32).toString('base64');
}

export async function generateToken(database, account, password) {
    if (!cache.privateKey) {
        cache.privateKey = await config.getValue(database, 'privateKey');
    }

    //Generate payload
    let payload = {
        id: account.id,
        name: account.name,
        type: account.type
    }
    if (account.type === 'user') {
        payload.location = account.location;
    }
    else if (account.type === 'admin') {
        payload.username = account.email;
    }

    //Validate password
    let passwordValid = password != null;
    if (account.password && account.password.length >= 8 && account.salt && account.salt.length >= 40 && password) {
        let passwordHash = hashPassword(password, account.salt);

        passwordValid = account.password === passwordHash.hashValue;
    }

    if (passwordValid) {
        // Token signing options
        let signOptions = {
            expiresIn: "48h",
            algorithm: "RS256"
        };

        return jwt.sign(payload, cache.privateKey, signOptions);
    }
    else {
        return null;
    }
}

export function hashPassword(password, salt) {
    if (!salt || validator.isEmpty(salt)) {
        salt = generateSalt();
    }

    return {
        salt: salt,
        hashValue: password ? crypto.pbkdf2Sync(password, salt, 100000, 128, 'sha512').toString('base64') : null
    }
}

export async function verifyToken(req, res) {
    let database = await res.locals.db;

    let result = {
        valid: false,
        token: null,
        error: null,
        errorCode: null
    }

    try {
        let token = await decodeToken(database, req, null);
        if (token.valid) {
            result.valid = true;
            result.token = token.decoded;
        }
        else {
            result.error = token.error;
            result.errorCode = token.errorCode;
        }
    }
    catch (exception) {
        if (exception.name === "JsonWebTokenError" || exception.name === "TokenExpiredError") {
            result.error = `${exception.name}: ${exception.message}`;
            if (!result.errorCode) {
                result.errorCode = "TOKEN_INVALID";
            }
        }
        else {
            result.error = exception;
            if (!result.errorCode) {
                result.errorCode = "EXCEPTION";
            }
        }
        if (config.isLoggingErrors()) {
            console.log("Tokenhandler.verifyToken exception: " + exception);
        }
    }

    res.send(result);
}

export async function decodeAdminToken(database, req) {
    return decodeToken(database, req, 'admin');
}

export async function decodeUserToken(database, req) {
    return decodeToken(database, req, 'user');
}

async function decodeToken(database, req, tokenType) {
    let result = {
        valid: false,
        decoded: null,
        error: null,
        errorCode: null
    }
    try {
        if (!cache.publicKey) {
            cache.publicKey = await config.getValue(database, 'publicKey');
        }

        if (!req || !req.headers || !req.headers.authorization) {
            throw new Error("No authorization header found!");
        }
        else {
            let token = validator.escape(req.headers.authorization);
            if (!validator.isEmpty(token) && token.includes(" ")) {
                token = token.split(' ')[1];
            }

            // Token signing options
            let verifyOptions = {
                expiresIn: "48h",
                algorithm: ["RS256"]
            };

            if (jwt.verify(token, cache.publicKey, verifyOptions)) {
                setDecodedResult(token, tokenType, result);
            }
        }
    }
    catch (exception) {
        if (config.isLoggingErrors()) {
            console.log("Tokenhandler.decodeToken exception: " + exception);
        }

        result.error = exception.message;
        result.errorCode = "EXCEPTION";
    }

    return result;
}

function setDecodedResult(token, tokenType, result) {
    const decoded = jwt.decode(token, { complete: true });

    if (tokenType === null || tokenType === decoded.payload.type) {
        result.valid = true;
        result.decoded = decoded.payload;
    }
    else {
        result.error = `Invalid token type: ${token.type}`;
        result.errorCode = 'INVALID';
    }
}

export function setTokenErrorCode(result, token) {
    result.error = token.error;
    if (token.error === "No authorization header found!") {
        result.errorCode = "MISSING AUTHORIZATION";
    }
    else {
        result.errorCode = "INVALID TOKEN";

        if (token.error === "jwt expired") {
            result.errorCode = "TOKEN EXPIRED";
            result.error = token.error;
        }
    }
}

export async function clearCache() {
    cache = {};
}
