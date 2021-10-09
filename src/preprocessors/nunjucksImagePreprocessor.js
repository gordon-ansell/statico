/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog, string } = require('gajn-framework');
const StaticoError = require('../staticoError');
const TemplatePathUrl = require('../templatePathUrl');

class StaticoPreprocessorError extends StaticoError {}

/**
 * Nunjucks image preprocessor class.
 */
class NunjucksImagePreprocessor
{
    /**
     * Configs.
     * @member {object}
     */
    config = null;

    /**
     * Constructor.
     * 
     * @param   {object}    config      Configs.
     * 
     * @return  {TemplateParser}
     */
    constructor(config)
    {
        this.config = config;
    }

    /**
     * Preprocess a string.
     * 
     * @param   {string}    content     Content to preprocess.
     * @param   {boolean}   rss         For RSS?
     * 
     * @return  {string}
     */
    async preprocessString(content, rss = false)
    {
        let ret = content;
        const regex = /!\[([^\]]*)\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m) {
                let alt = m[1].trim();
                let url = path.resolve(m[2].trim()).replace(this.config.sitePath, '');
                let title;
                if (m[3]) {
                    title = m[3].trim();
                }
                let rep;
                if (rss) {
                    rep = `{% simpleimg "${url}"`;
                } else {
                    rep = `{% img "${url}"`;
                }
                if (alt) {
                    rep += `, alt="${alt}"`;
                }
                if (title) {
                    if ('"' == title[0]) title = title.substr(1);
                    if ('"' == title[title.length - 1]) title = title.substr(0, title.length - 1);

                    if (title.includes('|')) {
                        let sp = title.split('|');
                        for (let part of sp) {
                            if (!part.includes('=')) {
                                throw new StaticoPreprocessorError(`Incorrect enhanced image title. Fields must be in the format name=value (yours is ${part}).`);
                            }
                            let div = part.split('=');
                            rep += `, ${div[0].trim()}="${div[1].trim()}"`;
                        }
                    } else if (title.includes('=')) {
                        let div = title.split('=');
                        rep += `, ${div[0].trim()}="${div[1].trim()}"`;
                    } else {
                        rep += `, title="${title}"`;
                    }
                }
                rep += ` %}`;
                ret = ret.replace(m[0], rep);
            }
        }

        if (rss) {
            syslog.warning(ret);
        }
        return ret;
    }


}

module.exports = NunjucksImagePreprocessor;
