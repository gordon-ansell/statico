/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const slugifyFilter = require('./slugifyFilter');
const absurlFilter = require('./absurlFilter');
const htmlabsurlFilter = require('./htmlabsurlFilter');
const { syslog } = require('js-framework');
const debug = require('debug')('Statico:defaultFilters'),
      debugf = require('debug')('Full.Statico:defaultFilters');

/**
 * Default filters.
 */

module.exports = function(config) {
   
    config.addNunjucksFilter('slugify', slugifyFilter);
    debug(`Added filter to Nunjucks: slugify`);

    config.addNunjucksFilter('absurl', absurlFilter);
    debug(`Added filter to Nunjucks: absurl`);

    config.addNunjucksFilter('htmlabsurl', htmlabsurlFilter);
    debug(`Added filter to Nunjucks: htmlabsurl`);

}