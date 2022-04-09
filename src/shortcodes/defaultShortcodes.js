/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
 'use strict';

const LinkShortcode = require('./linkShortcode');
const ImgShortcode = require('./imgShortcode');
const SimpleImgShortcode = require('./simpleImgShortcode');
const ImgSpecificShortcode = require('./imgspecificShortcode');
const VideoLinkShortcode = require('./videolinkShortcode');
const MetaShortcode = require('./metaShortcode');
const TagsShortcode = require('./tagsShortcode');
const SectionShortcode = require('./sectionShortcode');
const ClearfixShortcode = require('./clearfixShortcode');
const { syslog } = require('js-framework');
const debug = require('debug')('Statico:defaultShortcodes'),
      debugf = require('debug')('Full.Statico:defaultShortcodes');

 
/**
 * Default shortcodes.
 */

module.exports = function(config) {

    config.addNunjucksShortcode('link', LinkShortcode);
    debug(`Added shortcode to Nunjucks: link`);

    config.addNunjucksShortcode('img', ImgShortcode);
    debug(`Added shortcode to Nunjucks: img`);

    config.addNunjucksShortcode('simpleimg', SimpleImgShortcode);
    debug(`Added shortcode to Nunjucks: simpleimg`);

    config.addNunjucksShortcode('imgspecific', ImgSpecificShortcode);
    debug(`Added shortcode to Nunjucks: imgspecific`);

    config.addNunjucksShortcode('videolink', VideoLinkShortcode);
    debug(`Added shortcode to Nunjucks: videolink`);

    config.addNunjucksShortcode('meta', MetaShortcode);
    debug(`Added shortcode to Nunjucks: meta`);

    config.addNunjucksShortcode('tags', TagsShortcode);
    debug(`Added shortcode to Nunjucks: tags`);

    config.addNunjucksPairedShortcode('section', SectionShortcode);
    debug(`Added shortcode to Nunjucks: section`);

    config.addNunjucksShortcode('clearfix', ClearfixShortcode);
    debug(`Added shortcode to Nunjucks: clearfix`);
}