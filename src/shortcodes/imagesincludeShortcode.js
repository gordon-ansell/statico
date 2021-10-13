/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog, NunjucksShortcode, GAError, ImageHtml, merge } = require('gajn-framework'); 

class NunjucksShortcodeImgError extends GAError {}

/**
 * Images include shortcode class.
 */
class ImagesIncludeShortcode extends NunjucksShortcode
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
        let ret = '';
        if (this.config.imagesSaved && this.config.imagesSaved[context.ctx.permalink]) {
            for (let item of this.config.imagesSaved[context.ctx.permalink]) {
                ret += `<link itemprop="image" href="${this.config.qualify(item)}" />`
            }
        } 
        return ret;
    }
}

module.exports = ImagesIncludeShortcode;
  