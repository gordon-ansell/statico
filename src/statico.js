/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { syslog, FsParser, fsutils, string } = require('gajn-framework');
const matter = require('gray-matter');
const pack = require('../package.json');
const Config = require('./config');
const StaticoError = require('./staticoError');
const Server = require('./server');
const ServerExpress = require('./serverExpress');
const StaticoTemplateHandlerError = require('./templatehandlers/staticoTemplateHandlerError');
const TemplatePathUrl = require('./templatePathUrl');
const TemplateParser = require('./parsers/templateParser');
const AssetParser = require('./parsers/assetParser');
const Watcher = require('./watcher');
const Converter = require('./converter');

/**
 * Main worker class.
 */
class Statico
{
    /**
     * Input directory.
     * @member {string}
     */
    #input = null;

    /**
     * Output directory.
     * @member {string}
     */
    #output = null;

    /**
     * Process args.
     * @member {ProcessArgs}
     */
    #processArgs = null;

    /**
     * Init start time.
     * @member {int}
     */
    #initStartTime = 0;

    /**
     * Start time.
     * @member {int}
     */
    #startTime = 0;

    /**
     * Configs.
     * @member {Config}
     */
    config = null;

    /**
     * Are we processing?
     * @member {boolean}
     */
    isProcessing = false;

    /**
     * Late parsers.
     * @member {string[]}
     */
    #lateParsers = [];

