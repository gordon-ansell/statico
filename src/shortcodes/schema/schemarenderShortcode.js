/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, GAError, syslog } = require('js-framework');
const Schema = require('../../schema/schema');
const debug = require('debug')('Statico.shortcodes.SchemaRenderShortcode'),
      debugf = require('debug')('Full.Statico.shortcodes.SchemaRenderShortcode');


/**
 * Schema render shortcode class.
 */
class SchemarenderShortcode extends NunjucksShortcode
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
        let replacer = null;
        let spacer = null;
        if (args[0]) replacer = args[0];
        if (args[1]) spacer = args[1];
        let page = context.ctx.permalink;
        let rendered = '';
        if (this.config.schema[page]) {
            debug(`Rendering schema for page ${page}.`);
            //syslog.inspect(context.ctx, "error");
            let schema = this.config.schema[page];
            schema.setCtx(context.ctx);
            rendered = schema.render(page, replacer, spacer);
        } else {
            syslog.warning(`Creating new schema for ${page}.`);
            this.config.schema[page] = new Schema(this.config);
            this.config.schema[page].setCtx(context.ctx);
            rendered = this.config.schema[page].render(page, replacer, spacer);
        }
        return `<script type="application/ld+json">` + rendered + `</script>`;
    }
}

module.exports = SchemarenderShortcode;
 