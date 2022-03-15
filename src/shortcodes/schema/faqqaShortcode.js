/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
 'use strict';

const { NunjucksShortcode, GAError } = require('js-framework');
const Schema = require('../../schema/schema');

class FaqQaShortcodeError extends GAError {};
 
/**
 * FAQ question/answer shortcode class.
 */
class FaqqaShortcode extends NunjucksShortcode
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

        if (!kwargs.q) {
            throw new FaqQaShortcodeError(`FAQ 'qa' shortcode should have 'q' specified with the question: ${context.ctx.permalink}`);
        }


        let [html, text] = this.config.templateHandlers.markdown.handler.parseMarkdown(body);

        if (!kwargs.text) {
            kwargs.text = text;
        }

        if (!kwargs.html) {
            kwargs.html = html;
        }

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].pushRaw('faqqa', kwargs);


        let ret = '';

        ret += `<a name="faq-${stepNum}"></a>`;
        ret += `<div id="faq-${stepNum}">`;

            ret += `<h3>${kwargs.q}</h3>`;
            ret += `<span class="faqanswer">`;
                ret += html;
             ret += `</span>`;
            
        ret += '</div>';

        return ret;
    }
}
 
 module.exports = FaqqaShortcode;
  