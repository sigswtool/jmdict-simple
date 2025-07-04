# sigswtool/jmdict-simple
This is a  conversion script for creating a reduced version of the JMdict - Japanese-Multilingual Dictionary, optimized for querying in Hiragana.

It uses the JSON dictionary provided by the [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) project as it's foundation.

The original dictionary is created and maintained by the [ELECTRONIC DICTIONARY RESEARCH AND DEVELOPMENT GROUP](https://www.edrdg.org/jmdict/j_jmdict.html).

The conversion script itself is developed and maintained by [SIGMATEK GmbH & Co KG](https://www.sigmatek-automation.com/).

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
If you want to build the simple version based on the latest JMdict dictionary version run the following command:

```bash
npm run build
```

### Build a specific version
If you want to build the simple version based on a specific JMdict dictionary version you need to pass a release tag to the build command.

```bash
npm run build 3.5.0+20240902122037
```

> It is possible to [apply a patch](#apply-a-patch-during-build-time) during build time.

### Manually update the source dictionary
To manually update the source JMdict dictionary to the latest release run:

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
## Patch management
If you have built your own modified version of the JMdict Simple dictionary you can create a patch file and integrate it in the build. 

### Creating a patch

* Make sure the original version (simple.min.json) of the JMdict Simple dictionary is present in the ``release`` folder.
* Place your modified JMdict Simple dictionary (like simple.min_modified.json) in the ``data`` folder.
* Run the following command to create a patch:

```bash
npm run patch create simple.min.json simple.min_modified.json
```
This creates the patch file `simple.min.patch.json` in the `patches` folder.

If you want to specify your own patch filename you can supply the filename (without extension) as the third parameter:

```bash
npm run patch create simple.min.json simple.min_modified.json my_own_name
```
This creates the patch file `my_own_name.patch.json` in the `patches` folder.

### Apply a patch during build time
To apply a patch during build time follow these steps:

* The patch file must reside within the `patches` folder.
* It is mandatory to add the [version number](#build-a-specific-version) of the source directory to the build command.
* Supply the patch name as the second parameter of the build command.

```bash
npm run build latest simple.min.patch.json 
```
This applies the patch directly to the created `simple.min.json` in the `release` folder.

> If the version number of the patch file and the converted version of the source dictionary do not match the build will fail.

### Applying a patch to an existing dictionary
To apply a patch to an already converted dictionary follow these steps:

* Make sure the original JMdict Simple dictionary is present in the `release` folder.
* Make sure the patch file is present in the `patches` folder.
* Run the following command to apply the patch:

```bash
 npm run patch apply simple.min.json simple.min.patch.json
```
This integrates the patch directly into `simple.min.json` in the `release` folder.

If you want to save the new patched version to another file you can supply the filename (including the extension) as the third parameter:

```bash
npm run patch create simple.min.json simple.min_modified.json my_own_name.json
```
This creates the patched file `my_own_name.json` in the `release` folder.

>If the version number of the patch file and the converted version of the source dictionary do not match the operation will fail.

### Verifying a patched version
After you created a patch file you can (and should) validate if the created patch can be applied correctly.

* Make sure the modified version from which the patch was created from is still available in the `data` folder.
* Create a [new build](#apply-a-patch-during-build-time) of the JMdict Simple dictionary with the created patch or [apply](#applying-a-patch-to-an-existing-dictionary) it to an existing one. 
* Run one of the following commands to verify if the patch was correctly applied.

#### Standard verify (fast) 
The patched and the modified version are verified by comparing all object keys and their values.
This is very fast, but does not check if the order of the object keys is identical.

```bash
npm run patch verify simple.min.json simple.min_modified.json
```

#### Deep verify (slow)
The patched and the modified version are verified by comparing each individual character of each line. 
This is a much slower the the standard verification, but this detects deviations in the order or any other non printable characters (like line endings etc).

```bash
npm run patch verifyDeep simple.min.json simple.min_modified.json
```

## License
The dictionary is licensed under the [Attribution-ShareAlike 4.0 International](https://github.com/sigswtool/jmdict-simple/blob/main/LICENSE.txt) license.
