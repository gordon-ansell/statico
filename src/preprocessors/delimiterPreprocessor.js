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
        let ret = string.replaceAll(content, '{rdelim}', '}');
        ret = string.replaceAll(ret, '{ldelim}', '{');

        syslog.inspect(ret, 'error');

        return ret;
    }


}

module.exports = DelimiterPreprocessor;
