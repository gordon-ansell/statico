/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, ComplexImage } = require("js-framework");
const path = require('path');

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
        for (let arg in kwargs) {
            if (!arg.startsWith('__')) {
                imgSpec[arg] = kwargs[arg];
            }
        }
        */

        let opts = {
            lazyload: this.config.lazyload
        }

        //let imgHtml = new ImageHtml(opts, this.config.hostname);
        let imgHtml = new ComplexImage(this.config.lazyload, this.config.figureClass, this.config.sitePath, this.config.hostname);
        let ret = '';
        //ret = imgHtml.renderSimple(this.config.asset(args[0]), imgSpec);
        ret = imgHtml.render(this.config.asset(args[0]), imgSpec);

        let fullp = path.join(this.config.sitePath, url);
        let ext = path.extname(fullp).substring(1);
        let is = imageSize(fullp);
        let spec = {
            file: url,
            width: is.width,
            height: is.height,
            mime: "image/" + ext.replace('jpg', 'jpeg')
        };
        let generated = {};
        generated[ext] = {files:[spec]};
        this.config.imageInfoStore.addBySrcAndPage(url, context.ctx.permalink, generated);

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

module.exports = SimpleImgShortcode;
