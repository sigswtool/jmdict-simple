const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tar = require('tar');
const package = require('../package.json');

// Get the tag name  from the command line (index 2).
const _tagArg = process.argv[2];

const owner = 'scriptin';
const repo = 'jmdict-simplified';
const prefix = 'jmdict-all-';
const extension = 'json.tgz';
const dataFolder = '../data';
const _tag = (_tagArg) ? _tagArg : 'latest';

/**
 * Runs the update function if the script is executed via npm run.
 */
function main() {
    console.log('*******************************************************************************');
    console.log(`Updating the source dictionary for "${package.name}"`);
    console.log(`Version: ${package.version}`);
    console.log('*******************************************************************************');
    update(_tag);
}

/**
 * Updates the source dictionary for a given release tag name.
 * @async
 * @param {string} [tag=latest] The tag name of the release. Default is "latest"
 * @return {Promise<string|null>} Returns a promise which resolves to the filename of the downloaded source JSON file or null.
 */
async function update(tag = _tag) {
    if (typeof tag !== 'string') {
        console.error('Please supply a valid release tag name.');
        return null;
    }
    console.log(`Updating source dictionary to release tag "${tag}"`);
    const asset = await getAsset(owner, repo, prefix, extension, tag);
    if (asset === null) {
        console.error(`Could not find any assets starting with "${prefix}" and ending with "${extension}" for tag "${tag}"`);
        return null;
    }
    const url = asset.browser_download_url;
    const fileName = asset.name;
    const outputFolder = path.join(__dirname, dataFolder);
    const file = await downloadAsset(url, outputFolder, fileName);
    if (file === null) {
        console.error(`Could not download "${fileName}}".`);
        return null;
    }
    const files = await unpackAsset(file, outputFolder);
    const filePath = path.join(outputFolder, fileName);
    if (fs.existsSync(filePath)) {
        try {
            fs.rmSync(filePath);
        } catch (error) {
            console.error(error);
            return null;
        }
    }
    // We return the filename name which can be passed to the convert script
    return (Array.isArray(files) && files.length > 0) ? files[0] : null;
}

/**
 * Asynchronously fetches the download link for the *first* asset of the given release tag of a GitHub project,
 * filtering by filename prefix and extension.
 * @param {string} owner The GitHub username or organization that owns the repository.
 * @param {string} repo The name of the repository.
 * @param {string} prefix The prefix the asset filename must start with (case-sensitive). If null/undefined/empty, no prefix filtering is applied.
 * @param {string} ext The extension the asset filename must end with (case-sensitive). If null/undefined/empty, no extension filtering is applied.  Include the leading dot (e.g., ".zip", ".exe").
 * @param {string} [tag=latest] The release tag name. Default is "latest".
 * @returns {Promise<string|null>} A promise that resolves to the download URL (string) of the *first* asset or null.
 */
