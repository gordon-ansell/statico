/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, GAError, string } = require('js-framework');

class StaticMetaShortcodeError extends GAError {};

/**
 * Meta shortcode class.
 */
class MetaShortcode extends NunjucksShortcode
{
    /**
     * Keywords.
     */
    metakws = [];

    /**
     * Get the author.
     * 
     * @return {string}
     */
    _getAuthor()
    {
        let ret = '<span class="p-author h-card vcard">';

        let author = false;

        if (this.article.data.author) {
            author = this.article.data.author;
        } else if (this.site.defaultAuthor) {
            author = this.site.defaultAuthor;
        }

        if (!author) {
            throw new StaticMetaShortcodeError(`Cannot determine author. Cannot run meta shortcode.`);
        }

        if (!this.site.authors) {
            throw new StaticMetaShortcodeError(`No 'site.authors' spec found in config. Cannot run meta shortcode.`);
        }

        if (!this.site.authors[author]) {
            throw new StaticMetaShortcodeError(`No entry for '${author}' in 'site.authors'. Cannot run meta shortcode.`);
        }

        let authorSpec = this.site.authors[author];

        if (!authorSpec.name) {
            throw new StaticMetaShortcodeError(`No 'name' specified in 'site.authors[${author}]'. Cannot run meta shortcode.`);
        }

        let tmp = `<span class="p-name fn">${authorSpec.name}</span>`;


        if (authorSpec.url) {
            tmp = `<a href="${authorSpec.url}" class="u-url url" title="About this author.">` + tmp + '</a>';
        }

        ret += tmp;

        return ret + '</span>';

    }

    /**
     * Get the dates.
     * 
     * @return {string}
     */
    _getDates()
    {
        if (!this.article.data._date) {
            throw new StaticMetaShortcodeError(`No article date (_date) found. Cannot run meta shortcode.`);
        }

        let ad = this.article.data;

        let ret = `<time class="dt-published" datetime="${ad._date.iso}">${ad._date.dispDt}</time>`;


        return ret;
    }

    /**
     * Get the categories.
     * 
     * @param   {string}    taxType     Taxonomy type.
     * 
     * @return  {string[]}
     */
    _getTax(taxType)
    {
        if (!this.article.data[taxType]) {
            return ['', []];
        }

        let items = this.article.data[taxType];

        if (0 === items.length) {
            return ['', []];
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

        let ret = `<span class="metatax ${taxType}">`;

        let tmp = '';

        let coll = [];
        let metakws = [];

        for (let item of items) {
            coll.push(`<a class="p-category" href="/${taxType}/${string.slugify(item.trim())}/">${item.trim()}</a>`); 
        }

        return [ret + coll.join(', ') + '</span>', metakws];
    }

    /**
     * Get a big dot.
     * 
     * @return {string}
     */
    _bigdot()
    {
        return `<span class="bigdot"></span>`;
    }

    /**
     * Render.
     * 
     * @param   {object}    context     URL.
     * @param   {Array}     args        Other arguments.
     * 
     * @return  {string}
     */
    render(context, args)
    {
        this.article = args[0];
        this.site = this.config.userData.site || false;

        if (!this.site) {
            throw new StaticMetaShortcodeError(`No 'site' specs found in config, Cannot run meta shortcode.`);å
        }

        //this.metakws = [];

        let ret = this._getAuthor();

        ret += this._bigdot();

        ret += this._getDates();

        let taxData = this._getTax('tags');
        if ('' != taxData[0]) {
            ret += this._bigdot() + taxData[0];
        }

        /*
        let tags = this._getTax('tags');
        if ('' != tags) {
            ret += this._bigdot() + tags;
        }
        */

        ret += this._bigdot() + String(this.article.data.wordCount) + ' words';

        if (taxData[1].length > 0) {
            ret += taxData[1].join('');
        }

        return ret;

    }
}

module.exports = MetaShortcode;
 