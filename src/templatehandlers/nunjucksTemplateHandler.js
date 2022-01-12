/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const TemplateHandler = require('./templateHandler');
const nunjucks = require('nunjucks');
const { syslog } = require('gajn-framework');
const StaticoTemplateHandlerError = require('./staticoTemplateHandlerError');
const striptags = require("striptags");
const TemplateFile = require('../templateFile');
const { fsutils } = require('gajn-framework');
const path = require('path');
const fs = require('fs');
const TemplatePathUrl = require('../templatePathUrl');
const beautify = require('js-beautify').html;

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
     * Constructor.
     * 
     * @param   {JSON}      config         Config.
     * 
     * @return  {NunjucksTemplateHandler}
     */
    constructor(config)
    {
        syslog.debug('Constructing NunjucksTemplateHandler', 'TemplateHandler:Nunjucks');
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
     * @param   {TemplateFile}    templateFile    Template file object.
     * 
     * @return
     */
    async process(templateFile)
    {
        let fp = templateFile.filePath.replace(this.sitePath, '');
        syslog.trace(`Nunjucks template handler is processing file: ${fp}`, 'TemplateHandler:Nunjucks');

        if (templateFile.data.content) {
            templateFile.data.content_html = this.renderString(templateFile.data.content, templateFile.data);
            templateFile.data.content_text = striptags(templateFile.data.content_html);
        }
        if (templateFile.data.excerpt) {
            templateFile.data.excerpt_html = this.renderString(templateFile.data.excerpt, templateFile.data);
            templateFile.data.excerpt_text = striptags(templateFile.data.excerpt_html);
        }
        if (templateFile.data.leader) {
            templateFile.data.leader_html = this.renderString(templateFile.data.leader, templateFile.data);
            templateFile.data.leader_text = striptags(templateFile.data.leader_html);
        }

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
