/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, merge, pathUtils, FsParser, YamlFile } = require('js-framework');
const { EventManager, CacheManager } = require('js-framework');
const fs = require('fs');
const os = require('os');
const path = require('path');
const StaticoError = require('./staticoError');
const MarkdownTemplateHandler = require('./templatehandlers/markdownTemplateHandler');
const NunjucksTemplateHandler = require('./templatehandlers/nunjucksTemplateHandler');
const defaultFilters = require('./filters/defaultFilters')
const defaultShortcodes = require('./shortcodes/defaultShortcodes')
const defaultSchemaShortcodes = require('./shortcodes/schema/defaultSchemaShortcodes')
const HandlerCollection = require('./handlerCollection');
const NunjucksImagePreprocessor = require('./preprocessors/nunjucksImagePreprocessor');
const NunjucksCommentPreprocessor = require('./preprocessors/nunjucksCommentPreprocessor');
const { URL } = require('url');
const dateformat = require('dateformat');
const ImageInfoStore = require('./imageInfoStore');
const debug = require('debug')('Statico:Config'),
      debugf = require('debug')('Full.Statico:Config');


/**
 * Config class.
 */
class Config
{
    /**
     * Default config.
     * @member {object}
     */
    defaultConfig = {};

    /**
     * User data.
     * @member {object}
     */
    userData = {};

    /**
     * Data dir data.
     * @member {object}
     */
    dataDirData = {};

    /**
     * Site path.
     * @member {string}
     */
    sitePath = null;

    /**
     * Site path.
     * @member {string}
     */
    outputPath = null;

    /**
     * Process arguments.
     * @member {ProcessArgs}
     */
    processArgs = null;

    /**
     * Run mode.
     * @member {string}
     */
    runMode = null;

    /**
     * Constructor.
     * 
     * @param   {string}        sitePath        Path to the site.
     * @param   {string}        outputPath      Path to output location.
     * @param   {ProcessArgs}   args            Process arguments.
     * @param   {string}        runMode         Mode we're running in (from STATICO_MODE in env).
     * 
     * @return  {Config}
     */
    constructor(sitePath, outputPath, args, runMode)
    {
        // Save the site path.
        this.sitePath = sitePath;

        // Save the output path.
        this.outputPath = outputPath;

        // Save the process args.
        this.processArgs = args;

        // Save the run mode.
        this.runMode = runMode;

        // Create a new empty data container.
        this.reset();

        // Load the default config.
        this.loadDefaultConfig();
    }

    /**
     * Get the resets.
     * 
     * @return  {JSON}
     */
    _getResets()
    {
        return {
            fsParserFilters: {},
            plugins: [],
            callables: {},
            events: new EventManager([
                'statico.init.postbaseconfig',
                'statico.init.finished',
                'statico.parsedfilesystem',
                'statico.preparseassetfile',
                'statico.abouttoparsetemplatefile',
                'statico.parsedtemplatefile',
                'statico.parsedlayout'
            ]),
            templateHandlers: new HandlerCollection(),
            assetHandlers: new HandlerCollection(),
            layoutDir: undefined,
            hostname: os.hostname(),
            mode: this.runMode,
            assetsDir: 'assets',
            assetsPath: null,
            cacheDir: '_cache',
            cachePath: undefined,
            cacheAssets: true,
            doNotCacheAssetExts: ['scss'],
            assetCacheFile: '.cache.json',
            assetCacheHandler: undefined,
            collections: {},
            tempDir: '_tmp',
            watching: false,
            inlineCss: {},
            postsInFeed: 20,
            watcher: {},
            dynamicData: {},
            imageInfoStore: new ImageInfoStore(this),
            schema: {}
        };        
    }

    /**
     * Get images for a permalink.
     * 
     * @param   {string}    permalink   Permalink to get data for.
     * @return  {string[]} 
     */
    getImagesForPost(permalink)
    {
        if (!this.imagesSaved || !this.imagesSaved[permalink]) {
            return [];
        }

        return this.imagesSaved[permalink];
    }

    /**
     * Get the featured image for a permalink.
     * 
     * @param   {string}    permalink   Permalink to get data for.
     * @param   {string}
     */
    guessFeaturedImageForPost(permalink)
    {
        let selectedExt;
        let possibles = this.getImagesForPost(permalink);

        if (possibles.length > 0) {
            let exts = [];

            // Extract the types (by extension).
            for (let item of possibles) {
                exts.push(path.extname(item));
            }

            exts = Array.from([...new Set(exts)]);

            if (exts.length > 1) {
                if (exts.includes('.jpg')) {
                    selectedExt = '.jpg';
                } else if (exts.includes('.jpeg')) {
                    selectedExt = '.jpeg';
                } else if (exts.includes('.png')) {
                    selectedExt = '.png';
                } else {
                    selectedExt = exts[0];
                }
            } else {
                selectedExt = exts[0];
            }
        }

        let filtered = possibles.filter(item => {
            return path.extname(item) == selectedExt;
        });

        if (filtered.length > 0) {
            return filtered[0];
        }

        return '';
    }

