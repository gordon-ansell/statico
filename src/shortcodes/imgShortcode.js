/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, ComplexImage } = require("js-framework");
const imageSize = require("image-size");
const path = require('path');
const debug = require('debug')('Statico.shortcodes.ImgShortcode'),
      debugf = require('debug')('Full.Statico.shortcodes.ImgShortcode');

/**
 * Img shortcode class.
 */
class ImgShortcode extends NunjucksShortcode
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

        let imgSpec = {};

        debug(`args passed into imgShortcode.render: %O`,args);
        debug(`kwArgs passed into imgShortcode.render: %O`,kwargs);

        let url = args[0];

        for (let argnum of [1,2]) {
            let argdata = args[argnum];
            if (null === argdata) {
                continue;
            }
            if("object" === typeof(argdata)) {
                for (let key in argdata) {
                    imgSpec[key] = argdata[key];
                }
            } else if ("string" === typeof(argdata)) {
                let sp = argdata.trim().split('|');
                for (let subdata of sp) {
                    if (-1 !== subdata.indexOf('=')) {
                        let ds = subdata.split('=');
                        if (!ds[0].trim().startsWith('__')) {
                            imgSpec[ds[0].trim()] = ds[1].trim();
                        }
                    } else {
                        if (!subdata.trim().startsWith('__')) {
                            imgSpec[subdata.trim()] = true;
                        }
                    }
                }
            }
        } 

        /*
        let sp = kwargs.split('|');
        for (let item of sp) {
            if (item.includes('=')) {
                let sp1 = item.split('=');
                imgSpec[sp1[0].trim()] = imgSpec[sp1[1].trim()];
            } else {
                imgSpec[sp] = true;
            }
        }
        */

        /*
        for (let arg in kwargs) {
            if (!arg.startsWith('__')) {
                imgSpec[arg] = kwargs[arg];
            }
        }
        */
        
        debug(`Image spec extracted = %O`,imgSpec);

        let opts = {
            lazyload: this.config.lazyload
        }

        let ret = '';
        //let imgHtml = new ImageHtml(opts, this.config.hostname);
        let imgHtml = new ComplexImage(this.config.lazyload, this.config.figureClass, this.config.sitePath, 
            this.config.hostname);

        let is = imageSize(path.join(this.config.sitePath, url));
        debug("%O", is);

        //ret = imgHtml.renderSimple(this.config.asset(args[0]), imgSpec);
        ret = imgHtml.render(this.config.asset(args[0]), imgSpec);

        let imgs = imgHtml.metaIds;
        if (imgs.length > 0) {
            if (!this.config.imagesSaved) {
                this.config.imagesSaved = {};
            }
            if (!this.config.imagesSaved[context.ctx.permalink]) {
                this.config.imagesSaved[context.ctx.permalink] = [];
            }
            for (let item of imgs) {
                if (!this.config.imagesSaved[context.ctx.permalink].includes(item)) {
                    this.config.imagesSaved[context.ctx.permalink].push(item);
                }
            }
        }

        return ret;
    }
}

module.exports = ImgShortcode;
