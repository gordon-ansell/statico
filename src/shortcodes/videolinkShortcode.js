/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, NunjucksShortcode, MultiDate } = require("gajn-framework");

/**
 * Video link shortcode class.
 */
class VideoLinkShortcode extends NunjucksShortcode
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
        let type = args[0];
        let kwargs = args[1] || {};

        if (!type || 'string' != typeof type) {
            syslog.error(`Video links need the type as the first parameter: ${context.ctx.permalink}.`);
            return '';
        }

        if (!kwargs.id && !kwargs.src) {
            syslog.error(`Video links require either and 'id' or a 'src' parameter: ${context.ctx.permalink}.`);
        }

        let srcName = 'src';
        if (this.config.lazyload) {
            srcName = 'data-src';
            if (kwargs.class) {
                kwargs.class += ' lazyload';
            } else {
                kwargs.class = 'lazyload';
            }
        }

        let ret = '';
        if ('youtube' == type) {

            let id;
            if (kwargs.id) {
                kwargs.src = "https://www.youtube-nocookie.com/embed/" + kwargs.id;
                id = kwargs.id;
                delete kwargs.id;
            } else {
                syslog.error(`Video links for YouTube require the 'id' parameter: ${context.ctx.permalink}.`);
            }

            if (!kwargs.description && kwargs.caption) {
                kwargs.description = kwargs.caption;
            }

            let meta = {};
            for (let item of ['description', 'name', 'uploadDate']) {
                if (kwargs[item]) {
                    if ('uploadDate' == item) {
                        let d = new MultiDate(kwargs[item]);
                        meta[item] = d.iso;
                    } else {
                        meta[item] = kwargs[item];
                    }
                    delete kwargs[item];
                } else {
                    if (this.config.schemaWarnings) {
                        syslog.warning(`YouTube video links should have the '${item}' parameter: ${context.ctx.permalink}.`);
                    }
                }
            }

            ret += `<figure class="videolink">`
            ret += `<iframe width="560" height="315" frameborder="0"`
            for (let idx in kwargs) {
                if (!idx.startsWith('__')) {
                    if ('src' == idx) {
                        ret += ` ${srcName}="${kwargs[idx]}"`;
                    } else {
                        ret += ` ${idx}="${kwargs[idx]}"`;
                    }
                }
            }
            ret += ' allowfullscreen>';
            ret += '</iframe>';
            if (kwargs.caption) {
                ret += '<figcaption>' + kwargs.caption + '</figcaption>';
            }
            ret += '</figure>';

            let url = kwargs.src;
            delete kwargs.src;
            delete kwargs.class;

            ret += '<span itemprop="video" itemtype="https://schema.org/VideoObject" itemscope>';
            ret += `<link itemprop="embedUrl" href="${url}" />`;
            ret += `<link itemprop="contentUrl" href="https://www.youtube-nocookie.com/watch?v=${id}" />`;
            ret += `<link itemprop="thumbnailUrl" href="https://img.youtube-nocookie.com/vi/${id}/default.jpg" />`;
            for (let idx in meta) {
                if (!idx.startsWith('__')) {
                    ret += `<meta itemprop="${idx}" content="${meta[idx]}" />`;
                }
            }

            ret += '</span>';

        } else {
            syslog.error(`'${type}' is an unsupported video link type: ${context.ctx.permalink}.`);
        } 

        return ret;



        /*
        <iframe width="560" height="315" src="https://www.youtube.com/embed/eF551z9KlA8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        */
    }
}

module.exports = VideoLinkShortcode;
