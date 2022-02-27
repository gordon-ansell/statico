/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
 'use strict';

const LinkShortcode = require('./linkShortcode');
const ImgShortcode = require('./imgShortcode');
const ImagesIncludeShortcode = require('./imagesincludeShortcode');
const SimpleImgShortcode = require('./simpleImgShortcode');
const VideoLinkShortcode = require('./videolinkShortcode');
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

    config.addNunjucksShortcode('imagesinclude', ImagesIncludeShortcode);
    debug(`Added shortcode to Nunjucks: imagesinclude`);

    config.addNunjucksShortcode('simpleimg', SimpleImgShortcode);
    debug(`Added shortcode to Nunjucks: simpleimg`);

    config.addNunjucksShortcode('videolink', VideoLinkShortcode);
    debug(`Added shortcode to Nunjucks: videolink`);
}