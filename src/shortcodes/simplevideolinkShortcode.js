/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, NunjucksShortcode, MultiDate } = require("js-framework");
const VideoLinkShortcode = require('./videolinkShortcode'); 
const Schema = require('../schema/schema');

/**
 * Simple ideo link shortcode class.
 */
class SimpleVideoLinkShortcode extends VideoLinkShortcode
{
    /**
     * Configure lazyload class.
     * 
     * @param   {object}    kwargs
     * 
     * @return  {string}
     */
    configureLazyClass(kwargs)
    {
        return kwargs;
    }

    /**
     * Get src name.
     * 
     * @return  {string}
     */
    getSrcName()
    {
        let srcName = 'src';
        return srcName;
    }
}

module.exports = SimpleVideoLinkShortcode;
