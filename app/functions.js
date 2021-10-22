import validator from 'validator';

export function escape(string) {
    if (string === null || string === undefined) {
        return string;
    }
    else {
        return validator.escape(string);
    }
}
