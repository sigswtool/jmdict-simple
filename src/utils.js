const fs = require('fs');

/**
 * Writes the given JSON Object to a file in the given path.
 * @param {string} filePath 
 * @param {object} data
 * @param {number} [indentation=0]
 * @return {Promise<boolean>} 
 */
function writeJson(filePath, data, indentation = 0) {
    return new Promise(async (resolve, reject) => {
        let jsonString;
        try {
            jsonString = JSON.stringify(data, null, indentation);
        } catch (error) {
            console.error("Error parsing the json object:", error.message);
            return resolve(false);
        }
        fs.writeFile(filePath, jsonString, 'utf8', error => {
            if (error) {
                console.error("Error writing JSON File:", error.message);
                return resolve(false);
            }
            resolve(true);
        });
    });
}

/**
 * Reads a JSON files from the given path and parse the content to an object.
 * @param {string} filePath The filepath of the JSON file.
 * @return {Promise<object|null>} Returns a Promise which resolves the parsed JSON object or null in case of an error.
 */
function readJson(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (error, data) => {
            if (error) {
                console.error("Error reading JSON File", error.message);
                resolve(null);
                return;
            }
            try {
                const jsonObject = JSON.parse(data);
                resolve(jsonObject);
            } catch (parseError) {
                console.error("Error parsing JSON file:", parseError.message);
                resolve(null);
            }
        });
    });
}

module.exports = {
    readJson,
    writeJson,
};