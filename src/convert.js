const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const package = require('../package.json');

// Get the data from the command line (index 2)
const fileNameArg = process.argv[2];

const dataFolder = '../data';
const releaseFolder = '../release';
const outputFileName = 'simple.min.json';
const createGzipVersion = true;

/**
 * Runs the convert function if the script is executed via npm run.
 */
function main() {
    console.log('*******************************************************************************');
    console.log(`Converting source dictionary to "${package.name}"`);
    console.log(`Version: ${package.version}`);
    console.log('*******************************************************************************');
    convert(fileNameArg);
}

/**
 * Converts the original JMdict JSON file from the `data` folder to a simplified format.
 * @param {string} fileName The file name of the JSON file.
 * @return {Promise<boolean>} Returns a promise wich resolves true if the conversion was successful, otherwise false.
 */
function convert(fileName) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof fileName !== 'string' || fileName.length === 0) {
                console.error('Please provide a valid filename to convert!');
                return resolve(false);
            }
            console.log(`Converting source dictionary "${fileName}"`);
            const inputFilePath = path.join(__dirname, dataFolder, fileName);
            const outputFilePath = path.join(__dirname, releaseFolder, outputFileName);
            const gzippedOutputFilePath = outputFilePath + '.gz';
            if (fs.existsSync(inputFilePath) === false) {
                console.error('The input file path does not exists.');
                return resolve(false);
            }
            if (fs.existsSync(releaseFolder === false)) {
                console.error('The releaser folder does not exists.');
                return resolve(false);
            }
            fs.readFile(inputFilePath, 'utf8', (error, data) => {
                if (error) {
                    console.error('Error reading the input file:', error);
                    return resolve(false);
                }
                // Parse the source dictionary
                let jmdictData;
                try {
                    jmdictData = JSON.parse(data);
                } catch (error) {
                    console.error('Error parsing the source dictionary json data.', error);
                    return resolve(false);
                }
                // Shortened key for hiragana to katakana and kanji
                const h2kk = {}
                // Process each word entry in the JMdict data
                jmdictData.words.forEach(entry => {
                    const kanjiElements = entry.kanji || [];
                    const kanaElements = entry.kana || [];
                    // Gather all kanji for this entry
                    const kanjiList = kanjiElements.map(k => k.text);
                    // Map each kana (hiragana or katakana) to the list of kanji and katakana
                    kanaElements.forEach(kana => {
                        const hiragana = kana.text; // Assuming text is always hiragana in this context
                        const katakana = kana.text.replace(/[\u3040-\u309F]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60)); // Convert hiragana to katakana
                        if (!h2kk[hiragana]) {
                            h2kk[hiragana] = { katakana: new Set(), kanji: new Set() };
                        }
                        // Add the corresponding katakana and the kanji list
                        h2kk[hiragana].katakana.add(katakana);
                        kanjiList.forEach(kanji => h2kk[hiragana].kanji.add(kanji));
                    });
                });
                // Set version & date
                const finalOutput = {
                    version: jmdictData.version,
                    dictDate: jmdictData.dictDate,
                }
                // Convert sets back to arrays and ensure all keys are present
                finalOutput.words = Object.fromEntries(
                    Object.entries(h2kk).map(([key, value]) => [
                        key,
                        {
                            katakana: [...value.katakana],
                            kanji: [...value.kanji],
                        },
                    ])
                );
                // Convert the final output to a JSON string
                const jsonString = JSON.stringify(finalOutput);
                // Write the JSON file
                fs.writeFile(outputFilePath, jsonString, 'utf8', (error) => {
                    if (error) {
                        console.error('Error writing the simple dictionary JSON file:', error);
                        return resolve(false);
                    }
                    console.log(`The simple dictionary JSON file was saved to: "${outputFilePath}"`);
                    // Create a gz version if needed
                    if (createGzipVersion === false) return resolve(true);
                    const gzip = zlib.createGzip();
                    const input = fs.createReadStream(outputFilePath);
                    const output = fs.createWriteStream(gzippedOutputFilePath);
                    input.pipe(gzip).pipe(output).on('finish', (error) => {
                        if (error) {
                            console.error('Error compressing the file:', error);
                            return resolve(false);
                        }
                        console.log(`The gz compressed version of the simple dictionary JSON file was saved to: "${gzippedOutputFilePath}"`);
                        return resolve(true);
                    });
                });
            });
        } catch (error) {
            console.log('Unhandled error:', error);
            return resolve(false);
        }
    });
}

/**
 * Checks if the script was executed directly via npm run.
 * @return {boolean}
 */
function isRunningViaNpmRun() {
    return require.main === module &&
        process.env.npm_lifecycle_event !== undefined &&
        process.env.npm_package_json !== undefined;
}

if (isRunningViaNpmRun() === true) main();

module.exports = { convert };
