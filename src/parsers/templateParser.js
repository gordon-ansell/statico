/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog } = require('js-framework');
const TemplateFile = require('../templateFile');
const StaticoError = require('../staticoError');
const StaticoTemplateHandlerError = require('../templatehandlers/staticoTemplateHandlerError');
const CollectionDateSorted = require('../collectionDateSorted');
const BaseParser = require('./baseParser');
const Schema = require('statico-plugin-schemahelpers/src/schema/schema');
const debug = require('debug')('Statico:TemplateParser'),
      debugf = require('debug')('Full.Statico:TemplateParser');


/**
 * Exceptions.
 */
class StaticoTemplateParserError extends StaticoError {}

/**
 * Template parser class.
 */
class TemplateParser extends BaseParser
{
    /**
     * Files not processed.
     * @member {string[]}
     */
    notProcessed = [];

    /**
     * Constructor.
     * 
     * @param   {object}    config      Configs.
     * 
     * @return  {TemplateParser}
     */
    constructor(config)
    {
        super(config);
    }

    /**
     * Parser run.
     * 
     * @param   {string[]}  files       Files to parse.
     * @param   {string}    parseName   Parse name.
     * @param   {boolean}   paginate    Paginate?
     * @param   {object}    data        Additional data to parse.
     * 
     * @return  {number}
     */
    async parse(files, parseName = null, paginate = true, data = null)
    {
        let pn = parseName || 'NULL';
        this.notProcessed = [];
        this.paginators = [];

        let totalFiles = files.length;
        let count = 0;
        if (!this.config.processArgs.argv.silent) syslog.printProgress(0);

        await Promise.all(files.map(async element => {
            let trimmed = element.replace(this.config.sitePath, '');
            let ext = path.extname(element).substring(1);
            if (this.config.templateHandlers.hasHandlerForExt(ext))  {
                try {
                    debug(`Seeing if template for ${trimmed} is parseable (${pn}).`)
                    let tf = await this._parseTemplateFile(element, parseName, paginate, data);
                    if (null !== tf) {
                        this._addToCollections(tf);
                        debug(`${trimmed} was indeed parseable (${pn}).`)
                    } else {
                        debug(`Template file is null: ${trimmed}. This just means it won't be added to collections here.`);
                    }
                } catch (e) {
                    if (e instanceof StaticoTemplateHandlerError) {
                        syslog.error(`Failed to process ${trimmed}: ${e.message}`);
                    } else {
                        throw e;
                    }
                }
            } else {
                this._copyFile(element);
            }
            count++;
            if (!this.config.processArgs.argv.silent) syslog.printProgress((count/totalFiles) * 100);
        }));

        if (!this.config.processArgs.argv.silent) syslog.endProgress();

        return count;

    }

    /**
     * Parse file and return string output.
     * 
     * @param   {string[]}  file        File to parse.
     * @param   {string}    parseName   Parse name.
     * @param   {boolean}   paginate    Paginate?
     * @param   {object}    data        Additional data to parse.
     * 
     * @return  {TemplateFile}
     */
    async parseAndReturnString(file, parseName = null, paginate = true, data = null)
    {
        let trimmed = file.replace(this.config.sitePath, '');
        let ext = path.extname(file).substr(1);

        if (this.config.templateHandlers.hasHandlerForExt(ext))  {
            try {
                debug(`Seeing if template for ${trimmed} is parseable (${pn}).`);
                let tf;
                try {
                    tf = new TemplateFile(file, this.config, true, data);
                } catch (e) {
                    syslog.error(`Failed to construct template file for: ${trimmed}, ${e.message}`);
                }
                if (!tf) {
                    syslog.error(`Failed to create TemplateFile for ${file}`);
                } else {
                    await tf.load(parseName, paginate);
                    await this.config.events.emit('statico.abouttoparsetemplatefile', this.config, tf);
                    if (null === parseName || parseName === tf.data.parse) {
                        debug(`Passing control to template handler for ${ext}, for file ${trimmed}.`);
                        let handler = this.config.templateHandlers.getHandlerForExt(ext)
                        await handler.process(tf);
                        await this.config.events.emit('statico.parsedtemplatefile', this.config, tf);
                        return tf;
                    }
                }
            } catch (e) {
                if (e instanceof StaticoTemplateHandlerError) {
                    syslog.error(`Failed to process ${trimmed}: ${e.message}`);
                } else {
                    throw e;
                }
            }
        }

        return null;
    }

