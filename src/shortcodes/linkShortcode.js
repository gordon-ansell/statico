/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode } = require('gajn-framework');

/**
 * Link shortcode class.
 */
class LinkShortcode extends NunjucksShortcode
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
        let url = args[0];
        let txt = args[1];
        let kwargs = args[2] ?? {};

        let ret = `<a href="${url}"`;
        for (let arg in kwargs) {
            if (!arg.startsWith('__')) {
                ret += ` ${arg}="${kwargs[arg]}"`;
            }
        }
        ret += `>${txt}</a>`;
        return ret;
    }
}

module.exports = LinkShortcode;
