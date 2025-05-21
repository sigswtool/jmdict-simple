const { update } = require('./update.js');
const { convert } = require('./convert.js');
const package = require('../package.json');

// Get the tag name  from the command line (index 2).
const _tagArg = process.argv[2];

/**
 * Updates the source dictionary and builds the release.
 */
async function main() {
    console.log('*******************************************************************************');
    console.log(`Building the release of "${package.name}"`);
    console.log(`Version: ${package.version}`);
    console.log('*******************************************************************************');
    let success;
    const filename = await update(_tagArg);
    if (filename === null) success = false;
    else success = await convert(filename);
    console.log(`The build of "${package.name}" ${success ? 'was successful' : 'failed'}.`);
}

main();
