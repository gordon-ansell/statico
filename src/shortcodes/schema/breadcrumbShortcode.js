/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { NunjucksShortcode, string } = require('js-framework');
const Schema = require('../../schema/schema');

/**
 * Breadcrumb shortcode class.
 */
class BreadcrumbShortcode extends NunjucksShortcode
{
    /**
     * Get the tags.
     * 
     * @return  {string[]}
     */
     _getTags()
     {
         if (!this.article.tags) {
             return null;
         }
 
         let items = this.article.tags;
 
         if (0 === items.length) {
             return null;
         }
 
         if (!Array.isArray(items)) {
             if ("string" == typeof items) {
                 if (items.includes(',')) {
                     items = items.split(',');
                 } else {
                     items = [items];
                 }
             } else {
                 items = [items];
             }
         }
 
         return items;
    }

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
        this.article = context.ctx;
        let spec = args[0];
        let tags;
        if (!spec) {
            spec = [];
            tags = this._getTags();
            if (tags) {
                if (tags[0]) {
                    spec.push(tags[0]);
                }
                if (tags[1]) {
                    spec.push(tags[1]);
                }
            }

            if (!spec) {
                spec = [];
            }

        }

        let bcDefs = [];

        let rarr = "&#8594;";

        let ret = `<div class="breadcrumbs">`;

        let count = 1;
  
        ret += `<a href="/" title="Go to the home page.">`;
            ret += `Home`;
        ret += `</a>`;

        bcDefs.push({num: count, title: "Home", url: '/'});

        count++;

        if ('pageable' == spec) {
            ret += ` ${rarr} `;
                let url = this.article.pagination.urlbase + this.article.pagination.page + '/';
            ret += `<span href="${url}">`;
                ret += `${this.article.pagination.page}`;
            ret += `</span>`;
            bcDefs.push({num: count, title: this.article.pagination.page, url: this.article.pagination.urlbase + this.article.pagination.page + '/'});
        } else {

            if (Array.isArray(spec)) {
                for (let item of spec) {
                    ret += ` ${rarr} `;
                    let url = '/tags/' + string.slugify(item) + '/';
                    ret += `<a href="${url}">`;
                        ret += `${item}`;
                    ret += `</a>`;
                    bcDefs.push({num: count, title: item, url: '/tags/' + string.slugify(item) + '/'});
                    count++;
                }
            }

            ret += ` ${rarr} `;

            //let url = this.article.permalink;
            ret += `${this.article.title}`;
            bcDefs.push({num: count, title: this.article.title, url: null});
            count++;
        }

        ret += '</div>';

        if (!this.config.schema[context.ctx.permalink]) {
            this.config.schema[context.ctx.permalink] = new Schema(this.config);
        }
        this.config.schema[context.ctx.permalink].addRaw('breadcrumb', bcDefs);

        if ('nodisp' === spec) {
            return '';
        }
        return ret;
    }
}

module.exports = BreadcrumbShortcode;
 