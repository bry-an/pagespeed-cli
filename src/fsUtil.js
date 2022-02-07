import fs from 'fs';

export const readFileAsJson = async (filePath) => {
    let file = '';
    try {
        file = await fs.promises.readFile(filePath, 'utf8');
    } catch (e) {
        throw new Error('get file error', e);
    }
    return JSON.parse(file);
};

export const writeFileAsJson = async (filePath, data) => {
    const jsonString = JSON.stringify(data);

    try {
        return await fs.promises.writeFile(filePath, jsonString);
    } catch (e) {
        throw new Error('write file error', e);
    }
};

export const checkFile = async (filePath) => {
    try {
        await fs.promises.stat(filePath); 
    } catch {
        return false;
    }
    return true;
};