    /**
     * Add a callable.
     * 
     * @param   {string}    name    Name of callable.
     * @param   {callable}  func    Function to call.
     * 
     * @return  {config}
     */
    addCallable(name, func)
    {
        this.callables[name] = func;
        return this;
    }

    /**
     * Call a callable.
     * 
     * @param   {string}    name    Name of callable.
     * @param   {arguments} args    Arguments to pass.
     * 
     * @return  {mixed}
     */
    callCallable(name, ...args)
    {
        if (this.callables[name]) {
            try {
                return this.callables[name](...args);
            } catch (e) {
                syslog.error(`Callable '${name}' failed: ${e.message}`);
            }
        } else {
            throw new StaticoError(`No callable with the name '${name}' exists.`)
        }
    }

    /**
     * Add a preprocessor.
     * 
     * @param   {string}        tplh    Template handler to add it to.
     * @param   {object}        inst    Callable class instance.
     * 
     * @return  {Config}     
     */
    addPreprocessor(tplh, inst)
    {
        if (!this.preprocessors) {
            this.preprocessors = {};
        }

        if (!this.preprocessors[tplh]) {
            this.preprocessors[tplh] = [];
        }

        this.preprocessors[tplh].push(inst);

        return this;
    }

    /**
     * Add a built-in preprocessor.
     * 
     * @param   {string}        tplh    Template handler to add it to.
     * @param   {string}        name    Name of preprocessor.
     * 
     * @return  {Config}     
     */
    addBuiltInPreprocessor(tplh, name)
    {
        let cns = {
            nunjucks_image: NunjucksImagePreprocessor,
            nunjucks_comment: NunjucksCommentPreprocessor
        }

        if (!cns[name]) {
            throw new StaticoError(`No built-in preprocessor with name '${name}' found.`);
        }

        syslog.info(`Adding ${name} preprocessor to ${tplh}.`);
        return this.addPreprocessor(tplh, new cns[name](this));
    }

    /**
     * Add some inline CSS.
     * 
     * @param   {string}    name    Name.
     * @param   {string}    css     CSS to add.
     * 
     * @return  {Config}
     */
    addInlineCss(name, css)
    {
        this.inlineCss[name] = css;
        return this;
    }

    /**
     * Render inline CSS.
     * 
     * @return  {string}
     */
    renderInlineCss()
    {
        if (0 == Object.keys(this.inlineCss).length) {
            return '';
        }

        let ret = '<style>\n'; 
        ret += '/* ================================== */\n';
        ret += '/* INLINE CSS                         */\n';
        ret += '/* ================================== */\n';
        for (let name in this.inlineCss) {
            ret += '/* ' + name + '*/\n';
            ret += this.inlineCss[name] + '\n';
        }
        ret += '</style>\n';
        return ret;
    }

    /**
     * See if we have a callable.
     * 
     * @param   {string}    name    Name to test.
     * @return  {boolean}
     */
    hasCallable(name)
    {
        return (name in this.callables);
    }

    /**
     * Reset the config data.
     */
    reset()
    {
        let r = this._getResets();
        for (let k in r) {
            this[k] = r[k];
        } 
        this.cachePath = path.join(this.sitePath, this.cacheDir);
        if (this.cacheAssets && this.assetCacheFile) {
            this.assetCachePath = path.join(this.sitePath, this.assetCacheFile);
            this.assetCacheHandler = new CacheManager(this.assetCachePath, {basePath: this.sitePath});
        }
    }

    /**
     * Add the built-in template handlers.
     * 
     * @return  {Config}
     */
    addBuiltInTemplateHandlers()
    {
        // Markdown.
        this.templateHandlers.addHandler('markdown', new MarkdownTemplateHandler(this), ['md', 'markdown']);

        // Nunjucks.
        this.templateHandlers.addHandler('nunjucks', new NunjucksTemplateHandler(this), ['njk']);

        return this;
    }

    /**
     * Add the default filters.
     * 
     * @return  {Config}
     */
    loadDefaultFilters()
    {
        defaultFilters.call(this, this);
    }

