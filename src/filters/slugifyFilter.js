/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { string } = require('js-framework');

/**
 * Slugify filter.
 */
function slugifyFilter(str)
{
    return string.slugify(str);
}

module.exports = slugifyFilter;