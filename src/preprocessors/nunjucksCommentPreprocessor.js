/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog, string } = require('js-framework');
const StaticoError = require('../staticoError');
const TemplatePathUrl = require('../templatePathUrl');

class StaticoPreprocessorError extends StaticoError {}

/**
 * Nunjucks comment preprocessor class.
 */
class NunjucksCommentPreprocessor
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
     * @param   {string}    permalink   Permalink for post.
     * @param   {string}    outputPath  Output path.
     * @param   {boolean}   rss         For RSS?
     * 
     * @return  {string}
     */
    async preprocessString(content, permalink, filePath, rss = false)
    {
        let ret = content;
        const regex = /\[\/\/\]\:\s\#\s\(\@(.*)\)/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
           if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m) {
                let rep = '';

                let cmds = m[1].trim();
                if (cmds.includes('|')) {

                    let sp = cmds.split('|');
                    let count = 0;
                    for (let item of sp) {

                        if (0 == count) {
                            rep += item.trim();
                        } else if (item.includes('=')) {
                            let parts = item.split('=');
                            if ('' != rep) {
                                if (1 == count) {
                                    rep += ' '
                                } else {
                                    rep += ', ';
                                }
                            }
                            rep += `${parts[0].trim()}="${parts[1].trim()}"`
                        } else {
                            if ('' != rep) {
                                if (1 == count) {
                                    rep += ' ';
                                } else {
                                    rep += ', ';
                                }
                            }
                            rep += '"' + item.trim() + '"';
                        }

                        count++;
                    }

                } else {
                    rep += cmds;
                }

                if (rep.trim().startsWith('videolink') && rss) {
                    rep = rep.replace('videolink', 'simplevideolink');
                }

                rep = '{% ' + rep + ' %}';

                ret = ret.replace(m[0], rep);
            } else {
                syslog.inspect(m, "warning");
            } 
        }

        // Raw.
        const regexRaw = /\[\/\/\]\:\s\#\s\(\-(.*)\)/g
        while ((m = regexRaw.exec(ret)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m) {

                if ('@' == m[1][0]) {
                    let rep = '[//]: (' + m[1] + ')';
                    ret = ret.replace(m[0], rep);
                }
            } else {
                syslog.inspect(m, "warning");
            } 
        }
 
 
        //syslog.warning(ret);
        return ret;
    }


}

module.exports = NunjucksCommentPreprocessor;