function getAsset(owner, repo, prefix, ext, tag = "latest") {
    return new Promise((resolve, reject) => {
        try {
            const apiUrl = (tag === 'latest')
                ? `https://api.github.com/repos/${owner}/${repo}/releases/latest`
                : `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
            https.get(apiUrl, {
                headers: {
                    'User-Agent': 'Node.js GitHub Release Downloader' // Required by GitHub API
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const releaseData = JSON.parse(data);
                            if (!releaseData.assets || releaseData.assets.length === 0) {
                                console.warn(`Warning: No assets found for the latest release of ${owner}/${repo}.`);
                                return resolve(null);
                            }
                            const matchingAssets = releaseData.assets
                                .filter(asset => {
                                    let filename = asset.name;
                                    let prefixMatch = true;
                                    let extensionMatch = true;
                                    if (prefix) {
                                        prefixMatch = filename.startsWith(prefix);
                                    }
                                    if (ext) {
                                        extensionMatch = filename.endsWith(ext);
                                    }
                                    return prefixMatch && extensionMatch;
                                });
                            if (matchingAssets.length > 0) {
                                return resolve(matchingAssets[0]); // Resolve with the first match
                            } else {
                                return resolve(null);
                            }
                        } catch (error) {
                            console.error("Error parsing JSON.", error);
                            return resolve(null);
                        }
                    } else {
                        console.error(`GitHub API request failed with status ${res.statusCode}`);
                        return resolve(null);
                    }
                });
            }).on('error', (error) => {
                console.error("Error fetching release data.", error);
                resolve(null);
            });
        } catch (error) {
            console.error('Unhandled error:', error);
            return resolve(null);
        }
    });
}

/**
 * Downloads the given file URL to a given destination directory.
 * @param {string} fileUrl The file URL to download.
 * @param {string} downloadDir The directory to save the downloaded file.
 * @param {string} [filename] The filename of the downloaded file. If undefined the filename will be extracted from the file URL.
 * @return {Promise<string|null>} Returns a promise which resolves the path of the downloaded file or null. 
 */
function downloadAsset(fileUrl, downloadDir, filename) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof fileUrl !== 'string' || fileUrl.length === 0) {
                console.error(`Provide a valid file url!`);
                return resolve(null);
            }
            if (!fs.existsSync(downloadDir)) {
                console.error(`Download directory "${downloadDir}" does not exist.`);
                return resolve(null);
            }
            // Helper function to perform the download (or redirect)
            const doDownload = (downloadURL, redirectCount = 0) => {
                if (redirectCount > 5) { // Limit redirects to prevent infinite loops
                    console.error("[downloadAsset]: Too many redirects");
                    return resolve(null);
                }
                https.get(downloadURL, {
                    headers: {
                        'User-Agent': 'Node.js Download Agent', // Some GitHub servers require a User-Agent
                    },
                    // Necessary to handle redirects:
                    followRedirects: false,
                }, (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        const finalUrl = downloadURL;
                        const fileName = filename || path.basename(new URL(finalUrl).pathname);
                        const filePath = path.join(downloadDir, fileName);
                        const file = fs.createWriteStream(filePath);
                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            console.log(`Downloaded "${filename}" (via ${redirectCount} redirects) to "${filePath}"`);
                            return resolve(filePath);
                        });
                        file.on('error', (error) => {
                            console.error(`Error writing file: ${error.message}`);
                            fs.unlink(filePath, () => { }); // Try to delete the partially downloaded file
                            return resolve(null);
                        });
                    } else if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        // Handle redirect
                        const redirectURL = response.headers.location;
                        // console.log(`Redirecting to: ${redirectURL}`);
                        doDownload(redirectURL, redirectCount + 1);  // Recursive call for redirect
                    } else {
                        console.error(`Download failed with status code: ${response.statusCode}`);
                        return resolve(null);
                    }
                }).on('error', (error) => {
                    console.error(`Error during download: ${error.message}`);
                    return resolve(null);
                });
            };
            // Start the download process
            doDownload(fileUrl);
        } catch (error) {
            console.log('Unhandled error:', error);
            return resolve(null);
        }
    });
}

/**
 * Unpacks a tar.gz file using the `tar` package and returns a list of extracted filenames.
 * @param {string} tarGzFilePath - The path to the tar.gz file.
 * @param {string} destinationDir - The directory to unpackAsset the contents to.
 * @returns {Promise<string[]|null>} - A promise that resolves with to an array of extracted filenames or null.
 */
function unpackAsset(tarGzFilePath, destinationDir) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(tarGzFilePath) === false) {
                console.error('Archive file does not exist!');
                return resolve(null);
            }
            if (fs.existsSync(destinationDir) === false) {
                console.error('Destination directory does not exist!');
                return resolve(null);
            }
            const filenames = [];
            let isErrored = false; // Flag to prevent double resolving/rejecting
            const readStream = fs.createReadStream(tarGzFilePath);
            const gunzipStream = zlib.createGunzip();
            const tarExtractStream = tar.extract({
                cwd: destinationDir,
                strip: 0,
                onentry: (entry) => {
                    if (entry.type === 'File' || entry.type === 'Directory') {
                        filenames.push(entry.path);
                    }
                },
                filter: (filePath, entry) => { // Prevent transversal
                    const absolutePath = path.join(destinationDir, filePath);
                    if (!absolutePath.startsWith(destinationDir)) {
                        console.warn(`Attempted path traversal: ${filePath}`);
                        return false;
                    }
                    return true;
                },
            });
            const handleError = (error, source) => {
                if (isErrored) return; // Prevent double resolving/rejecting
                isErrored = true;
                console.error(`Error during "${source}"`, error);
                readStream.destroy();
                gunzipStream.destroy();
                tarExtractStream.abort();
                return resolve(null);
            };
            readStream.on('error', (error) => handleError(error, 'readStream'));
            gunzipStream.on('error', (error) => handleError(error, 'gunzipStream'));
            tarExtractStream.on('error', (error) => handleError(error, 'tarExtractStream'));
            tarExtractStream.on('finish', () => {
                if (isErrored) return; // Prevent resolving if already errored
                console.log(`Unpacked ${filenames.length} files to "${destinationDir}"`);
                return resolve(filenames);
            });
            readStream
                .pipe(gunzipStream)
                .pipe(tarExtractStream);
        } catch (error) {
            console.error(`Unhandled error:`, error);
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

module.exports = { update };
