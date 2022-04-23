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
 * Delimiter preprocessor class.
 */
class DelimiterPreprocessor
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
     * @param   {string}    content    Content to preprocess.
     * 
     * @return  {string}
     */
    async preprocessString(content)
    {
        if (-1 !== content.indexOf('{ldelim}') || -1 !== content.indexOf('{rdelim}')) {
            let ret = string.replaceAll(content, '{ldelim}', '{');
            ret = string.replaceAll(ret, '{rdelim}', '}');

            //syslog.inspect(ret, 'error');

            return ret;
        }

        return content;
    }


}

module.exports = DelimiterPreprocessor;
