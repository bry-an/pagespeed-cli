const isNilOrEmpty = (x) => {
    if (x === null || x === undefined) {
        return true;
    }
    if (typeof x === 'object') {
        if (Array.isArray(x)) {
            return x.length === 0;
        }
        return Object.keys(x).length === 0;
    }
    if (typeof x === 'string') {
        return x.length === 0;
    }
    return false;
}

export const isntNilOrEmpty = (x) => !isNilOrEmpty(x);

export const defaultTo = (fallback) => (x) => {
    if (isNilOrEmpty(x)) {
        return fallback;
    }
    return x;
}

export const defaultToDash = defaultTo('-');

const multiplyBy100 = (fallback) => (x) => {
    if (typeof x !== 'number') {
        return fallback;
    }
    return x * 100;
}

export const safeMultiplyBy100 = multiplyBy100('-')

export const ensureArray = (x) => {
    if (!Array.isArray(x)) {
        return [x];
    }
    return x;
}

export const averageOfProp = (key, arr = []) => arr.length === 0
    ? 0
    : arr.reduce((acc, obj) => acc + parseInt(obj[key]), 0) / arr.length;

export const averageOfPropPercent = (key, arr = []) => arr.length === 0
    ? 0
    : safeMultiplyBy100(arr.reduce((acc, obj) => (acc + obj[key]), 0) / arr.length);

export const cond = (arr) => (...args) => {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][0](...args)) {
            return arr[i][1](...args);
        }
    }
    return undefined;
}


export const highestOfProp = (key, arr = []) => arr.sort((a, b) => b[key] - a[key])[0] || {};

export const props = (props, obj) => props.map((prop) => obj[prop]);

export const propsOr = (fallback, props, obj) => props.map((prop) => obj[prop] || fallback);
