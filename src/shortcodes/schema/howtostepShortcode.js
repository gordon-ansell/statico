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
 * Howtostep shortcode class.
 */
class HowtostepShortcode extends NunjucksShortcode
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
        let stepNum = args[0];
        let kwargs = args[1] || {};
        //this.site = this.config.userData.site || false;

        let name;
        if (kwargs.name) {
            name = kwargs.name;
            //delete kwargs.name;
        }


        let [html, text] = this.config.templateHandlers.markdown.handler.parseMarkdown(body);
        //syslog.inspect(html, "warning");

        if (!kwargs.text) {
            kwargs.text = text;
        }

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].pushRaw('howtostep', kwargs);


        let ret = '';

        ret += `<div id="step-${stepNum}" class="howtostep">`;

            ret += `<h2>Step ${stepNum}: ${name}</h2>`;
            ret += html;

        ret += '</div>';

        return ret;
    }
}

module.exports = HowtostepShortcode;
 