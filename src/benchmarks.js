/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, FsParser, fsutils, string } = require('js-framework');
const { performance, PerformanceObserver } = require('perf_hooks');
const debug = require('debug')('Statico'),
      debugf = require('debug')('Full.Statico'),
      debugp = require('debug')('Benchmark.Statico');

/**
 * Benchmarks support.
 */
class Benchmarks
{
    /**
     * Performance observer.
     * @member {PerformanceObserver}
     */
    po = null;

    /**
     * Tags.
     * @member {object}
     */
    tags = {};

    /**
     * Static instance.
     * @member {Benchmarks}
     */
    static instance = null;

    /**
     * Constructor.
     * 
     * @param   {object}        options     Performance observer options.
     * 
     * @return  {Benchmarks}
     */
    constructor(options)
    {
        if (!options) {
            options = {entryTypes: ["measure"], buffer: false};
        }

        // Create the performance observer.
        this.po = new PerformanceObserver((items, observer) => {
            items.getEntries().forEach((entry) => {
                debugp(`Benchmarks: "${entry.name}" start: ${entry.startTime} duration: ${entry.duration}`);
            });
            observer.disconnect();
        });
        this.po.observe(options)
    }

    /**
     * Get the instance.
     * 
     * @param   {object}        options     Performance observer options.
     * 
     * @return  {Benchmarks}
     */
    static getInstance(options)
    {
        if (null === Benchmarks.instance) {
            Benchmarks.instance = new Benchmarks(options);
        }
        return Benchmarks.instance;
    }

    /**
     * Mark start.
     * 
     * @param   {string}    tag     Tag.   
     * @param   {string}    desc    Description.
     * 
     * @return  {void}
     */
    markStart(tag, desc)
    {
        if (this.tags[tag]) {
            syslog.warning(`Benchmark tag '${tag}' already exists, will be overwritten.`);
        }
        this.tags[tag] = desc;
        performance.mark(`${tag}-start`);
    }

    /**
     * Mark end.
     * 
     * @param   {string}    tag         Tag.   
     * @param   {boolean}   autoMeasure Measure after this?
     * 
     * @return  {void}
     */
    markEnd(tag, autoMeasure = true)
    {
        performance.mark(`${tag}-end`);
        if (autoMeasure) {
            this.measure(tag);
        }
    }

    /**
     * Measure.
     * 
     * @param   {string}    tag     Tag.   
     * 
     * @return  {void}
     */
    measure(tag)
    {
        performance.measure(`${this.tags[tag]}`, `${tag}-start`, `${tag}-end`);
    }


}

module.exports = Benchmarks;