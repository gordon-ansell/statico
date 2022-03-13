/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { syslog, FsParser, fsutils, string } = require('js-framework');
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
const FtpRunner = require('./ftpRunner');
const Benchmarks = require('./benchmarks');
const debug = require('debug')('Statico'),
      debugf = require('debug')('Full.Statico');

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
     * File system parser.
     * @member {FsParser}
     */
    fsParser = null;

    /**
     * Late parsers.
     * @member {string[]}
     */
    //#lateParsers = [];

    /**
     * Parsed counts.
     * @member {object}
     */
    #parsedCounts = {
        assets: 0,
        templates: 0,
    };

    /**
     * Run mode.
     * @member {string}
     */
    #runMode = 'dev';

    /**
     * Constructor.
     * 
     * @param   {string}        input       Input directory.
     * @param   {string}        output      Output directory.
     * @param   {string}        level       Logging level.
     * @param   {string[]}      contexts    Debug contexts.
     * @param   {ProcessArgs}   args        Command line arguments.
     * @param   {string}        runMode     Run mode.
     * 
     * @return  {Statico}
     */
    constructor(input, output, level = 'notice', contexts, args, runMode)
    {
        Benchmarks.getInstance().markStart('statico-constructor', 'Constructing Statico');

        this.#initStartTime = Date.now();

        this.#runMode = runMode; 
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

        Benchmarks.getInstance().markEnd('statico-constructor');
    }

    /**
     * Initialise the app.
     * 
     * @return  {boolean}
     */
    async init()
    {
        Benchmarks.getInstance().markStart('statico-init', 'Initialising Statico');

        // Set up the configs.
        this.config = new Config(this.#input, this.#output, this.#processArgs, this.#runMode);

        this.config.loadSiteConfig();
        this.config.mergeBaseConfigs();
        this.config.collateProcessArgs();

        syslog.notice(`Running in mode: ${this.config.mode}.`);

        this.config.events.emit('statico.init.postbaseconfig');
        this.config.loadDefaultFilters();
        this.config.loadDefaultShortcodes();
        this.config.addBuiltInTemplateHandlers();

        TemplatePathUrl.sitePath = this.config.sitePath;

        await this.config.events.emit('statico.init.finished', this.config);

        await this.cleanUp();

        debugf("Config after init: %O", this.config);

        syslog.notice(`Statico initialisation completed in ${(Date.now() - this.#initStartTime) / 1000} seconds.`);

        Benchmarks.getInstance().markEnd('statico-init');
        return true;
    }

    /**
     * Clean up anything we need to.
     * 
     */
    async cleanUp()
    {
        Benchmarks.getInstance().markStart('statico-cleanup', 'Statico Cleanup Before Running');

        if (!this.config.processArgs.argv.incremental) {
            // Clean the output directory.
            if (fsutils.deleteFolderRecursive(this.config.outputPath)) {
                syslog.notice("Cleaned output directory.")
            }
        }

        // Clean the tmp directory.
        if (fsutils.deleteFolderRecursive(path.join(this.config.sitePath, this.config.tempDir))) {
            syslog.notice("Cleaned temp directory.")
        }

        // Clean?
        if (this.config.processArgs.argv.clean || this.config.processArgs.argv.cleanonly) {
            if (this.config.assetHandlers.image) {
                // Move this into the image plugin via an event.
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
            }
            if (this.config.assetCacheFile && fs.existsSync(this.config.assetCacheFile)) {
                fs.unlinkSync(this.config.assetCacheFile);
                syslog.notice('Cleanup requested - deleted asset cache.');
            }            
        }

        Benchmarks.getInstance().markEnd('statico-cleanup');
    }

    /**
     * Run the app.
     * 
     * @return  {number}
     */
    async run()
    {
        /*
        if (this.config.processArgs.argv.convert) {
            let conv = new Converter('/Users/gordonansell/Dev/gordonansell.com/_conv', this.config);
            await conv.convert();
            return 0;
        }
        */

        let server;

        // Process it all.
        await this.process();

        if (!this.config.processArgs.argv.dryrun) {

            // Serve?
            if (this.config.processArgs.argv.servenode) {
                server = new Server(
                    path.join(this.config.outputPath),
                    this.config.hostname
                );
                server.start();

            // Express?
            } else if (this.config.processArgs.argv.serve || this.config.processArgs.argv.watch) {
                server = new ServerExpress(this.config);
                server.start();

            // Servesync?
            /*
            } else if (this.config.processArgs.argv.servesync) {
                const ServerSync = require('./serverSync');
                server = new ServerSync(
                    path.join(this.config.outputPath),
                    this.config.hostname,
                    this
                );
                server.start();
                */
            } 

            // Watch?
            if (this.config.processArgs.argv.watch) {
                let watcher = new Watcher(this.config, this, server);
                watcher.watch();
            }

            // FTP?
            if (this.config.processArgs.argv.ftp) {
                let ftpRunner = new FtpRunner(this.config);
                ftpRunner.upload();
            }
        }

        // Return.
        return 0;
    }

    /**
     * Reset.
     */
    reset()
    {
        this.#parsedCounts = { assets: 0, templates: 0 };
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
        Benchmarks.getInstance().markStart('statico-process', 'Statico Main Processing Loop');

        this.reset();

        this.isProcessing = true;

        syslog.notice('-'.repeat(50));

        this.#startTime = Date.now();

        syslog.inspect(this.#startTime, "error");

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

        // Filter non-asset files if we're building incrementally.
        if (this.config.processArgs.argv.incremental) {
            let l1 = others.length;
            others.filter(file => {
                let s = fs.statSync(file);
                let d1 = this.#startTime - 3600000;
                return s.mtimeMs < d1;
            });
            let l2 = others.length;
            syslog.notice(`Filtered out ${l1 - l2} files for incremental build. ${l2} template files left to process.`);
        }

        // Tell user.
        Benchmarks.getInstance().markStart('asset-parser', 'Asset Parser');
        syslog.notice('Processing assets.');

        // Images?
        let doimages = true;
        if (this.config.processArgs.argv.noimages) {
            doimages = false;
            syslog.warning('Skipping images.');
        }
        
        // Assets parse.
        if (this.config.processArgs.argv.clean) {
            syslog.warning(`Clean asset rebuild selected - prepare to wait a while if you have a lot of images.`);
        }
        let assetParser = new AssetParser(this.config);
        let chunk = (this.config.processArgs.argv.clean) ? 10 : 50;
        let count = 1;
        let i = 0;
        let j = 0;
        if (!this.config.processArgs.argv.silent) await syslog.printProgress(0);
        for (i = 0,j = assets.length; i < j; i += chunk) {
            let temporary = assets.slice(i, i + chunk);
            this.#parsedCounts.assets += await assetParser.parse(temporary, !doimages);
            count++;
            if (!this.config.processArgs.argv.silent) await syslog.printProgress((i / assets.length) * 100);
        }
        if (!this.config.processArgs.argv.silent) await syslog.endProgress();
        Benchmarks.getInstance().markEnd('asset-parser');

        // Copy the generated images.
        Benchmarks.getInstance().markStart('copy-generated-images', 'Copying Generated Images');
        await this.copyGeneratedImages();
        Benchmarks.getInstance().markEnd('copy-generated-images');


        // Create the template parser.
        Benchmarks.getInstance().markStart('template-parser-early', 'Template Parser (Early)');
        let templateParser = new TemplateParser(this.config);

        // Early parse.
        syslog.notice(`Running early parse.`);
        this.#parsedCounts.templates += await templateParser.parse(others, 'early');
        let lateParsers = templateParser.notProcessed;
        Benchmarks.getInstance().markEnd('template-parser-early');

        // Sort taxonomies.
        await this._sortTaxonomies();

        // Late parse.
        Benchmarks.getInstance().markStart('template-parser-late', 'Template Parser (Late)');
        syslog.notice(`Running late parse.`);
        this.#parsedCounts.templates += await templateParser.parse(lateParsers, 'late');
        let lastParsers = templateParser.notProcessed;
        Benchmarks.getInstance().markEnd('template-parser-late');

        // Process taxonomies.
        Benchmarks.getInstance().markStart('taxonomies', 'Taxonomy Processing');
        syslog.notice(`Processing taxonomies.`);
        await this._processTaxonomies();
        Benchmarks.getInstance().markEnd('taxonomies');

        // Last parse.
        Benchmarks.getInstance().markStart('template-parser-last', 'Template Parser (Last)');
        syslog.notice(`Running last parse.`);
        this.#parsedCounts.templates += await templateParser.parse(lastParsers, 'last');
        Benchmarks.getInstance().markEnd('template-parser-last');

        // Now push everything through their layouts.
        Benchmarks.getInstance().markStart('layout-parser-early', 'Layout Parser (Early)');
        syslog.notice(`Parsing everything through layouts - early.`)
        await this.parseThroughLayoutAndWrite('early');
        Benchmarks.getInstance().markEnd('layout-parser-early');

        Benchmarks.getInstance().markStart('layout-parser-late', 'Layout Parser (Late)');
        syslog.notice(`Parsing everything through layouts - late.`)
        await this.parseThroughLayoutAndWrite('late');
        Benchmarks.getInstance().markEnd('layout-parser-late');

        Benchmarks.getInstance().markStart('layout-parser-last', 'Layout Parser (Last)');
        syslog.notice(`Parsing everything through layouts - last.`)
        await this.parseThroughLayoutAndWrite('last');
        Benchmarks.getInstance().markEnd('layout-parser-last');

        //syslog.inspect(this.config.schema, "warning");

        //syslog.inspect(Object.keys(this.config.navigation.top), "warning");

        // Finish up.
        syslog.notice(`Statico processing completed in ${(Date.now() - this.#startTime) / 1000} seconds.`);
        syslog.notice(`Processed ${this.#parsedCounts.templates} templates and ${this.#parsedCounts.assets} assets.`);
        syslog.notice('-'.repeat(50));

        this.isProcessing = false;

        Benchmarks.getInstance().markEnd('statico-process', true, true);
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
            if (!this.config.processArgs.argv.silent) syslog.printProgress(0);

            await Promise.all(this.config.toParseThroughLayout[parseName].map(async templateFile => {
                this.config.templateHandlers.getHandlerForExt(templateFile.ext).parseThroughLayoutAndWrite(templateFile);
                count++;
                if (!this.config.processArgs.argv.silent) syslog.printProgress((count/totalItems) * 100);
            }));    

            if (!this.config.processArgs.argv.silent) syslog.endProgress();
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
                if (!this.config.processArgs.argv.silent) syslog.printProgress(0, taxType);
            
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
                    if (!this.config.processArgs.argv.silent) syslog.printProgress((count / totalItems) * 100, taxType);

                }));

                if (!this.config.processArgs.argv.silent) syslog.endProgress;
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
        this.fsParser = new FsParser(this.#input, this.#input, patterns);
        let files = await this.fsParser.parse();
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
            if (this.config.processArgs.argv.silent) {
                await fsutils.copyDirAsync(from, to);
            } else {
                await fsutils.copyDirAsyncProgress(from, to);
            }
        }
    }


}

module.exports = Statico;