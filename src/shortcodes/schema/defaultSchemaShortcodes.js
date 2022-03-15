/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
 'use strict';

const BreadcrumbShortcode = require('./breadcrumbShortcode');
const CiteblockShortcode = require('./citeblockShortcode');
const FaqpageShortcode = require('./faqpageShortcode');
const FaqqaShortcode = require('./faqqaShortcode');
const HowtoShortcode = require('./howtoShortcode');
const HowtostepShortcode = require('./howtostepShortcode');
const ReviewShortcode = require('./reviewShortcode');
const SchemarenderShortcode = require('./schemarenderShortcode');
const debug = require('debug')('Statico:defaultSchemaShortcodes'),
      debugf = require('debug')('Full.Statico:defaultSchemaShortcodes');

 
/**
 * Default shortcodes.
 */

module.exports = function(config) {

    config.addNunjucksShortcode('breadcrumbs', BreadcrumbShortcode);
    config.addNunjucksShortcode('citeblock', CiteblockShortcode);
    config.addNunjucksPairedShortcode('howto', HowtoShortcode);
    config.addNunjucksPairedShortcode('howtostep', HowtostepShortcode);
    config.addNunjucksPairedShortcode('review', ReviewShortcode);
    config.addNunjucksPairedShortcode('faqpage', FaqpageShortcode);
    config.addNunjucksPairedShortcode('faqqa', FaqqaShortcode);
    config.addNunjucksShortcode('schemarender', SchemarenderShortcode);
    debug(`Added schema helper shortcodes.`)
}