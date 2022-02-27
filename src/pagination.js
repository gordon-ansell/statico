/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, merge, fsutils } = require('js-framework');
const lodashget = require('lodash.get');
const path = require('path');
const fs = require('fs');
const StaticoError = require('./staticoError');
const cloneDeep = require('lodash.clonedeep');

class StaticoPaginationError extends StaticoError {}; 

/**
 * Pagination class.
 */
class Pagination
{
    /**
     * Options.
     * @member {object}
     */
    opts = {};

    /**
     * Config.
     * @member {object}
     */
    config = {};

    /**
     * The actual data.
     * @member {Array}
     */
    data = null;

    /**
     * Total records.
     * @member {number}
     */
    totalRecs = 0;

    /**
     * Total pages.
     * @member {number}
     */
    totalPages = 0;

    /**
     * Constructor.
     * 
     * @param   {object}    opts        Options.
     * @param   {object}    config      Config.
     * @param   {string}    filePath    File.
     * 
     * @return  {Pagination}
     */
    constructor(opts, config, filePath)
    {
        this.config = config;
        this.filePath = filePath;
        this.opts = merge.mergeMany([this.config.paginationDefaults, opts]);
        this.setData(this.opts.data);
        //syslog.inspect(this.opts);
        //this.calculatePaging();
    }

    /**
     * Set the data.
     */
    setData(p)
    {
        this.data = lodashget(this.config, p);
        //this.data = this.config.collections.type.post;
        //this.calculatePaging(data);
    }

    /**
     * Calculate paging.
     */
    calculatePaging()
    {
        this.totalRecs = this.data.size;
        this.totalPages = Math.ceil(this.totalRecs / this.opts.size);

        return this;
    }

    /**
     * Do the prev next stuff.
     */
    prevNext()
    {
        let keys = [...this.data.keys()];

        let prevItem = null;

        for (let idx of keys) {
            let data = this.data.get(idx);
            if (prevItem != null) {
                data.data.prev = prevItem; 
                this.data.set(idx, data);
            }
            prevItem = { 
                url: idx,
                title: data.data.title
            };
        }

        let nextItem = null;

        for (let idx of keys.reverse()) {
            let data = this.data.get(idx);
            if (nextItem != null) {
                data.data.next = nextItem; 
                this.data.set(idx, data);
            }
            nextItem = { 
                url: idx,
                title: data.data.title
            };
        }

    }

    /**
     * Create pages.
     */
    async createPages(templateFile)
    {
        templateFile.data.pagination.totalPages = this.totalPages;
        templateFile.data.pagination.totalRecs = this.totalRecs;

        if (this.totalPages > 1) {
            let tmpPath = path.join(this.config.sitePath, this.config.tempDir, 'homepages');
            fsutils.mkdirRecurse(tmpPath);
            let toProcess = [];

            for (let count = 2; count <= this.totalPages; count++) {
                let desc = '';
                if (templateFile.data.description) {
                    desc = templateFile.data.description;
                } else {
                    desc = templateFile.data.site.description;
                }
                let extra = {
                    pagination: {
                        page: count,
                        totalPages: this.totalPages,
                        totalRecs: this.totalRecs
                    },
                    permalink: templateFile.data.permalink + count + '/',
                    robots: "noindex,follow",
                    sitemap: false,
                    title: templateFile.data.title + ' (page ' + count + ')',
                    description: desc + ' (page ' + count + ')'
                }
                let buffer = templateFile.cloneOriginal(extra);
                let target = path.join(tmpPath, String(count) + '.' + templateFile.ext);
                fs.writeFileSync(target, buffer);
                toProcess.push(target);
            }
            
            let TemplateParser = require('./parsers/templateParser');

            // Process all the templates.
            let templateParser = new TemplateParser(this.config);
            await templateParser.parse(toProcess, null, false);
            syslog.info(`Additional pages created for: ${templateFile.filePath}`);

        }
    }

}

module.exports = Pagination;