import validator from 'validator';

export function escapeOrNull(string) {
    if (string === null || string === undefined) {
        return string;
    }
    else {
        return validator.escape(string);
    }
}
