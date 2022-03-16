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
            if (ctxData.leader) {
                kwargs.description = ctxData.leader_text;
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

        /*
        let aggr = true;
        if (kwargs.aggr) {
            aggr = kwargs.aggr;
            delete kwargs.aggr;
        }

        let ret = '';

        ret += `<div>`;

            for (let idx in kwargs) {
                if (!idx.startsWith('__')) {
                    if ('rating' == idx) {
                        ret += `<span itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">`;
                        ret += `<meta itemprop="ratingValue" content="${kwargs[idx]}" />`;
                        ret += `<meta itemprop="bestRating" content="5" />`;
                        ret += `<meta itemprop="worstRating" content="0" />`;
                        ret += `</span>`;
                    } else {
                        ret += `<meta itemprop="${idx}" content="${kwargs[idx]}" />`; 
                    }
                }
            }

            if (productFields) {
                if (productFields.type) {
                    ret += `<span itemprop="itemReviewed" itemscope itemtype="https://schema.org/${productFields.type}" itemid="#product">`;
                } else {
                    syslog.error(`No 'type' specifield for the product reviewed: ${ctxData.permalink}.`);
                }
                if ('Product' == productFields.type) {
                    ret += '<link itemprop="review" href="#review" />';
                }
                for (let idx in productFields) {
                    if ('type' != idx) {
                        if (productFields[idx].includes(',')) {
                            productFields[idx] = productFields[idx].split(',');
                        }
                        if (Array.isArray(productFields[idx])) {
                            for (let item of productFields[idx]) {
                                ret += `<meta itemprop="${idx}" content="${item.trim()}" />`;
                            }
                        } else {
                            ret += `<meta itemprop="${idx}" content="${productFields[idx].trim()}" />`;
                        }
                    }
                }
                if (aggr) {
                    ret += `<span itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">`;
                    ret += `<link itemprop="itemReviewed" href="#product" />`;
                    ret += `<meta itemprop="ratingValue" content="${kwargs['rating']}" />`;
                    ret += `<meta itemprop="bestRating" content="5" />`;
                    ret += `<meta itemprop="worstRating" content="0" />`;
                    ret += `<meta itemprop="reviewCount" content="1" />`;
                    if (kwargs.description) {
                        ret += `<meta itemprop="description" content="${kwargs.description}" />`;
                    }
                    ret += `</span>`;
                }
                if (this.config.imagesSaved && this.config.imagesSaved[context.ctx.permalink]) {
                    for (let item of this.config.imagesSaved[context.ctx.permalink]) {
                        ret += `<link itemprop="image" href="${item}" />`
                    }
                } 
        
                ret += `</span>`;
            }

            ret += html;

        ret += '</div>';
        */

        return html;
    }
}

module.exports = ReviewShortcode;
 