/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, GAError } = require('js-framework');
const Schema = require('../../schema/schema');

class StaticoCiteBlockShortcodeError extends GAError {};

/**
 * Cite block shortcode class.
 */
class CiteblockShortcode extends NunjucksShortcode
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
        let url = args[0];
        let kwargs = args[1];

        if (url.startsWith('!')) {
            let fld = url.substring(1);
            if (!context.ctx[fld]) {
                throw new StaticoCiteBlockShortcodeError(`Field reference '${fld}' does not exist for this article (trying to build a citation block).'`);
            } else {
                url = context.ctx[fld];
            }
        }

        if (!kwargs.title) {
            if (kwargs.name) {
                kwargs.title = kwargs.name;
                delete kwargs.name;
            } else {
                kwargs.title = url;
            }
        }

        let blocktitle = "Citations";
        if (kwargs.blocktitle) {
            blocktitle = kwargs.blocktitle;
            delete kwargs.blocktitle;
        }

        if (!kwargs.class) {
            kwargs.class = 'citation-block';
        }

        if (!kwargs.site) {
            let uo = new URL(url);
            kwargs.site = uo.hostname;
        }

        if (!kwargs.siteurl) {
            let uo = new URL(url);
            kwargs.siteurl = uo.protocol + '//' + uo.hostname;
        }

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].addRaw('citation', kwargs);

        let op = `<div class="${kwargs.class}">`;

            op += `<h6>Citation</h6>`;

            op += `<cite><a href="${url}">${kwargs.title}</a></cite>`;

            if (kwargs.author) {
                op += ' by ';

                let auths = [];
                if (kwargs.author.includes(',')) {
                    auths = kwargs.author.split(',');
                } else {
                    auths.push(kwargs.author);
                }

                let authUrls = [];
                if (kwargs.authorurl && kwargs.authorurl.includes(',')) {
                    authUrls = kwargs.authorurl.split(",");
                } else if (kwargs.authorurl) {
                    authUrls.push(kwargs.authorurl);
                }

                let authorstring = '';
                let count = 0;
                for (let a of auths) {
                    if ('' != authorstring) {
                        authorstring += ', ';
                    }
                    if (authUrls[count]) {
                        authorstring += `<a href="${authUrls[count].trim()}">${a.trim()}</a>`;
                    } else {
                        authorstring += `${a.trim()}`;
                    }


                    count++;
                }
                op += authorstring;

            }

            if (kwargs.site) {
                op += ' on ';
                if (kwargs.siteurl) {
                    op += `<a href="${kwargs.siteurl}">`;
                }
                op += `${kwargs.site}`;
                if (kwargs.siteurl) {
                    op += `</a>`;
                }
            }

            op += '.';

        op += '</div>';

        return op;
    }
}

module.exports = CiteblockShortcode;
 