    /**
     * Parse a template file.
     * 
     * @param   {string}    filePath    Where the file is.
     * @param   {string}    parseName   The parse.  Either a parse name or null to force the parse.
     * @param   {boolean}   paginate    Paginate?
     * @param   {object}    data        Additional data to parse.
     * 
     * @return  {TemplateFile|null}     Template file or null.
     */
    async _parseTemplateFile(filePath, parseName, paginate = true, mightHaveLayout = true, data = null)
    {
        let trimmed = filePath.replace(this.config.sitePath, '');

        debug(`In _parseTemplateFile for ${trimmed}.`);

        let ext = path.extname(filePath).substring(1);
        if (this.config.templateHandlers.hasHandlerForExt(ext))  {
            debug(`Reconfirmed we have template handler for ${ext}, processing ${trimmed}.`);
            let tf;
            try {
                tf = new TemplateFile(filePath, this.config, mightHaveLayout, data);
            } catch (e) {
                syslog.error(`Failed to construct template file for: ${trimmed}, ${e.message}`);
            }
            if (!tf) {
                syslog.error(`Failed to create TemplateFile for ${filePath}`);
            }
            await tf.load(parseName, paginate);
            await this.config.events.emit('statico.abouttoparsetemplatefile', this.config, tf);
            if (null === parseName || parseName === tf.data.parse) {
                debug(`Passing control to template handler for ${ext}, for file ${trimmed}.`)
                let handler = this.config.templateHandlers.getHandlerForExt(ext)
                await handler.process(tf);
                if (!this.config.schema[tf.data.permalink]) {
                    this.config.schema[tf.data.permalink] = new Schema(this.config);
                }
                this.config.schema[tf.data.permalink].setCtx(tf.data);
                await this.config.events.emit('statico.parsedtemplatefile', this.config, tf);
                return tf;
            } else {
                this.notProcessed.push(filePath);
            }
        } else {
            throw new StaticoTemplateParserError(`No template handler found for extension '${ext}', processing file: ${filePath}`);
        }

        return null;
    }

    /**
     * Add a template to collections.
     * 
     * @param   {TemplateFile}  tf      Template file to add.
     * 
     * @return  {void}
     */
    async _addToCollections(tf)
    {
        if (!this.config.collections.all) {
            this.config.collections.all = new CollectionDateSorted('all');
        }

        if (!tf.data.permalink) {
            return;
        }

        if (this.config.collections.all.has(tf.data.permalink) && !this.config.watching) {
            throw new StaticoTemplateParserError(`We already have a template file for permalink '${tf.data.permalink}'.`);
        }

        this.config.collections.all.set(tf.data.permalink, tf);

        for (let idx in this.config.collectionSpec) {
            if (tf.data[idx]) {
                if (true === this.config.collectionSpec[idx]) {

                    // Create the collection if necessary.
                    if (!this.config.collections[idx]) {
                        this.config.collections[idx] = {};
                    }

                    // get a proper array of items.
                    let items = tf.data[idx];
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

                    // Add each item.
                    for (let entry of items) {
                        if (!this.config.collections[idx][entry]) {
                            this.config.collections[idx][entry] = new CollectionDateSorted(`${idx}:${entry}`);
                        }
                        this.config.collections[idx][entry].set(tf.data.permalink, tf);
                    }

                }
            }
        }

        if (tf.data.dynamic) {
            this.config.dynamicData[tf.data.permalink] = tf.data.dynamic;
        }
    }
}

module.exports = TemplateParser;
