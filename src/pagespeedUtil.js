import path from 'path';
import { EMPTY_DATASET } from './constants.js';
import { writeFileAsJson } from './fsUtil.js';

export const createNewDataset = (filepath) => {
    return writeFileAsJson(filepath, EMPTY_DATASET);
};
