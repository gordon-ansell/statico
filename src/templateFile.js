/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const fs = require('fs');
const { syslog, MultiDate, merge } = require('gajn-framework');
const matter = require('gray-matter');
const StaticoError = require('./staticoError');
const path = require('path');
const cloneDeep = require('lodash.clonedeep');
const TemplatePathUrl = require('./templatePathUrl');
const Pagination = require('./pagination');

/**
 * Exceptions.
 */
class StaticoTemplateFileError extends StaticoError {}

/**
 * A single template file.
 */
class TemplateFile
{
    /**
     * Path to the file.
     * @member {string}
     */
    filePath = null;

    /**
     * Extension.
     * @member {string}
     */
    ext = null;

    /**
     * Configs.
     * @member {Config}
     */
    config = {};

    /**
     * 'Live' data.
     * @member {object}
     */
    data = {};

    /**
     * Base data.
     * @member {object}
     */
    baseData = {};

    /**
     * File data.
     * @member {object}
     */
    fileData = {};

    /**
     * Layout data.
     * @member {object}
     */
    layoutData = {};

    /**
     * Might have a layout?
     * @member {object}
     */
    mightHaveLayout = true;

    /**
     * Is this a buffer?
     * @member {boolean}
     */
    isBuffer = false;

    /**
     * Constructor.
     * 
     * @param   {string}        filePath            Path to the file.
     * @param   {Config}        cfg                 Configs.
     * @param   {boolean}       mightHaveLayout     Might we?
     * 
     * @return  {TemplateFile}
     */
    constructor(filePath, config, mightHaveLayout = true)
    {
        syslog.trace(`In TemplateFile constructor for ${filePath}`, 'TemplateFile');
        if (!filePath) {
            throw new StaticoTemplateFileError(`No filePath passed to TemplateFile constructor.`);
        }
        this.filePath = filePath;
        this.ext = path.extname(filePath).substr(1);
        this.config = config;
        this.baseData = cloneDeep(config.userData);
        this.mightHaveLayout = mightHaveLayout;
        //this.data.collections = config.collections;
    }

    /**
     * Dump the useful data.
     *
     * @return  {object}
     */
    dump()
    {
        return {
            base: this.baseData,
            layout: this.layoutData,
            file: this.fileData,
            combined: this.data
        };
    }

    /**
     * Generate the output location.
     * 
     * @return  {string[]}     [outputPath, permalink]
     */
    generateOutputLocation()
    {        
        let tpPathUrl = new TemplatePathUrl(this.filePath, this.config, this.data.permalink, this.data.outputFileName);
        [this.outputPath, this.data.permalink] = tpPathUrl.generateOutputLocations();
    }

    /**
     * Process things.
     * 
     * @param   {string}    parseName   What parse is this.
     * @param   {boolean}   paginate    Want pagination?
     */
    async load(parseName, paginate = true)
    {
        // Read the file and separate all its bits.
        this.fileData = await this.read(this.filePath);

        //if (this.mightHaveLayout) {
            // Add the layout specs.
            this.fileData = await this.addLayoutSpecs(this.fileData);
        //} 

        // If we have a layout, load the specs up from that.
        if ('layoutPath' in this.fileData) {
            //syslog.warning(`We have layout path ${this.fileData.layoutPath} for ${this.filePath}`);
            this.layoutData = await this.read(this.fileData.layoutPath);
            delete this.layoutData.content;
        }

        // Merge it all.
        this.data = merge.mergeMany([this.baseData, this.layoutData, this.fileData]);
        this.data.cfg = this.config;
        this.data.templateFile = this;

        if (null === parseName || this.data.parse == parseName) {

            // Frig the dates.
            this.frigDates();

            // Generate the output location.
            this.generateOutputLocation();

            // Pagination?
            if (paginate && this.data.pagination) {
                await this.pagination();
            } else if (this.data.pagination) {
                let pager = new Pagination(this.data.pagination, this.config, this.filePath);
                pager.calculatePaging();
            }
        }
    }

    /**
     * Pagination?
     * 
     * @return  {Pagination}
     */
    async pagination()
    {
        if (!this.data.pagination) {
            return;
        }

        let opts = this.data.pagination;

        if (!opts.data) {
            throw new StaticoTemplateFileError(`Pagination object has no data. Processing: ${this.filePath}`);
        }

        let pager = new Pagination(opts, this.config, this.filePath);
        pager.calculatePaging();
        pager.prevNext();
        await pager.createPages(this);

        return pager;

        //syslog.inspect(Object.keys(pager.data), "warning");
    }

