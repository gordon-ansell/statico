/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, NunjucksShortcode, MultiDate } = require("js-framework");

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

        return ret;
    }
}

module.exports = ImgSpecificShortcode;