    /**
     * Add the default shortcodes.
     * 
     * @return  {Config}
     */
    loadDefaultShortcodes()
    {
        defaultShortcodes.call(this, this);
    }

    /**
     * Add the default schema shortcodes.
     * 
     * @return  {Config}
     */
    loadDefaultSchemaShortcodes()
    {
        defaultSchemaShortcodes.call(this, this);
    }

    /**
     * Load everything from the data directories.
     * 
     */
    async loadDataDirectory()
    {
        let patterns =  {
            allowPaths: undefined,
            ignorePaths: ['__'],
            ignoreDirs: ['__'],
            allowFiles: undefined,
            ignoreFiles: ['.'],
            ignoreFilesFirst: ['__'],
            ignoreExts: undefined,
        };

        this.fsParser = new FsParser(path.join(this.sitePath, '_data'), this.sitePath, patterns);
        let files = await this.fsParser.parse();

        let data = {};
        
        for (let file of files) {
            let newData = this.loadFile(file);
            let relPath = file.replace(path.join(this.sitePath, '_data'), '').replace(/\.[^/.]+$/, "");

            relPath = pathUtils.removeLeadingSlash(relPath);
            let sp = relPath.split('/');
            let ptr = data;

            for (let part of sp) {
                if (!part.startsWith('_')) {
                    if (!ptr[part]) {
                        ptr[part] = {};
                    }
                    ptr = ptr[part];
                }
            }

            for (let idx of Object.keys(newData)) {
                ptr[idx] = newData[idx];
            }
        }

        this.dataDirData = data;

        //syslog.inspect(this.dataDirData, "error");
    }

    /**
     * Load a config file.
     * 
     * @param   {string}        filePath        Path to file to load.
     * @param   {Config}        config          Config object passed if config file is a function.
     * 
     * @return  {JSON}
     */
    loadFile(filePath, config)
    {
        let ext = path.extname(filePath);
        let newConfig;
        if ('.yaml' === ext) {
            let ym = new YamlFile(filePath);
            newConfig = ym.parse();
        } else {
            newConfig = require(filePath);
        }
        if ("function" === typeof newConfig) {
            try {
                newConfig = newConfig.call(this, this);
            } catch (e) {
                throw new StaticoError(`Failed to load config file at: ${filePath}: ${e.message}`, null, e);
            }
        } else {
            //throw new StaticoError(`Config file at ${filePath} is of the wrong type.`);
        }
        debug(`Loaded config file '${filePath}'.`);
        return newConfig;
    }

    /**
     * Merge the base configs into the final data.
     * 
     * @return  {void}
     */
    mergeBaseConfigs()
    {
        let result = merge.mergeMany([this, this.defaultConfig, this.dataDirData, this.userData]);
        syslog.inspect(result, "error");
        for (let k in result) {
            this[k] = result[k];
        }
        if (this.templateHandlerDefaults) {
            this.templateHandlers.loadDefaults(this.templateHandlerDefaults);
        }
        if (this.assetHandlerDefaults) {
            this.assetHandlers.loadDefaults(this.assetHandlerDefaults);
        }

        if (this.logLevel) {
            syslog.setLevel(this.logLevel);
        }

        if (this.logContexts) {
            syslog.addContexts(this.logContexts);
        }

    }

    /**
     * Get the correct assets path for something.
     * 
     * @param   {string}    ass     Input asset - should be a root relative dir.
     * 
     * @return  {string}
     */
    asset(ass)
    {
        // If we're passed and absolute path with an appropriate domain, just return.
        if (ass.startsWith('http')) {
            return ass;
        }

        // First see if it already begins with the assets dir. If not, add it.
        if (this.assetsDir) {
            let tmp = pathUtils.removeBothSlashes(ass);
            if (!tmp.startsWith(pathUtils.removeBothSlashes(this.assetsDir))) {
                ass = path.join(this.assetsDir, ass);
            }
        }

        ass = pathUtils.addLeadingSlash(ass);

        // If we have an assets path, put that at the start.
        if (this.assetsPath) {
            let u = new URL(ass, this.assetsPath);
            ass = u.toString();
        }

        return ass;
    }

    /**
     * Qualify a URL.
     * 
     * @param   {string}    path    Path to qualify.
     * 
     * @return  {string}
     */
    qualify(path)
    {
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        return new URL(path, this.hostname).href;
    }

    /**
     * Unqualify a URL.
     * 
     * @param   {string}    path    Path to qualify.
     * 
     * @return  {string}
     */
    unqualify(path)
    {
        if (!path.startsWith(this.hostname)) {
            return path;
        }

        path = path.replace(this.hostname, '');

        return new URL(path, this.hostname).path;
    }