    async createPages()
    {
        await this.data.pager.createPages(this)
    }

    /**
     * Clone original.
     */
    cloneOriginal(extra = {}, base = {})
    {
        let content = this.fileData.content;
        let newData = cloneDeep(merge.merge(this.fileData, extra));
        for (let idx in base) {
            this[idx] = base[idx];
        }
        delete newData.content;
        return matter.stringify(content, newData);
    }

    /**
     * Read the file and separate the various bits out.
     * 
     * @param   {string}    fp  Filepath to read.
     * 
     * @return  {object}
     */
    async read(fp)
    {
        let fileContents = await this.readFile(fp);

        let ret = {};

        if (fileContents) {
            let extracted;
            try {
                extracted = await matter(fileContents, this.config.frontMatterOptions);
            } catch (e) {
                throw new StaticoTemplateFileError(`Cannot extract front-matter from ${this.filePath}: ${e.message}`, null, e);
            }

            for(let field of ['content', 'excerpt']) {
                if (field in extracted) {
                    ret[field] = extracted[field];
                }
            }
            if ('data' in extracted) {
                for (let field in extracted.data) {
                    ret[field] = extracted.data[field];
                }
            }
        }

        return ret;
    }

    /**
     * Add layout specs.
     * 
     * @param   {object}    inputData   Input data.
     * 
     * @return  {object}
     */
    async addLayoutSpecs(inputData)
    {
        let ret = inputData;

        if (!inputData.layout) {
            let spec = this.config.templateHandlers.getHandlerSpecForExt(this.ext) || null;
            if (spec && spec.userOptions && spec.userOptions.defaultLayout) {
                ret.layout = spec.userOptions.defaultLayout;
            }
        }

        if (ret.layout) {
            let layoutPath = path.join(this.config.sitePath, this.config.layoutDir, ret.layout);
            if (!inputData.layout.includes('.')) {
                let spec = this.config.templateHandlers.getHandlerSpecForExt(this.ext) || null;
                if (spec.userOptions && spec.userOptions.templateOptions && spec.userOptions.templateOptions.handlerExt) {
                    layoutPath = layoutPath + '.' + spec.userOptions.templateOptions.handlerExt;
                } else {
                    throw new StaticoTemplateFileError(`Cannot find extension for layout '${ret.layout}' in file '${this.filePath}'.`);
                }
            } 
            ret.layoutPath = layoutPath;
        } else {
            syslog.trace(`No layout found for ${this.filePath}. Probably layout = false in frontmatter.`, 'statico.TemplateFile');
        }

        return ret;
    }

    /**
     * Frig the dates if necessary.
     * 
     * @return {void}
     */
    frigDates()
    {
        for (let item of this.config.dateFields) {
            if (this.data[item]) {
                this.data['_' + item] = new MultiDate(this.data[item], item, this.config.dispDate, this.config.dispTime);
            }
        }

        if (!this.data._date) {
            let stats = fs.statSync(this.filePath, true);
            this.data._date = new MultiDate(stats.birthtimeMs, 'date', this.config.dispDate, this.config.dispTime);
        }

        if (!this.data._modified) {
            let stats = fs.statSync(this.filePath, true);
            this.data._modified = new MultiDate(stats.mtimeMs, 'modified', this.config.dispDate, this.config.dispTime);
        } else {
            this.data._modified = new MultiDate(this.data._modified, 'modified', this.config.dispDate, this.config.dispTime);
        }

        let published = true;
        if ('published' in this.data) {
            published = this.data.published;
        } else {
            let now = new Date();
            let ms = now.getMilliseconds();
            if (this.data._date.ms < ms) {
                published = false;
            }
        }

        this.data.published = published;
     }

    /**
     * Get the file content.
     * 
     * @param   {string}    fp      Filepath to read.
     * 
     * @return  {string}    
     */
    async readFile(fp)
    {
        if (!fp) {
            throw new StaticoTemplateFileError(`TemplateFile.readFile received no file path, processing ${this.filePath}`)
        }
        let content; 
        try {
            content = fs.readFileSync(fp);
        } catch (e) {
            throw new StaticoTemplateFileError(`Cannot read file ${fp}: ${e.message}.\nWhile processing ${this.filePath}.`, null, e);
        }
        return content;
    }
}

module.exports = TemplateFile;
