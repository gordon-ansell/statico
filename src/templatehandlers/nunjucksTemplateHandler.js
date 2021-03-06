/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const TemplateHandler = require('./templateHandler');
const nunjucks = require('nunjucks');
const { syslog } = require('js-framework');
const StaticoTemplateHandlerError = require('./staticoTemplateHandlerError');
const striptags = require("striptags");
const TemplateFile = require('../templateFile');
const { fsutils } = require('js-framework');
const path = require('path');
const fs = require('fs');
const TemplatePathUrl = require('../templatePathUrl');
const beautify = require('js-beautify').html;
const debug = require('debug')('Statico:NunjucksTemplateHandler'),
      debugf = require('debug')('Full.Statico:NunjucksTemplateHandler');

class StaticoNunjucksTemplateHandlerError extends StaticoTemplateHandlerError {}

/**
 * Nunjucks template handler.
 */
class NunjucksTemplateHandler extends TemplateHandler
{
    /**
     * Template engine.
     * @member {object}
     */
    #engine = null;

    /**
     * Preprocessors.
     * @member {object[]}
     */
    #preprocessors = [];


    /**
     * Constructor.
     * 
     * @param   {JSON}      config         Config.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    constructor(config)
    {
        debug('Constructing NunjucksTemplateHandler');
        super(config);
        let loader;
        try {
            loader = new nunjucks.FileSystemLoader([this.layoutPath]);
        } catch (e) {
            throw new StaticoNunjucksTemplateHandlerError(`Could not construct Nunjucks loader.`, null, e);
        }

        let opts = this.config.templateHandlers.getHandlerField('nunjucks', 'engineOptions') || {};

        try {
            this.#engine = new nunjucks.Environment(loader, opts);
        } catch (e) {
            throw new StaticoNunjucksTemplateHandlerError(`Could not construct Nunjucks engine.`, null, e);           
        }

        this.#engine.addGlobal('config', config);
        this.addFilters();
        this.addShortcodes();
        this.addPairedShortcodes();

        if (config.preprocessors && config.preprocessors.nunjucks) {
            this.#preprocessors = config.preprocessors.nunjucks;
        }
    }

    /**
     * Add filters.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    addFilters()
    {
        let spec = this.config.templateHandlers.getHandlerSpec('nunjucks');

        if (('mods' in spec) && ('filters' in spec.mods)) { 
            for (let name in spec.mods.filters) {
                try {
                    this.#engine.addFilter(name, spec.mods.filters[name].func, spec.mods.filters[name].async);
                } catch (e) {
                    throw new StaticoNunjucksTemplateHandlerError(`Failed to load filter '${name}' into Nunjucks`, null, e);
                }
                syslog.info(`Added Nunjucks filter '${name}'.`);
            }
        } else {
            syslog.info('No filters to load into Nunjucks.');
        }
        return this;
    }

    /**
     * Add extensions.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    addExtensions()
    {
        let spec = this.config.templateHandlers.getHandlerSpec('nunjucks');

        if (('mods' in spec) && ('extensions' in spec.mods)) { 
            for (let name in spec.mods.extensions) {
                try {
                    this.#engine.addExtension(name, spec.mods.filters[name].func);
                } catch (e) {
                    throw new StaticoNunjucksTemplateHandlerError(`Failed to load extension '${name}' into Nunjucks`, null, e);
                }
                syslog.info(`Added Nunjucks extension '${name}'.`);
            }
        } else {
            syslog.info('No extensions to load into Nunjucks.');
        }
        return this;
    }

    /**
     * Add shortcode.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    addShortcodes()
    {
        let spec = this.config.templateHandlers.getHandlerSpec('nunjucks');

        if (('mods' in spec) && ('shortcodes' in spec.mods)) { 
            for (let name in spec.mods.shortcodes) {
                try {
                    this.#engine.addExtension(name, new spec.mods.shortcodes[name].func(name, this.config));
                } catch (e) {
                    throw new StaticoNunjucksTemplateHandlerError(`Failed to load shortcode '${name}' into Nunjucks: ${e.message}`, null, e);
                }
                syslog.info(`Added Nunjucks shortcode '${name}'.`);
            }
        } else {
            syslog.info('No shortcodes to load into Nunjucks.');
        }
        return this;
    }
 
    /**
     * Add paired shortcode.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    addPairedShortcodes()
    {
        let spec = this.config.templateHandlers.getHandlerSpec('nunjucks');

        if (('mods' in spec) && ('pairedshortcodes' in spec.mods)) { 
            for (let name in spec.mods.pairedshortcodes) {
                try {
                    this.#engine.addExtension(name, new spec.mods.pairedshortcodes[name].func(name, this.config, true));
                } catch (e) {
                    throw new StaticoNunjucksTemplateHandlerError(`Failed to load paired shortcode '${name}' into Nunjucks: ${e.message}`, null, e);
                }
                syslog.info(`Added Nunjucks paired shortcode '${name}'.`);
            }
        } else {
            syslog.info('No paired shortcodes to load into Nunjucks.');
        }
        return this;
    }
 
    /**
     * Process a file.
     * 
     * @param   {TemplateFile}      templateFile    Template file object.
     * @param   {string[]|null}     incremental     Incremental build?
     * 
     * @return
     */
    async process(templateFile, incremental = null)
    {
        let fp = templateFile.filePath.replace(this.sitePath, '');
        debug(`Nunjucks template handler is processing file: ${fp}`);


        // Preprocess?
        if (this.#preprocessors && this.#preprocessors.length > 0) {
                    
            let rss = this.config.rssBuildSeparateContent || false;

            for (let pp of this.#preprocessors) {
                if (rss && templateFile.data.contentRss) {
                    templateFile.data.contentRss = await pp.preprocessString(templateFile.data.contentRss, 
                    templateFile.data.permalink, 
                    templateFile.filePath, true);
                }
                if (templateFile.data.content) {
                    templateFile.data.content = await pp.preprocessString(templateFile.data.content, 
                    templateFile.data.permalink, 
                    templateFile.filePath);
                }
            }
        }

        let compile = {
            content: false,
            excerpt: false,
            leader: false
        };
        for (let fld of ['content', 'excerpt', 'leader']) {
            if (templateFile.data[fld]) {
                let f = templateFile.data[fld];
                compile[fld] = f.indexOf('{{') || f.indexOf('{%') || f.indexOf('{#');
            }
        }

        if (templateFile.data.content) {
            if (compile.content) {
                templateFile.data.content_html = this.renderString(templateFile.data.content, templateFile.data);
            }
            templateFile.data.content_text = striptags(templateFile.data.content_html);
        }
        if (templateFile.data.excerpt) {
            if (compile.excerpt) {
                templateFile.data.excerpt_html = this.renderString(templateFile.data.excerpt, templateFile.data);
            }
            templateFile.data.excerpt_text = striptags(templateFile.data.excerpt_html);
        }
        if (templateFile.data.leader) {
            if (compile.leader) {
                templateFile.data.leader_html = this.renderString(templateFile.data.leader, templateFile.data);
            }
            templateFile.data.leader_text = striptags(templateFile.data.leader_html);
        }

        await this.config.events.emit('statico.parsedtemplatefile', this.config, templateFile);

        if (!this.config.toParseThroughLayout) {
            this.config.toParseThroughLayout = {};
        }
        let parseName = 'early';
        if ('late' == templateFile.data.parse) {
            //syslog.warning(`Adding to late layout parse: ${templateFile.filePath}`)
            parseName = 'late';
        }
        if (!this.config.toParseThroughLayout[parseName]) {
            this.config.toParseThroughLayout[parseName] = [];
        }
        this.config.toParseThroughLayout[parseName].push(templateFile);

        /*
        if ((incremental && incremental.includes(templateFile.filePath)) || !incremental) {
            if (incremental && incremental.includes(templateFile.filePath)) {
                syslog.notice(`File ${templateFile.filePath} being processed incrementally.`);
            }
            this.parseThroughLayoutAndWrite(templateFile);
        } else {
            syslog.info(`Skipping ${templateFile.filePath} write for incremental build.`);
        }

        await this.config.events.emit('statico.parsedlayout', this.config, templateFile);
        */
    }

