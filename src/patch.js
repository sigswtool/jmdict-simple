const path = require('path');
const fs = require('fs');
const fastJsonPatch = require('fast-json-patch');
const cloneDeep = require('clone-deep');
const { readJson, writeJson } = require('./utils.js')
const package = require('../package.json');

// Get the tag and file names from the command line (index 2 to 5).
const cmd = process.argv[2];
const file1 = process.argv[3];
const file2 = process.argv[4];
const file3 = process.argv[5];

const commands = ['create', 'apply', 'verify', 'verifyDeep'];
const dataFolder = '../data';
const releaseFolder = '../release';
const patchFolder = '../patches';
const patchExt = 'patch.json';
const jsonIndent = 2;
const minify = true;

/**
 * Runs the patch functions if the script is executed via npm run.
 */
function main() {

    console.log('*******************************************************************************');
    console.log(`Patch management for dictionary "${package.name}"`);
    console.log(`Version: ${package.version}`);
    console.log('*******************************************************************************');

    if (commands.includes(cmd) === false) {
        if (cmd) {
            console.log(`Unsupported command "${cmd}"`);
        } else {
            console.log(`Please supply a valid command.`);
        }
        return;
    }
    console.log(`Running command: ${cmd.toUpperCase()}`);
    console.log('*******************************************************************************');

    switch (cmd) {
        case 'apply':
            apply(file1, file2, file3, minify);
            break;
        case 'create':
            create(file1, file2, file3, minify);
            break;
        case 'verify':
            verify(file1, file2);
            break;
        case 'verifyDeep':
            verifyDeep(file1, file2);
            break;
    }
}

/**
 * Apply a patch file to a converted directory.
 * @param {string|object} original 
 * @param {string|object} patch
 * @param {string} modifiedFile
 * @param {boolean} [minify=false]
 * @return {Promise<object|null>} 
 */
async function apply(original, patch, modifiedFile, minify = false) {
    let originalData, patchData;
    if (typeof original === 'string') {
        const originalPath = path.join(__dirname, releaseFolder, original);
        originalData = await readJson(originalPath);
    } else {
        originalData = original;
    }
    if (!originalData || typeof originalData !== 'object') return null;
    if (typeof patch === 'string') {
        const patchPath = path.join(__dirname, patchFolder, patch);
        patchData = await readJson(patchPath);
    } else {
        patchData = patch;
    }
    if (!patchData || typeof patchData !== 'object') return null;
    let modifiedData;
    if (originalData.version !== patchData.version) {
        console.warn(`Original version ${originalData.version} does not match patch version ${patchData.version}!`);
        return null;
    }
    const target = typeof original === 'string' ? original : 'original object';
    try {
        console.log(`Cloning data from ${target}.`);
        modifiedData = cloneDeep(originalData);
    } catch (error) {
        console.error('Error cloning original data', error.message);
        return null;
    }
    if (!modifiedData || typeof modifiedData !== 'object') return null;
    try {
        console.log(`Applying ${patchData.operations.length} patch operations to ${target}.`);
        fastJsonPatch.applyPatch(modifiedData, patchData.operations);
    } catch (error) {
        console.error("Failed to apply patch.", error.message);
        return null;
    }
    if (modifiedData.words) {
        const keyOrder = patchData.order;
        const numKeys = keyOrder.length;
        console.log(`Restoring order of ${numKeys} patch keys.`);
        let words = modifiedData.words;
        const existingKeysLength = Object.keys(words).length;
        let totalOperations = numKeys + existingKeysLength; // Total operations for progress
        let reorderedCount = 0;
        let removedCount = 0;
        let progressInterval = Math.max(1, Math.floor(totalOperations / 100)); // Ensure some updates
        let completedOperations = 0;
        let i = 0;
        //First cache all existing keys in the required order
        const orderedEntries = [];
        for (i = 0; i < numKeys; i++) {
            const key = keyOrder[i];
            if (words.hasOwnProperty(key)) {
                orderedEntries.push([key, words[key]]);
                reorderedCount++;
            }
            completedOperations++;
            if (i % progressInterval === 0 || i === numKeys - 1) { //Update on the interval or last item
                let progress = Math.min(100, Math.round((completedOperations / totalOperations) * 100));
                process.stdout.write(`Key Processing Progress: ${progress}%\r`);
            }
        }
        // Remove keys which are not in the order array.
        // Normally no keys should be removed if the patch is applied to the same 
        // version of the dictionary the patch was created in the first place.
        const keysToRemove = [];
        const existingKeys = Object.keys(words);
        for (i = 0; i < existingKeys.length; i++) {
            const key = existingKeys[i];
            if (!keyOrder.includes(key)) {
                keysToRemove.push(key);
                removedCount++;
            }
            completedOperations++;
            if (i % progressInterval === 0 || i === existingKeys.length - 1) {
                let progress = Math.min(100, Math.round((completedOperations / totalOperations) * 100));
                process.stdout.write(`Key Processing Progress: ${progress}%\r`);
            }
        }
        //Actually recreate the new object
        modifiedData.words = Object.fromEntries([...orderedEntries]);
        keysToRemove.forEach(key => delete modifiedData.words[key]);
        process.stdout.write('\n');
        console.log(`Keys Reordered: ${reorderedCount}, Keys Removed: ${removedCount}`);
    }
    let _modifiedFile;
    if (typeof modifiedFile === 'string') {
        _modifiedFile = modifiedFile;
    } else if (typeof original === 'string') {
        _modifiedFile = original;
    }
    if (!_modifiedFile) return modifiedData;
    const modifiedPath = path.join(__dirname, releaseFolder, _modifiedFile);
    const success = await writeJson(modifiedPath, modifiedData, minify ? 0 : jsonIndent);
    if (success) {
        console.log(`Patch successfully applied.\nSaved to file: ${modifiedPath}`);
        return modifiedData;
    }
    console.log(`Applying patch to file: ${modifiedPath} failed.`);
    return null;
}