    /**
     * Parsed counts.
     * @member {object}
     */
    #parsedCounts = {
        total: 0,
        copied: 0
    };

    /**
     * Constructor.
     * 
     * @param   {string}        input       Input directory.
     * @param   {string}        output      Output directory.
     * @param   {string}        level       Logging level.
     * @param   {string[]}      contexts    Debug contexts.
     * @param   {ProcessArgs}   args        Command line arguments.
     * 
     * @return  {Statico}
     */
    constructor(input, output, level = 'notice', contexts, args)
    {
        this.#initStartTime = Date.now();

        this.#processArgs = args;

        syslog.setLevel(level);
        if (contexts) {
            syslog.addContexts(contexts);
        }

        if (!input) {
            input = process.cwd();
        }        

        if (!output) {
            output = path.join(input, '_site');
        }

        this.#input = input;
        this.#output = output;


        syslog.notice('='.repeat(50));
        syslog.notice(`Statico version ${pack.version} started.`);
        syslog.info(`Input directory: ${this.#input}.`);
        syslog.info(`Output directory: ${this.#output}.`);
    }

    /**
     * Initialise the app.
     * 
     * @return  {boolean}
     */
    async init()
    {
        // Set up the configs.
        this.config = new Config(this.#input, this.#output, this.#processArgs);

        this.config.loadSiteConfig();
        this.config.mergeBaseConfigs();
        this.config.collateProcessArgs();

        syslog.notice(`Running in mode: ${this.config.mode}.`);

        this.config.events.emit('statico.init.postbaseconfig');
        this.config.loadDefaultFilters();
        this.config.loadDefaultShortcodes();
        this.config.addBuiltInTemplateHandlers();

        TemplatePathUrl.sitePath = this.config.sitePath;

        this.config.events.emit('statico.init.finished');

        await this.cleanUp();

        syslog.inspect(this.config, "trace", "Config after init", 'Statico.init');

        syslog.notice(`Statico initialisation completed in ${(Date.now() - this.#initStartTime) / 1000} seconds.`);

        return true;
    }

    /**
     * Clean up anything we need to.
     * 
     */
    async cleanUp()
    {
        // Clean the output directory.
        if (fsutils.deleteFolderRecursive(this.config.outputPath)) {
            syslog.notice("Cleaned output directory.")
        }

        // Clean the tmp directory.
        if (fsutils.deleteFolderRecursive(path.join(this.config.sitePath, this.config.tempDir))) {
            syslog.notice("Cleaned temp directory.")
        }

        // Clean?
        if (this.config.processArgs.argv.clean) {
            if (this.config.assetHandlers.image.generatedStorePath && fs.existsSync(this.config.assetHandlers.image.generatedStorePath)) {
                fs.unlinkSync(this.config.assetHandlers.image.generatedStorePath);
                syslog.notice('Cleanup requested - deleted generated image store.');
            }
            if (this.config.assetHandlers.image.outputDir) {
                let od = path.join(this.config.sitePath, this.config.assetHandlers.image.outputDir);
                if (fs.existsSync(od)) {
                    fsutils.deleteFolderRecursive(od);
                    syslog.notice('Cleanup requested - deleted generated image directory.');
                }
            }
            if (this.config.assetCacheFile && fs.existsSync(this.config.assetCacheFile)) {
                fs.unlinkSync(this.config.assetCacheFile);
                syslog.notice('Cleanup requested - deleted asset cache.');
            }            
        }

    }

    /**
     * Run the app.
     * 
     * @return  {number}
     */
    async run()
    {
        if (this.config.processArgs.argv.convert) {
            let conv = new Converter('/Users/gordonansell/Dev/gordonansell.com/_conv', this.config);
            await conv.convert();
            return 0;
        }

        let server;

        // Process it all.
        await this.process();

        syslog.inspect(this.config.dynamicData, 'warning');

        // Serve?
        if (this.config.processArgs.argv.servenode) {
            server = new Server(
                path.join(this.config.outputPath),
                this.config.hostname
            );
            server.start();

        // Express?
        } else if (this.config.processArgs.argv.serve) {
            server = new ServerExpress(this.config);
            server.start();

        // Servesync?
        } else if (this.config.processArgs.argv.servesync) {
            const ServerSync = require('./serverSync');
            server = new ServerSync(
                path.join(this.config.outputPath),
                this.config.hostname,
            );
            server.start();
        } 

        // Watch?
        if (this.config.processArgs.argv.watch) {
            let watcher = new Watcher(this.config, this, server);
            watcher.watch();
        }

        // Return.
        return 0;
    }

    /**
     * Reset.
     */
    reset()
    {

    }
    
    /**
     * Do some processing.
     * 
     * @param   {string[]}  files       Files to process.
     * 
     * @return  {number}
     */
    async process(files)
    {            
        this.isProcessing = true;

        syslog.notice('-'.repeat(50));

        this.#startTime = Date.now();

        if (!files) {
            // Parse the file system.
            syslog.notice('Parsing filesystem.');
            files = await this._parseFilesystem();

            syslog.info(`${files.length} processable files found for the site.`);

            // Trigger the event to say we've parsed the filesystem.
            this.config.events.emit('statico.parsedfilesystem');
        }

        if (!Array.isArray(files)) {
            files = [files];
        }

        // Separate out the assets.
        let assets = [];
        let others = [];
        for (let file of files) {
            if (this.config.assetExts.includes(path.extname(file).slice(1))) {
                assets.push(file);
            } else {
                others.push(file);
            }
        }

        // Tell user.
        syslog.notice('Processing assets.');

        // Images?
        let doimages = true;
        if (this.config.processArgs.argv.noimages) {
            doimages = false;
            syslog.warning('Skipping images.');
        }
        
        // Assets parse.
        let assetParser = new AssetParser(this.config);
        await assetParser.parse(assets, !doimages);

        // Copy the generated images.
        await this.copyGeneratedImages();

        // Create the template parser.
        let templateParser = new TemplateParser(this.config);

        // Early parse.
        syslog.notice(`Running early parse.`);
        await templateParser.parse(others, 'early');
        let lateParsers = templateParser.notProcessed;

        // Sort taxonomies.
        await this._sortTaxonomies();

        // Late parse.
        syslog.notice(`Running late parse.`);
        await templateParser.parse(lateParsers, 'late');
        let lastParsers = templateParser.notProcessed;

        // Process taxonomies.
        syslog.notice(`Processing taxonomies.`);
        await this._processTaxonomies();

        // Last parse.
        syslog.notice(`Running last parse.`);
        await templateParser.parse(lastParsers, 'last');

        // Now push everything through their layouts.
        syslog.notice(`Parsing everything through layouts - early.`)
        await this.parseThroughLayoutAndWrite('early');
        syslog.notice(`Parsing everything through layouts - late.`)
        await this.parseThroughLayoutAndWrite('late');
        syslog.notice(`Parsing everything through layouts - last.`)
        await this.parseThroughLayoutAndWrite('last');

        //syslog.inspect(this.config.schema, "warning");

        //syslog.inspect(Object.keys(this.config.navigation.top), "warning");

        // Finish up.
        syslog.notice(`Statico processing completed in ${(Date.now() - this.#startTime) / 1000} seconds.`);
        syslog.notice('-'.repeat(50));

        this.isProcessing = false;

    }

    /**
     * Push everything through their layouts.
     * 
     */
    async parseThroughLayoutAndWrite(parseName)
    {
        syslog.info(`Parse through layouts - ${parseName}.`);
        if (this.config.toParseThroughLayout[parseName] && this.config.toParseThroughLayout[parseName].length > 0) {

            let totalItems = this.config.toParseThroughLayout[parseName].length;
            let count = 0;
            syslog.printProgress(0);

            await Promise.all(this.config.toParseThroughLayout[parseName].map(async templateFile => {
                this.config.templateHandlers.getHandlerForExt(templateFile.ext).parseThroughLayoutAndWrite(templateFile);
                count++;
                syslog.printProgress((count/totalItems) * 100);
            }));    

            syslog.endProgress();
        }

        this.config.toParseThroughLayout[parseName] = []; 
    }

    /**
     * Sort the taxonomies.
     */
    async _sortTaxonomies()
    {
        if (!this.config.taxonomyTypes) {
            return;
        }

        await Promise.all(this.config.taxonomyTypes.map(async taxType => {
            this.config.collections[taxType] = Object.keys(this.config.collections[taxType])
                .sort(function(a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                })
                .reduce(
                (obj, key) => { 
                    obj[key] = this.config.collections[taxType][key]; 
                    return obj;
                }, 
                {}
            );
        }));

        syslog.info(`Sorted taxonomies.`)
    }

    /**
     * Process taxomonies.
     */
    async _processTaxonomies()
    {
        if (!this.config.taxonomyTypes) {
            return;
        }

        let dummyFn = path.join(this.config.sitePath, '_layouts', 'dummies', 'taxonomy.njk');

        if (!fs.existsSync(dummyFn)) {
            syslog.error(`No dummy taxonomy file found at '${dummyFn}', taxomonies will not be generated`);
            return;
        }

        let dummy = fs.readFileSync(dummyFn, 'utf-8');

        //syslog.inspect(dummy);

        let tmpPath = path.join(this.config.sitePath, this.config.tempDir, 'taxonomies');

        let opFiles = [];

        let tdefs;
        if (this.config.taxonomyDefs) {
            tdefs = this.config.taxonomyDefs;
        }

        await Promise.all(this.config.taxonomyTypes.map(async taxType => {

            if (this.config.collections[taxType]) {

                let tmpPathEntry = path.join(tmpPath, taxType);

                fsutils.mkdirRecurse(tmpPathEntry);

                let entries = Object.keys(this.config.collections[taxType]);

                let totalItems = entries.length;
                let count = 0;
                syslog.printProgress(0, taxType);
            
                await Promise.all(entries.map(async taxName => {

                    let fileData;

                    if (tdefs && tdefs[taxType]) {
                        let m = matter(dummy);
                        let content = m.content;
                        let data = m.data;

                        for (let field of ['title', 'description', 'headline']) {
                            if (tdefs[taxType][taxName] && tdefs[taxType][taxName][field]) {
                                data[field] = tdefs[taxType][taxName][field];
                            } else if (tdefs[taxType][field]) {
                                data[field] = tdefs[taxType][field];
                            }
                        }

                        fileData = matter.stringify(content, data);

                    } else {
                        fileData = dummy;
                    }

                    fileData = string.replaceAll(fileData, '(((entry)))', taxName);
                    fileData = string.replaceAll(fileData, '(((entryslug)))', string.slugify(taxName));
                    fileData = string.replaceAll(fileData, '(((taxtype)))', taxType);
                    fileData = string.replaceAll(fileData, '(((taxtypeslug)))', string.slugify(taxType));

                    let ofn = path.join(tmpPathEntry, string.slugify(taxName) + '.njk');

                    fs.writeFileSync(ofn, fileData);

                    opFiles.push(ofn);

                    count++;
                    syslog.printProgress((count / totalItems) * 100, taxType);

                }));

                syslog.endProgress;
            }

        }));

        // Now process the files.
        let templateParser = new TemplateParser(this.config);
        await templateParser.parse(opFiles, null, false);
        syslog.info(`Taxonomy pages generated`);

        //syslog.inspect(Object.keys(this.config.collections['tags']['cPanel']));
    }

    /**
     * Parse the file system.
     * 
     * @return  {string[]}    List of files.
     */
    async _parseFilesystem()
    {
        // Parse the file system.
        let patterns = this.config.fsParserFilters;
        let fsp = new FsParser(this.#input, this.#input, patterns);
        let files = await fsp.parse();
        return files;
    }

    /**
     * Copy the generate images.
     * 
     * @return
     */
    async copyGeneratedImages()
    {
        if (this.config.assetHandlers.image) {
            syslog.notice(`Copying generated images.`);
            let from = path.join(this.config.sitePath, this.config.assetHandlers.image.outputDir);
            let to = path.join(this.config.outputPath, this.config.assetHandlers.image.outputDir);
            syslog.info(`Copying generated images ${from} => ${to}`);
            await fsutils.copyDirAsyncProgress(from, to);
        }
    }


}

module.exports = Statico;