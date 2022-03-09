/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, NunjucksShortcode, MultiDate } = require("js-framework");
const debug = require('debug')('Statico.shortcodes.ImgSpecificShortcode'),
      debugf = require('debug')('Full.Statico.shortcodes.ImgSpecificShortcode');

/**
 * Specific image shortcode class.
 */
class ImgSpecificShortcode extends NunjucksShortcode
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
        let type = args[0];
        let size = args[1];
        //let kwargs = args[1] || {};

        if (!type) {
            syslog.error(`Specific image shortcode needs a 'type' as the first parameter: ${context.ctx.permalink}.`);
        }

        if (!size) {
            syslog.error(`Specific image shortcode needs a 'size' as the second parameter: ${context.ctx.permalink}.`);
        }

        let ret = this.config.imageInfoStore.getSpecificByPage(context.ctx.permalink, type, size);

        debug(`Image specific shortcode for ${context.ctx.permalink} returns: %O`, ret);

        return ret;
    }
}

module.exports = ImgSpecificShortcode;
