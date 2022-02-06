import validator from 'validator';

export function escapeOrNull(string, toLowerCase) {
    if (string === null || string === undefined) {
        return string;
    }
    else {
        var value = validator.escape(string);
        if (toLowerCase===true) {
            value = value.toLowerCase()
        }
        return value;
    }
}