/**
 * Creates a JSON patch file by comparing the original and modified version of a converted dictionary.
 * @param {string|object} original
 * @param {string|object} modified
 * @param {string} patchFile
 * @param {boolean} [minify=false]
 * @return {Promise<object|null>}  
 */
async function create(original, modified, patchFile, minify = false) {
    let originalData, modifiedData;
    if (typeof original === 'string') {
        const originalPath = path.join(__dirname, releaseFolder, original);
        originalData = await readJson(originalPath);
    } else {
        originalData = original;
    }
    if (!originalData || typeof originalData !== 'object') return null;
    if (typeof modified === 'string') {
        const modifiedPath = path.join(__dirname, dataFolder, modified);
        modifiedData = await readJson(modifiedPath)
    } else {
        modifiedData = modified;
    }
    if (!modifiedData || typeof modifiedData !== 'object') return null;
    const operations = fastJsonPatch.compare(originalData, modifiedData);
    let order = [];
    if (modifiedData.words) {
        order = Object.keys(modifiedData.words);
    }
    const patchData = {
        version: modifiedData.version,
        dictDate: modifiedData.dictDate,
        operations,
        order
    };
    let _patchFile;
    if (typeof patchFile === 'string') {
        _patchFile = patchFile;
    } else if (typeof original === 'string') {
        _patchFile = original;
    }
    if (!_patchFile) return patchData;
    const patchPath = path.join(__dirname, patchFolder, replaceExtension(_patchFile, patchExt));
    const success = await writeJson(patchPath, patchData, minify ? 0 : jsonIndent);
    if (success) {
        console.log(`Patch file created: ${patchPath}`);
        return patchData;
    }
    return null;
}

/**
 * Verifies if two given JSON files or objects are identical by comparing the keys and values.
 * @param {string|object} original The original JSON file or object.
 * @param {string|object} modified The modified JSON file or object.
 * @return {Promise<boolean>} Returns aPromise which resolves true if the files a identical, otherwise false.
 */
async function verify(original, modified) {
    let originalData, modifiedData;
    if (typeof original === 'string') {
        const originalPath = path.join(__dirname, releaseFolder, original);
        originalData = await readJson(originalPath);
    } else {
        originalData = original;
    }
    if (!originalData || typeof originalData !== 'object') return false;
    if (typeof modified === 'string') {
        const modifiedPath = path.join(__dirname, dataFolder, modified);
        modifiedData = await readJson(modifiedPath)
    } else {
        modifiedData = modified;
    }
    if (!modifiedData || typeof modifiedData !== 'object') return false;
    const differences = fastJsonPatch.compare(originalData, modifiedData);
    if (differences.length === 0) {
        console.log('Files are identical (fastJsonPatch Comparison).');
        return true;
    } else {
        console.log('Files are NOT identical (fastJsonPatch Comparison).');
        console.log("Differences found:", JSON.stringify(differences, null, 2));
        return false;
    }
}

