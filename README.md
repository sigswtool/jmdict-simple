# sigswtool/jmdict-simple
This is a  conversion script for creating a reduced version of the JMdict - Japanese-Multilingual Dictionary, optimized for querying in Hiragana.

It uses the JSON dictionary provided by the [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) project as it's foundation.

The original dictionary is created and maintained by the [ELECTRONIC DICTIONARY RESEARCH AND DEVELOPMENT GROUP](https://www.edrdg.org/jmdict/j_jmdict.html).

## Install the dependencies
Checkout the repository and run the following command:

```bash
npm install
```

## How to build the dictionary
You can build the simple dictionary based on the [latest](#build-the-latest-version) or a [specific](#build-a-specific-version) version of the JMdict dictionary. 

In both cases the script will download the [latest release](https://github.com/scriptin/jmdict-simplified/releases/latest) or the specific [release tag](https://github.com/scriptin/jmdict-simplified/releases) of the [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) dictionary in the ``data`` folder and convert it to the simplified version. 

The following files will be created in the ``release``  folder:

* simple.min.json
* simple.min.json.gz

### Build the latest version
If you want to build the simple version based on thr latest JMdict dictionary version run the following command:

```bash
npm run build
```

### Build a specific version
If you want to build the simple version based on a specific JMdict dictionary version you need to pass a release tag to the build command.

```bash
npm run build 3.5.0+20240902122037
```

### Manually update the source dictionary
To manually update the source JMdict dictionary  to the latest release run:

```bash
npm run update
```
or to update to a specific release tag name run:

```bash
npm run update 3.5.0+20240902122037
```

### Manually convert a local source dictionary
If you already have a JMdict source dictionary in the ``data`` folder you can convert it by passing the filename of the uncompressed JSON dictionary to the `convert` script:

```bash
npm run convert jmdict-all-3.5.0.json
```

## License
The dictionary is licensed under the [Attribution-ShareAlike 4.0 International](https://github.com/sigswtool/jmdict-simple/blob/main/LICENSE.txt) license.