    /**
     * Parse through layout and write.
     * 
     * @param   {TemplateFile}  templateFile    Template file to parse.
     * @param   {boolean}       justReturn      Just return the rendered data?
     * 
     * @return  {string|null}
     */
    async parseThroughLayoutAndWrite(templateFile, justReturn = false)
    {
        let fp = templateFile.filePath.replace(this.sitePath, '');
        let rendered;

        // Deal with the layout.
        if (templateFile.data.layout) {
            if (!templateFile.layoutPath) {
                throw new StaticoNunjucksTemplateHandlerError(`File ${templateFile.filePath} has a layout (${templateFile.data.layout}) but no layout path.`);
            }
            let layoutTemplateFile = new TemplateFile(templateFile.layoutPath, this.config);
            let layoutHandler = this.config.templateHandlers.getHandlerForExt(layoutTemplateFile.ext);
            rendered = layoutHandler.renderFile(templateFile.layoutPath, templateFile.data);
        } else {
            rendered = templateFile.data.content_html;
        }

        if (justReturn) {
            return rendered;
        } else {
            this.writeFile(beautify(rendered), templateFile.outputPath, fp);
            return null;
        }
    }

    /**
     * Render a string with the given data.
     * 
     * @param   {string}    str     String to render.
     * @param   {JSON}      data    Data to render.
     * 
     * @return  {string}
     */
    renderString(str, data = {})
    {
        let rendered;
        try {
            rendered = this.#engine.renderString(str, data);
        } catch (e) {
            syslog.inspect(str, "error");
            throw new StaticoNunjucksTemplateHandlerError(`Nunjucks engine failed to render string: ${e.message}.\n` +
                this._getUsefulErrDetails(e.message), null, e);           
        }
        return rendered;
    }

    /**
     * Render a file with the given data.
     * 
     * @param   {string}    filePath    Path to file to render.
     * @param   {JSON}      data        Data to render.
     * 
     * @return  {string}
     */
    renderFile(filePath, data = {})
    {
        let rendered;
        try {
            rendered = this.#engine.render(filePath, data);
        } catch (e) {
            throw new StaticoNunjucksTemplateHandlerError(
                `Nunjucks engine failed to render file through ${filePath}: ${e.message}.\n` + 
                this._getUsefulErrDetails(e.message), null, e);           
        }
        return rendered;
    }

    /**
     * Get the useful information from an error.
     * 
     * @param   {string}    errMessage      Error message.
     * @return  {string}                    Useful stuff.
     */
    _getUsefulErrDetails(errMessage)
    {
        let ret = [];
        let lines = errMessage.split('\n');

        for (let line of lines) {
            if (line.includes('(unknown path)')) {
                continue;
            }
            ret.push(line);
        }

        if (ret.length == 0) {
            ret.push("No error information present.");
        }

        if (errMessage.includes("attempted to output null or undefined value")) {
            ret.push("\t==> This will most likely be a logic error in your template.");
            ret.push("\t==> Check everything between the '{' and '}' characters and the odds are you'll find something wrong.");
            ret.push("\t==> A mistyped variable name or spurious '%' are good candidates.");
        }

        return ret.join('\n');

    }
 
}

module.exports = NunjucksTemplateHandler;