     /**
     * Load the default config.
     * 
     * @return {void}
     */
    loadDefaultConfig() 
    {
        try {
            this.defaultConfig = this.loadFile('./defaultConfig.js', this);
            if (this.defaultConfig.templateHandlerDefaults) {
                this.templateHandlers.loadDefaults(this.defaultConfig.templateHandlerDefaults);
            }
            if (this.defaultConfig.assetHandlerDefaults) {
                this.assetHandlers.loadDefaults(this.defaultConfig.assetHandlerDefaults);
            }
        } catch (e) {
            syslog.inspect(this.templateHandlers, "warning");
            throw new StaticoError(`Failed to load default config: ${e.message}`);
        }
    }

    /**
     * Load the project configs.
     * 
     * @return {void}
     */
    loadSiteConfig()
    {
        let p = path.join(this.sitePath, '.statico.js');
        if (fs.existsSync(p)) {
            this.userData = this.loadFile(p, this);
        } else {
            syslog.warning(`No site config found at ${p}.`);
        }
    }

    /**
     * Collate the process args with the config.
     * 
     * @return  {void}
     */
    collateProcessArgs()
    {
        // Mode from .env?
        //let mode = this.runMode;
        /*
        if (process.env.MODE) {
            mode = process.env.MODE;
        }
        */

        // Establish the mode.
        /*
        if (this.processArgs.argv.dev) {
            mode = 'dev';
        } else if (this.processArgs.argv.staging) {
            mode = 'staging';
        } else if (this.processArgs.argv.prod) {
            mode = 'prod';
        }
        */

        this.mode = this.runMode;

        // Mode related stuff.
        if (this.modes && this.modes[this.mode]) {

            // Hostname.
            if (this.modes[this.mode]['hostname']) {
                let hostname = this.modes[this.mode]['hostname'];
                if (this.modes[this.mode]['ssl']) {
                    hostname = 'https://' + hostname;
                } else {
                    hostname = 'http://' + hostname;
                }
                this.hostname = hostname;
            }
        }

    }


    /**
     * Add a plugin.
     * 
     * @param   {string}        plugin          Plugin.
     * @param   {JSON}          options         Plugin options.
     * 
     * @return  {Config}
     */
    addPlugin(plugin, options)
    {
        this.plugins.push({plugin, options});
        this.callPlugin(plugin, options);
        return this;
    }

    /**
     * Call a plugin.
     * 
     * @param   {string}        plugin          Plugin.
     * @param   {JSON}          options         Plugin options.
     * 
     * @return  {Config}
     */
    callPlugin(plugin, options)
    {
        if ("function" === typeof plugin) {
            try {
                plugin(this, options);
            } catch (e) {
                throw new StaticoError(`Failed to load plugin: ${e.message}`, null, e);
            }
        } else {
            throw new StaticoError(`Invalid plugin. It should be a function.`);
        }

        return this;
    }

    /**
     * Call all plugins.
     */
    callAllPlugins()
    {
        for (let plugin of this.plugins) {
            this.callPlugin(plugin, {});
        }
    }

    /**
     * Add a nunjucks filter.
     * 
     * @param   {string}    name        Name of filter.
     * @param   {callable}  func        Function to call.
     * @param   {boolean}   preserve    Preserve?
     * @param   {boolean}   isasync     Asynchronous filter?    
     * 
     * @return  {Config}
     */
    addNunjucksFilter(name, func, preserve = false, isasync = false)
    {
        let thn = 'nunjucks';

        if (this.templateHandlers[thn] && this.templateHandlers[thn].mods &&
            this.templateHandlers[thn].mods.filters && this.templateHandlers[thn].mods.filters[name]) {

            let test = this.templateHandlers[thn].mods.filters[name];
            if (true === test.preserve) {
                syslog.info(`Will not override '${thn}' Nunjucks filter as it is preserved.`);
                return this;
            }   
        }

        if (!(thn in this.templateHandlers)) {
            this.templateHandlers[thn] = {};
        }

        if (!('mods' in this.templateHandlers[thn])) {
            this.templateHandlers[thn].mods = {};
        }

        if (!('filters' in this.templateHandlers[thn].mods)) {
            this.templateHandlers[thn].mods.filters = {};
        }

        this.templateHandlers[thn].mods.filters[name] = {func: func, preserve: preserve, isasync: isasync};

        return this;
    }

