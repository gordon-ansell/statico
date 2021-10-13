/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, NunjucksShortcode, ImageHtml, merge } = require("gajn-framework");

/**
 * SimpleImg shortcode class.
 */
class SimpleImgShortcode extends NunjucksShortcode
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
        let kwargs = args[1] || {};

        let imgSpec = {} 

        for (let arg in kwargs) {
            if (!arg.startsWith('__')) {
                imgSpec[arg] = kwargs[arg];
            }
        }

        let opts = {
            lazyload: this.config.lazyload
        }

        let imgHtml = new ImageHtml(opts, this.config.hostname);
        let ret = '';
        ret = imgHtml.render(this.config.asset(args[0]), imgSpec);

        let imgs = imgHtml.metaIds;
        if (imgs.length > 0) {
            if (!this.config.imagesSaved) {
                this.config.imagesSaved = {};
            }
            if (this.config.imagesSaved[context.ctx.permalink]) {
                this.config.imagesSaved[context.ctx.permalink] = 
                    merge.merge(this.config.imagesSaved[context.ctx.permalink], imgs);
            } else {
                this.config.imagesSaved[context.ctx.permalink] = imgs;
            }
        }

        return ret;
    }
}

module.exports = SimpleImgShortcode;
