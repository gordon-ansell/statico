/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, fsutils, string } = require('js-framework');
const StaticoError = require('./staticoError');
const debug = require("debug")('Statico:ImageInfoStore');

class StaticoImageInfoStoreError extends StaticoError {};

/**
 * Statico image info store.
 */
class ImageInfoStore
{
    /**
     * Full config.
     * @member {object}
     */
    config = null;

    /**
     * The actual store.
     * @member {object}
     */
    store = {bySrc: {}, byPage: {}};

    /**
     * Constructor.
     * 
     * @param   {object}    config  Configs.
     * 
     * @return  {FtpRunner}
     */
    constructor(config)
    {
        this.config = config;
    }

    /**
     * Add some metadata by source AND page.
     * 
     * @param   {string}    src     Base source name.
     * @param   {string}    page    Page name.
     * @param   {object}    info    Info metadata.
     * 
     * @return  {ImageInfoStore}
     */
    addBySrcAndPage(src, page, info)
    {
        this.addBySrc(src, info);
        this.addByPage(page, src);
        return this;
    }

    /**
     * Add some metadata by source.
     * 
     * @param   {string}    src     Base source name.
     * @param   {object}    info    Info metadata.
     * 
     * @return  {ImageInfoStore}
     */
    addBySrc(src, info)
    {
        debug(`Adding by src ${src}: %O`, info);
        this.store.bySrc[src] = info;
        return this;
    }

    /**
     * See if we have something by source.
     * 
     * @param   {string}    src     Source to test.
     * 
     * @return  {boolean}
     */
    hasBySrc(src)
    {
        return Object.keys(this.store.bySrc.includes(src));
    }

    /**
     * Get image info by source.
     * 
     * @param   {string}    src         Source to retrieve.
     * @param   {boolean}   mustExist   Must this exist?
     * 
     * @return  {object}
     */
    getBySrc(src, mustExist = true)
    {
        if (!this.hasBySrc(src)) {
            if (mustExist) {
                throw new StaticoImageInfoStoreError(`Could not retrieve image by source: ${src}`);
            } else {
                return null;
            }
        }

        return this.store.bySrc[src];
    }

    /**
     * Get the source's image of specified type that's closest to the size given.
     * 
     * @param   {string}    src     Source to get image for.
     * @param   {string}    type    Type of image.
     * @param   {number}    size    Size we're looking for.
     * 
     * @return  {object}
     */
    getSpecificBySrc(src, type, size)
    {
        if (!this.hasBySrc(src)) {
            return null;
        }

        let saved = null;
        let savedDiff = 999999;

        let found = this.getBySrc(src);

        for (let idx in found) {
            if (!Object.keys(found[idx]).includes(type)) {
                continue;
            }
            for (let item of found[idx][type]) {
                if (item.width === size) {
                    return item;
                } else {
                    if (Math.abs(item.width - savedDiff) < Math.abs(size - savedDiff)) {
                        saved = item;
                        savedDiff = Math.abs(item.width - savedDiff);
                    }
                }
            }
        }

        return saved;
    }

    //
    // ==============================================================================================
    //

    /**
     * Add some metadata by page.
     * 
     * @param   {string}    page    Page URL.
     * @param   {string}    src     Source name to store.
     * 
     * @return  {ImageInfoStore}
     */
    addByPage(page, src)
    {
        debug(`Adding by page ${src}: %s`, src);
        if (!this.store.byPage.page) {
            this.store.byPage[page] = [];
        }
        this.store.byPage[page].push(src);
        return this;
    }

    /**
     * See if we have something by page.
     * 
     * @param   {string}    page    Page to test.
     * 
     * @return  {boolean}
     */
    hasByPage(page)
    {
        return Object.keys(this.store.byPage.includes(page));
    }

    /**
     * Get image info by page.
     * 
     * @param   {string}    page        Page to retrieve.
     * @param   {boolean}   mustExist   Must this exist?
     * 
     * @return  {object}
     */
    getByPage(page, mustExist = true)
    {
        if (!this.hasByPage(page)) {
            if (mustExist) {
                throw new StaticoImageInfoStoreError(`Could not retrieve image by page: ${page}`);
            } else {
                return null;
            }
        }

        let ret = [];
        for (let src of this.store.byPage[page]) {
            ret.push(this.getBySrc(src));
        }

        return ret;
    }

    /**
     * Get the page's image of specified type that's closest to the size given.
     * 
     * @param   {string}    page    Page to get image for.
     * @param   {string}    type    Type of image.
     * @param   {number}    size    Size we're looking for.
     * 
     * @return  {object}
     */
    getSpecificByPage(page, type, size)
    {
        if (!this.hasByPage(page)) {
            return null;
        }

        let saved = null;
        let savedDiff = 999999;

        for (let pi of this.getByPage(page)) {
            let tmp = this.getSpecificBySrc(pi, type, size);
            if (null !== tmp) {
                if (tmp.width === size) {
                    return tmp;
                } else {
                    if (Math.abs(tmp.width - savedDiff) < Math.abs(size - savedDiff)) {
                        saved = tmp;
                        savedDiff = Math.abs(tmp.width - savedDiff);
                    }
                }
            }
        }

        return saved;
    }
}

module.exports = ImageInfoStore;