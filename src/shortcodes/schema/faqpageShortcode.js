/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode } = require('js-framework');
const Schema = require('../../schema/schema');

/**
 * FAQ page shortcode class.
 */
class FaqpageShortcode extends NunjucksShortcode
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
        //let ctxData = context.ctx;
        //let kwargs = args[0] || {};

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].addRaw('faqpage', {name: args[0]});


        let [html, text] = this.config.templateHandlers.markdown.handler.parseMarkdown(body);

        let ret = '';

        ret += `<div class="faq">`;

            ret += html;

        ret += '</div>';

        return ret;
    }
}

module.exports = FaqpageShortcode;
