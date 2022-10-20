import validator from 'validator';

export function escapeOrNull(string, toLowerCase) {
    if (string === null || string === undefined) {
        return string;
    }
    else {
        let value = validator.escape(string);
        if (toLowerCase===true) {
            value = value.toLowerCase()
        }
        return value;
    }
}

export function ensureRequestHasContent(req) {
    if (!req.body) {
        req.body = {}
    }
    if (!req.params) {
        req.params = {}
    }
}