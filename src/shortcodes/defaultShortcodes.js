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
const { syslog } = require('gajn-framework');
 
/**
 * Default shortcodes.
 */

module.exports = function(config) {

    config.addNunjucksShortcode('link', LinkShortcode);
    syslog.debug(`Added shortcode to Nunjucks: link`);

    config.addNunjucksShortcode('img', ImgShortcode);
    syslog.debug(`Added shortcode to Nunjucks: img`);

    config.addNunjucksShortcode('imagesinclude', ImagesIncludeShortcode);
    syslog.debug(`Added shortcode to Nunjucks: imagesinclude`);

    config.addNunjucksShortcode('simpleimg', SimpleImgShortcode);
    syslog.debug(`Added shortcode to Nunjucks: simpleimg`);

    config.addNunjucksShortcode('videolink', VideoLinkShortcode);
    syslog.debug(`Added shortcode to Nunjucks: videolink`);
}