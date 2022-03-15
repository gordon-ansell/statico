/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { GAError, string } = require('js-framework');
const MetaShortcode = require('./metaShortcode');

class StaticTagsShortcodeError extends GAError {};

/**
 * Tags shortcode class.
 */
class TagsShortcode extends MetaShortcode
{
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
            throw new StaticTagsShortcodeError(`No 'site' specs found in config, Cannot run tags shortcode.`);å
        }

        //this.metakws = [];

        let taxData = this._getTax('tags');

        let ret = taxData[0];

        if (taxData[1].length > 0) {
            ret += taxData[1].join('');
        }

        return ret;

    }
}

module.exports = TagsShortcode;
 