/**
 * Verifies if two given JSON files or objects are identical by comparing each character of each line.
 * @param {string|object} original The original JSON file or object.
 * @param {string|object} modified The modified JSON file or object.
 * @return {boolean} Returns true if the files a identical, otherwise false.
 */
function verifyDeep(original, modified) {
    try {
        const originalPath = path.join(__dirname, releaseFolder, original);
        const modifiedPath = path.join(__dirname, dataFolder, modified);
        const fd1 = fs.openSync(originalPath, 'r');
        const fd2 = fs.openSync(modifiedPath, 'r');
        let fileSize1 = fs.statSync(originalPath).size;
        let fileSize2 = fs.statSync(modifiedPath).size;
        let totalSize = Math.max(fileSize1, fileSize2);
        let bufferSize = 1;
        const buffer1 = Buffer.alloc(bufferSize);
        const buffer2 = Buffer.alloc(bufferSize);
        let position = 0;
        let lineNumber = 1;
        let columnNumber = 1;
        let different = false;
        let progressInterval = Math.max(1000, Math.floor(totalSize / 100));
        while (true) {
            const bytesRead1 = fs.readSync(fd1, buffer1, 0, bufferSize, position);
            const bytesRead2 = fs.readSync(fd2, buffer2, 0, bufferSize, position);
            if (bytesRead1 === 0 && bytesRead2 === 0) {
                break; // Both files reached the end
            }
            if (bytesRead1 === 0 || bytesRead2 === 0) {
                process.stdout.write('\n');
                console.log(`Files have different lengths. Difference at position ${position}, Line: ${lineNumber}, Column: ${columnNumber}`);
                different = true;
                break;
            }
            const char1 = buffer1.toString('utf8');
            const char2 = buffer2.toString('utf8');

            if (char1 !== char2) {
                process.stdout.write('\n');
                console.log(`Files differ at position ${position}, Line: ${lineNumber}, Column: ${columnNumber}:`);
                console.log(`  Original char code: ${char1.charCodeAt(0)}`);
                console.log(`  Modified char code: ${char2.charCodeAt(0)}`);
                different = true;
                break;
            }
            position++;
            if (char1 === '\n') {
                lineNumber++;
                columnNumber = 1;
            } else {
                columnNumber++;
            }
            if (position % progressInterval === 0) {
                let progress = Math.min(100, (position / totalSize) * 100);
                process.stdout.write(`Verification Progress: ${progress.toFixed(2)}% - Line: ${lineNumber}, Column: ${columnNumber}\r`); //Use output stream
            }
        }
        fs.closeSync(fd1);
        fs.closeSync(fd2);
        process.stdout.write('\n');
        if (!different) {
            console.log('Files are identical (Character-by-Character Comparison - Streamed).');
            return true;
        } else {
            console.log('Files are NOT identical (Character-by-Character Comparison - Streamed).');
            return false;
        }
    } catch (error) {
        process.stdout.write('\n');
        console.error('Error verifying files (character by character - streamed):', error.message);
        return false;
    }
}

/**
 * Replaces the extension of a given filename.
 * @param {string} filename The filename to by modified.
 * @param {string} newExtension The new extension of the filename.
 * @param {string} [delimiter='.'] The delimiter used to identify the extension start.
 * @return {string} Returns the filename with the new extensions. 
 */
function replaceExtension(filename, newExtension, delimiter = '.') {
    if (typeof filename !== 'string') return null;
    if (typeof newExtension !== 'string') return null;
    const lastDelimiterIndex = filename.lastIndexOf(delimiter);
    if (lastDelimiterIndex === -1) return filename + delimiter + newExtension;
    const baseName = filename.substring(0, lastDelimiterIndex);
    const cleanExtension = newExtension.startsWith(delimiter) ? newExtension : delimiter + newExtension;
    return baseName + cleanExtension;
}

// Only run main() if the module is called directly via npm run.
if (module.parent === null) main();

module.exports = { create, apply, verify, verifyDeep };
