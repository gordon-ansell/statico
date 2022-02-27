/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog } = require('js-framework');
const StaticoError = require('./staticoError');

class StaticoCollectionError extends StaticoError {};

/**
 * Statico collection.
 */
class Collection
{
    /**
     * Name.
     * @member {string}
     */
    #name = null;

    /**
     * Items.
     * @member  {Map}
     */
    _items = null;

    /**
     * Constructor.
     * 
     * @param   {string}    name        Collection name.
     * 
     * @return  {Collection}
     */
    constructor(name)
    {
        this.#name = name;
        this._items = new Map();
    }

    /**
     * Get the name.
     * 
     * @return {string}
     */
    get name()
    {
        return this.#name;
    }

    /**
     * Get the size.
     * 
     * @return {number}
     */
    get size()
    {
        return this._items.size;
    }

    /**
     * Set an item.
     * 
     * @param   {any}       key     Key.
     * @param   {any}       val     Value. 
     * @return  {object}            Ourself.
     */
    set(key, value)
    {
        this._items.set(key, value);
        return this;
    }

    /**
     * Do we have an item?
     * 
     * @param   {any}   key     Key.
     * @return  {boolean}       True if we do. 
     */
    has(key)
    {
        return this._items.has(key);
    }

    /**
     * Get an item?
     * 
     * @param   {any}   key     Key.
     * @return  {any}           Item value. 
     */
    get(key)
    {
        return this._items.get(key);
    }
 
    /**
     * The compare function for sorting articles.
     * 
     * @param   {object}    a   First article.
     * @param   {object}    b   Second article.
     */
    _sortDescCompare(a, b)
    {
        throw new StaticoCollectionError("You must overload a collection's '_sortDescCompare' function.")
    }

    /**
     * The compare function for sorting articles.
     * 
     * @param   {object}    a   First article.
     * @param   {object}    b   Second article.
     */
    _sortAscCompare(a, b)
    {
        throw new StaticoCollectionError("You must overload a collection's '_sortAscCompare' function.")
    }

    /**
     * Get a page of data.
     * 
     * @param   {number}    num     Page number.
     * @param   {number}    max     Max records.
     * @param   {string}    sort    Sort order.
     * 
     * @return       
     */
    page(num, max, sort = 'desc')
    {
        this[sort]();

        let totalRecs = this.size;
        //let totalPages = Math.ceil(totalRecs / max);
        if (!num) {
            num = 1;
        }

        if (num < 1) {
            throw new StaticoCollectionError(`Invalid pagination page number: ${num}.`);
        }
        if (num > this.totalPages) {
            throw new StaticoCollectionError(`Pagination page number ${num} does not exist.`);
        }

        let keys = Array.from(this.keys());
 
        let start = (num * max) - max + 1;
        let end = start + max - 1;

        let filtered = keys.filter((val, idx) => {
            return (idx >= start - 1 && idx <= end - 1);
        });

        let ret = [];
        for (let want of filtered) {
            ret.push(this.get(want));
        }

        return ret;

    }

    /**
     * Get the latest modified date for items in this collection.
     * 
     * @return  {string}
     */
    getLatestModifiedDate()
    {
        let arr = [...this._items.values()];
        let latest = null;
        for (let item of arr) {
            if (null === latest || item.data._modified.ms > latest.ms) {
                latest = item.data._modified;
            }
        }
        return latest;
    }

    /**
     * Sort the articles descending.
     * 
     * @return  {object}        Ourself.
     */
    desc()
    {
        this._items = new Map([...this._items.entries()].sort(this._sortDescCompare));   
        return this;   
    }

    /**
     * Sort the articles ascending.
     * 
     * @return  {object}        Ourself.
     */
    asc()
    {
        this._items = new Map([...this._items.entries()].sort(this._sortAscCompare));   
        return this;   
    }

    /**
     * Get the keys.
     */
    keys()
    {
        return this._items.keys();
    }

    /**
     * Get the values.
     */
    values()
    {
        return this._items.values();
    }

    /**
     * Get the underlying entries.
     * 
     * @return  {object}        The underlying key => data values.
     */
    getData()
    {
        return this._items;
    }
 }

module.exports = Collection;