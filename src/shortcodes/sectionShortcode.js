/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode } = require('js-framework');

/**
 * Section shortcode class.
 */
class SectionShortcode extends NunjucksShortcode
{
    /**
     * Render.
     * 
     * @param   {object}    context     URL.
     * @param   {Array}     args        Other arguments.
     * 
     * @return  {string}
     */
    renderPaired(context, body, args)
    {
        let cls = args[0] || null;
        let kwargs = args[1] || {};

        if (cls) {
            kwargs.class = cls;
        }

        let type = 'div';
        if (kwargs.type) {
            type = kwargs.type;
            delete kwargs.type;
        }

        let [html, text] = this.config.templateHandlers.markdown.handler.parseMarkdown(body);

        let ret = `<${type}`;

        for (let idx in kwargs) {
            ret += ` ${idx}="${kwargs[idx]}"`;
        }

        ret += `>`;

        ret += html;

        ret += `</${type}>`;

        return ret;
    }
}

module.exports = SectionShortcode;
