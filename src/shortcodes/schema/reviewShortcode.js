/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, GAError, syslog } = require('js-framework');
const Schema = require('../../schema/schema');


/**
 * Review shortcode class.
 */
class ReviewShortcode extends NunjucksShortcode
{
    /**
     * Check the product fields.
     * 
     * @param   {object}    productFields
     * @param   {string}    permalink
     * 
     * @return  {boolean}
     */
    checkProductFields(productFields, permalink)
    {
        let warn = this.config.schemaWarnings;

        if (!productFields.type) {
            if (warn) {
                syslog.warning(`Product fields should include a 'type': ${permalink}`);
            }
            return false;
        }

        if ('SoftwareApplication' == productFields.type) {

            let twoOf = ['applicationCategory', 'operatingSystem', 'offers'];
            let count = 0;
            for (let idx of Object.keys(productFields)) {
                if ('type' != idx) {
                    if (twoOf.includes(idx)) {
                        count++;
                    }
                }
            }
            if (count < 2) {
                if (warn) {
                    syslog.warning(`SoftwareApplication product types should include two of '${twoOf.join(', ')}': ${permalink}`);
                }
            }

        }

        return true;
    }

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
        //syslog.inspect(Object.keys(context.ctx), "Warning");
        //syslog.inspect(context.ctx, "Warning");
        let ctxData = context.ctx;
        let kwargs = args[0] || {};

        if (!kwargs.name) {
            kwargs.name = ctxData.title;
        }

        if (!kwargs.description) {
            if (ctxData.leader_text) {
                kwargs.description = ctxData.leader_text;
            } else if (ctxData.leader) {
                kwargs.description = ctxData.leader;
            } else {
                kwargs.description = ctxData.description;
            }
        }

        let productFields = {};
        let remaining = {};
        for (let idx in kwargs) {
            if (idx.startsWith('product_')) {
                let f = idx.substring(8);
                productFields[f] = kwargs[idx];
            } else {
                remaining[idx] = kwargs[idx];
            }
        }
        kwargs = remaining;

        this.checkProductFields(productFields, ctxData.permalink);

        let [html, text] = this.config.templateHandlers.markdown.handler.parseMarkdown(body);
        //syslog.inspect(html, "warning");

        if (!kwargs.text) {
            //kwargs.text = text;
        }

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].addRaw('review', {review: kwargs, product: productFields});


        return html;
    }
}

module.exports = ReviewShortcode;
 