    /**
     * Add a nunjucks shortcode.
     * 
     * @param   {string}    name        Name of filter.
     * @param   {callable}  func        Function to call.
     * @param   {boolean}   preserve    Preserve?
     * 
     * @return  {Config}
     */
    addNunjucksShortcode(name, func, preserve = false)
    {
        let thn = 'nunjucks';

        if (this.templateHandlers[thn] && this.templateHandlers[thn].mods &&
            this.templateHandlers[thn].mods.shortcodes && this.templateHandlers[thn].mods.shortcodes[name]) {

            let test = this.templateHandlers[thn].mods.shortcodes[name];
            if (true === test.preserve) {
                syslog.info(`Will not override '${name}' Nunjucks shortcode as it is preserved.`);
                return this;
            }   
        }

        if (!(thn in this.templateHandlers)) {
            this.templateHandlers[thn] = {};
        }

        if (!('mods' in this.templateHandlers[thn])) {
            this.templateHandlers[thn].mods = {};
        }

        if (!('shortcodes' in this.templateHandlers[thn].mods)) {
            this.templateHandlers[thn].mods.shortcodes = {};
        }

        this.templateHandlers[thn].mods.shortcodes[name] = {func: func, preserve: preserve};

        return this;
    }

    /**
     * Add a nunjucks paired shortcode.
     * 
     * @param   {string}    name        Name of filter.
     * @param   {callable}  func        Function to call.
     * @param   {boolean}   preserve    Preserve?
     * 
     * @return  {Config}
     */
    addNunjucksPairedShortcode(name, func, preserve = false)
    {
        let thn = 'nunjucks';

        if (this.templateHandlers[thn] && this.templateHandlers[thn].mods &&
            this.templateHandlers[thn].mods.pairedshortcodes && this.templateHandlers[thn].mods.pairedshortcodes[name]) {

            let test = this.templateHandlers[thn].mods.pairedshortcodes[name];
            if (true === test.preserve) {
                syslog.info(`Will not override '${name}' Nunjucks paired shortcode as it is preserved.`);
                return this;
            }   
        }

        if (!(thn in this.templateHandlers)) {
            this.templateHandlers[thn] = {};
        }

        if (!('mods' in this.templateHandlers[thn])) {
            this.templateHandlers[thn].mods = {};
        }

        if (!('pairedshortcodes' in this.templateHandlers[thn].mods)) {
            this.templateHandlers[thn].mods.pairedshortcodes = {};
        }

        this.templateHandlers[thn].mods.pairedshortcodes[name] = {func: func, preserve: preserve};

        return this;
    }
 
    /**
     * Add a nunjucks extension.
     * 
     * @param   {string}    name        Name of extension.
     * @param   {callable}  func        Function to call.
     * @param   {boolean}   preserve    Preserve?
     * 
     * @return  {Config}
     */
    addNunjucksExtension(name, func, preserve = false)
    {
        let thn = 'nunjucks';

        if (this.templateHandlers[thn] && this.templateHandlers[thn].mods &&
            this.templateHandlers[thn].mods.extensions && this.templateHandlers[thn].mods.extensions[name]) {

            let test = this.templateHandlers[thn].mods.extensions[name];
            if (true === test.preserve) {
                syslog.warning(`Will not override '${thn}' Nunjucks extension as it is preserved.`);
                return this;
            }   
        }

        if (!(thn in this.templateHandlers)) {
            this.templateHandlers[thn] = {};
        }

        if (!this.hasTemplateHandlerField(thn, 'mods')) {
            this.templateHandlers[thn].mods = {};
        }

        if (!('extensions' in this.templateHandlers[thn].mods)) {
            this.templateHandlers[thn].mods.extensions = {};
        }

        this.templateHandlers[thn].mods.extensions[name] = {func: func, preserve: preserve};

        return this;
    }

    /**
     * Convert an ISO date to the readable format specified here.
     * 
     * @param   {string}    dt  Input date.
     * @return  {string}        Formatted date. 
     */
    convertDate(dt)
    {
        let dobj = new Date(dt);
        return dateformat(dobj, this.dispDate) + ', ' + dateformat(dobj, this.dispTime);
    }

    /**
     * Count taxonomies in a post.
     * 
     * @param   {templateFile}  post        Post to count in.
     * @param   {string}        taxType     Taxonomy to count.
     * 
     * @return  {number}
     */
    taxcount(post, taxType)
    {
        if (!post.data[taxType]) {
            return 0;
        }

        let items = post.data[taxType];

        if (0 === items.length) {
            return 0;
        }

        if (!Array.isArray(items)) {
            if ("string" == typeof items) {
                if (items.includes(',')) {
                    items = items.split(',');
                } else {
                    items = [items];
                }
            } else {
                items = [items];
            }
        }

        return items.length;
    }
 
}

module.exports = Config;