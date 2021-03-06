/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog } = require('js-framework');
const StaticoError = require('./staticoError');
const Collection = require('./collection');

class StaticoCollectionError extends StaticoError {};

/**
 * Statico collection sorted bt date.
 */
class CollectionDateSorted extends Collection
{
    /**
     * The compare function for sorting articles.
     * 
     * @param   {object}    a   First article.
     * @param   {object}    b   Second article.
     */
     _sortDescCompare(a, b)
     {
         if (a[1].data._date.ms < b[1].data._date.ms) {
             return 1;
         }
         if (b[1].data._date.ms < a[1].data._date.ms) {
             return -1;
         }
         return 0;
     }
 
     /**
      * The compare function for sorting articles.
      * 
      * @param   {object}    a   First article.
      * @param   {object}    b   Second article.
      */
     _sortAscCompare(a, b)
     {
         if (a[1].data._date.ms < b[1].data._date.ms) {
             return -1;
         }
         if (b[1].data._date.ms < a[1].data._date.ms) {
             return 1;
         }
         return 0;
     }
 
     /**
      * Dump collection.
      */
     dump(level = "warning", context = '')
     {
         let res = new Map();
         for (let key of this._items.keys()) {
             let obj = {...this._items.get(key)};
             delete obj.ctx;
             res.set(key, obj);
         }
         syslog.inspect(res, level, context);
     }

 }

module.exports = CollectionDateSorted;