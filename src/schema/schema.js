/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { URL } = require('url');
const { MD5, string, syslog } = require('js-framework');
const { SchemaGraph, SchemaCreator, SchemaBase } = require('js-framework');
const debug = require('debug')('Framework:schema.Schema'),
      debugf = require('debug')('Full.Framework:schema.Schema');


/**
 * A schema collection.
 */
class Schema
{
    /**
     * Context.
     * @type    {string}
     */
    static schemaContext = "https://schema.org";

    /**
     * Global images.
     * @type    {object}
     */
    static globalImages = {};

    /**
     * Items in the collection.
     * @member {object}
     */
    items = {};

    /**
     * Raw source for schema.
     * @member {object}
     */
    raw = {};

    /**
     * Images.
     * @member  {object}
     */
    images = {};

    /**
     * Image IDs
     * @member {string[]}
     */
    imageIds = [];

    /**
     * Image IDs for a source.
     * @member {object}
     */
    imageIdsForSrc = {};

    /**
     * Videos.
     * @member {object}
     */
    videos = {};

    /**
     * Video IDs
     * @member {string[]}
     */
    videoIds = [];

    /**
     * Configs.
     * @member {object}
     */
    config = {};

    /**
     * Context.
     * @member {object}
     */
    ctx = null;

    /**
     * Schema graph.
     * @member {SchemaGraph}
     */
    graph = null;

    /**
     * Have we rendered the article?
     * @member {boolean}
     */
    renderedArticle = false;

    /**
     * Constructor.
     * 
     * @param   {object}    config      Configs.
     * 
     * @return  {Schema}
     */
    constructor(config)
    {
        this.config = config;
        SchemaBase.urlDomain = this.config.hostname;
        this.graph = new SchemaGraph;
    }

    /**
     * Set the page/article context.
     * 
     * @param   {object}    ctx         Context.
     * 
     * @return  {Schema}
     */
    setCtx(ctx)
    {
        this.ctx = ctx;
        return this;
    }

    /**
     * Add raw.
     * 
     * @param   {string}    name        Name.
     * @param   {object}    obj         Raw data.
     * 
     * @return  {Schema}
     */
    addRaw(name, obj)
    {
        this.raw[name] = obj;
        return this;
    }

    /**
     * Push raw.
     * 
     * @param   {string}    name        Name.
     * @param   {object}    obj         Raw data.
     * 
     * @return  {Schema}
     */
    pushRaw(name, obj)
    {
        if (!this.raw[name]) {
            this.raw[name] = [];
        }
        this.raw[name].push(obj);
        return this;
    }

    /**
     * Add global image.
     * 
     * @param   {string}    name        Name.
     * @param   {object}    obj         Raw data.
     * 
     * @return  {Schema}
     */
    static addGlobalImage(name, obj)
    {
        //debug(`Adding global image ${name}: %O`, obj);
        Schema.globalImages[name] = obj;
        return this;
    }

    /**
     * Add image.
     * 
     * @param   {string}    name        Name.
     * @param   {object}    obj         Raw data.
     * 
     * @return  {Schema}
     */
    addImage(name, obj)
    {
        this.images[name] = obj;
        return this;
    }

    /**
     * Add video.
     * 
     * @param   {string}    name        Name.
     * @param   {object}    obj         Raw data.
     * 
     * @return  {Schema}
     */
    addVideo(name, obj)
    {
        this.videos[name] = obj;
        return this;
    }

    /**
     * Dump images.
     * 
     * @return  {void}
     */
    dumpImages(page)
    {
        debug(`-------------------------------------------------------------`);
        debug(`Page ${page}`);
        debug(`-------------------------------------------------------------`);
        for (let name of Object.keys(this.images)) {
            debug(`====> ${name}`);
            let count = 0;
            for (let item of Object.keys(this.images[name])) {
                //debug(`Item ${count}: %O`, this.images[name][item]);
                let i = 0;
                for (let f of this.images[name][item].files) {
                    debug(`File ${count}.${i}: %O`, f);
                    i++;
                }
                count++;
            }
        }
    }

    /**
     * Create a reference.
     * 
     * @param   {string}    tag
     * 
     * @return  {object}
     */
    ref(tag)
    {
        return {"@id": new URL('#' + tag, this.config.hostname)};
    }

    /**
     * Qualify a URL.
     * 
     * @param   {string}    path
     * 
     * @return  {string} 
     */
    qualify(path)
    {
        if (path.startsWith(this.config.hostname)) {
            return path;
        }
        return new URL(path, this.config.hostname).toString();
    }

    /**
     * Render images.
     * 
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderImages(page)
    {
        let mdc = new MD5();
        for (let idx of Object.keys(this.images)) {
            for (let type of Object.keys(this.images[idx])) {
                for (let f of this.images[idx][type].files) {
                    let mdid = 'image-' + mdc.md5(f.file);
                    let sch = SchemaCreator.create('ImageObject', mdid);
                    sch.contentUrl(this.qualify(f.file));
                    sch.url(this.qualify(f.file));
                    sch.width(f.width);
                    sch.height(f.height);
                    sch.representativeOfPage(true);
                    this.graph.set(mdid, sch);

                    this.imageIds.push(mdid);
                    if (!this.imageIdsForSrc[idx]) {
                        this.imageIdsForSrc[idx] = [];
                    }
                    this.imageIdsForSrc[idx].push(mdid);
                }
            }
        }
    }

    /**
     * Render videos.
     * 
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderVideos(page)
    {
        let mdc = new MD5();
        for (let idx of Object.keys(this.videos)) {
            let mdid = 'video-' + mdc.md5(idx);
            let sch = SchemaCreator.create('VideoObject', mdid);
            for (let field in this.videos[idx]) {
                sch.addProp(field, this.videos[idx][field]);
            }

            this.graph.set(mdid, sch);

            this.videoIds.push(mdid);
        }
    }

    /**
     * Create global image object.
     * 
     * @param   {string}    src
     * 
     * @return  {string[]}              IDs
     */
    createGlobalImageObject(src)
    {
        let ret = [];
        let mdc = new MD5();
        if (Schema.globalImages[src]) {
            for (let type of Object.keys(Schema.globalImages[src])) {
                for (let f of Schema.globalImages[src][type].files) {
                    let mdid = 'image-' + mdc.md5(f.file);
                    let sch = SchemaCreator.create('ImageObject', mdid);
                    sch.contentUrl(this.qualify(f.file));
                    sch.url(this.qualify(f.file));
                    sch.width(f.width);
                    sch.height(f.height);
                    sch.representativeOfPage(true);
                    this.graph.set(mdid, sch);
                    ret.push(mdid); 
                }
            }
        } else {
            let mdid = 'image-' + mdc.md5(src);
            let sch = SchemaCreator.create('ImageObject', mdid);
            sch.contentUrl(this.qualify(src));
            sch.url(this.qualify(src));
            this.graph.set(mdid, sch);
            ret.push(mdid); 
        }
        return ret;
    }

    /**
     * Render the authors.
     * 
     * @param   {object}    authors
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderAuthors(authors, page)
    {
        for (let key of Object.keys(authors)) {
            let id = 'author-' + string.slugify(key);
            let sch = SchemaCreator.create('Person', id);
            let stink = authors[key];
            for (let f in stink) {
                if ('image' === f) {
                    let ids = this.createGlobalImageObject(stink['image']);
                    let refs = [];
                    for (let id of ids) {
                        refs.push(SchemaBase.ref(id));
                    }
                    sch.image(refs);
                } else if ('url' === f) { 
                    sch.url(this.qualify(stink[f]));
                } else {
                    sch.addProp(f, stink[f]);
                }
            }
            this.graph.set(id, sch);
        }
    }

    /**
     * Get all the image IDs
     * 
     * @return
     */
    getImageIds()
    {
        let ret = [];
        for (let item of this.imageIds) {
            ret.push(this.ref(item));
        }
        return ret;
    }

    /**
     * Get all the video IDs
     * 
     * @return
     */
    getVideoIds()
    {
        let ret = [];
        for (let item of this.videoIds) {
            ret.push(this.ref(item));
        }
        return ret;
    }

    /**
     * Render the publisher.
     * 
     * @param   {object}    punlisher
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderPublisher(publisher, page)
    {
        let sch = SchemaCreator.create('Organization', 'publisher');
        for (let key of Object.keys(publisher)) {
            if ('image' === key || 'logo' === key) {
                let ids = this.createGlobalImageObject(publisher[key]);
                let refs = [];
                for (let id of ids) {
                    refs.push(SchemaBase.ref(id));
                }
                sch.addProp(key, refs);
            } else if ('url' === key) { 
                sch.url(this.qualify(publisher[key]));
            } else {
                sch.addProp(key, publisher[key]);
            }
        }
        this.graph.set('publisher', sch);
    }

    /**
     * Render the website.
     * 
     * @param   {string}  page
     * 
     * @return  {void}
     */
    _renderWebsite(page)
    {
        if (this.config.site) {
            let site = this.config.site;
            let sch = SchemaCreator.create('WebSite', 'website');

            if (site.publisher) {
                this._renderPublisher(site.publisher, page);
                sch.publisher(SchemaBase.ref('publisher'));
            }
            
            if (site.title) sch.name(site.title);
            if (site.description) sch.description(site.description);
            sch.url(this.config.hostname);
            this.graph.set('website', sch);
        }
    }

    /**
     * Render the web page.
     * 
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderWebpage(page)
    {
        if (this.ctx) {

            if (this.config.site.authors) {
                this._renderAuthors(this.config.site.authors, page); 
            }

            //debug("ctx: %O", this.ctx);

            let type = 'WebPage';
            if (this.ctx.about && true === this.ctx.about) {
                type = 'AboutPage';
            } else if (this.ctx.contact && true === this.ctx.contact) {
                type = 'ContactPage';
            } else if (this.ctx.type && 'collection' === this.ctx.type) {
                type = 'CollectionPage';
            } else if (this.raw.faqpage) {
                type = 'FAQPage';
            }

            if (this.ctx.home && true === this.ctx.home) {
                if (this.ctx.pagination && this.ctx.pagination.page && this.ctx.pagination.page != 1) {
                    this.ctx.title = `${this.ctx.site.title} (Page ${this.ctx.pagination.page })`;
                    this.ctx.description = `${this.ctx.site.description} (Page ${this.ctx.pagination.page })`;
                } else {
                    this.ctx.title = this.ctx.site.title;
                    this.ctx.description = this.ctx.site.description;
                }
            }


            let sch = SchemaCreator.create(type, 'webpage');

            if (this.ctx.title) {
                sch.name(this.ctx.title);
            }

            for (let item of ['headline', 'description']) {
                if (this.ctx[item]) {
                    sch.addProp(item, this.ctx[item]);
                }
            }

            if (this.ctx.permalink) {
                sch.url(this.qualify(this.ctx.permalink));
            }

            if (!this.ctx.headline && this.ctx.title) {
                sch.headline(this.ctx.title)
            }

            if (this.ctx._date) {
                sch.datePublished(this.ctx._date.iso);
            }

            if (this.ctx._modified) {
                sch.dateModified(this.ctx._modified.iso);
            }

            sch.isPartOf(SchemaBase.ref('website'));

            if (this.raw.breadcrumb) {
                let itemListElements = [];
                for (let item of this.raw.breadcrumb) {
                    let bcitem = SchemaCreator.create('ListItem', null, {name: item.title, position: item.num});
                    if (item.url) {
                        bcitem.item(SchemaCreator.create('WebPage', SchemaBase.plainId(this.qualify(item.url))));
                    }
                    itemListElements.push(bcitem);
                }
                sch.breadcrumb(SchemaCreator.create('BreadcrumbList', null, {itemListElement: itemListElements}));
            }

            if (this.ctx.permalink) {
                //sch.potentialAction(SchemaCreator.create('ReadAction', null, {target: this.qualify(this.ctx.permalink)}));
            }

            let author = 'author-' + string.slugify(this.ctx.author || this.config.site.defaultAuthor); 
            sch.author(SchemaBase.ref(author));

            if (this.imageIds.length > 0) {
                sch.image(this.getImageIds());
            }
            if (this.videoIds.length > 0) {
                sch.video(this.getVideoIds());
            }

            this.graph.set('webpage', sch);


            if (this.raw.faqpage) {
                this._renderFaqPage(page);
                this._renderReview(page);
            } else {
                this._renderArticle(page);
                this._renderReview(page);
                this._renderHowTo(page);
            }
        }
    }

    /**
     * Render the article.
     * 
     * @param   {string}    page
     * 
     * @return  {void}
     */
    _renderArticle(page)
    {
        if (this.ctx) {

            //debug("ctx: %O", this.ctx);

            let type = 'BlogPosting';
            if (this.ctx.type && 'post' !== this.ctx.type) {
                type = 'Article';
            }

            let sch = SchemaCreator.create(type, 'article');

            if (this.ctx.title) {
                sch.name(this.ctx.title);
            }

            for (let item of ['headline', 'description']) {
                if (this.ctx[item]) {
                    sch.addProp(item, this.ctx[item]);
                }
            }

            if (this.ctx.permalink) {
                sch.url(this.qualify(this.ctx.permalink));
            }

            if (!this.ctx.headline && this.ctx.title) {
                sch.headline(this.ctx.title);
            }

            if (!sch.hasProp('headline') && this.config.schemaWarnings) {
                syslog.warning(`Article at '${page}' has no headline.`);
            }

            if (this.ctx._date) {
                sch.datePublished(this.ctx._date.iso);
            }

            if (this.ctx._modified) {
                sch.dateModified(this.ctx._modified.iso);
            }

            sch.mainEntityOfPage(SchemaBase.ref('webpage'))

            let author = 'author-' + string.slugify(this.ctx.author || this.config.site.defaultAuthor); 
            sch.author(SchemaBase.ref(author));

            if (this.ctx.tags) {
                sch.keywords(this.ctx.tags);
            }

            if (this.ctx.wordcount) {
                sch.wordCount(this.ctx.wordcount);
            }

            if (this.ctx.excerpt_text) {
                sch.backstory(this.ctx.excerpt_text);
            }

            if (this.raw.citation) {
                sch.citation(SchemaCreator.create('WebPage', null, 
                    {
                        name: this.raw.citation.title,
                        url: this.raw.citation.url
                    }
                ));
            }

            if (this.imageIds.length > 0) {
                sch.image(this.getImageIds());
            }
            if (this.videoIds.length > 0) {
                sch.video(this.getVideoIds());
            }

            this.graph.set('article', sch);
            
        }
    }

    /**
     * Render a product.
     * 
     * @param   {string}    page 
     * @param   {object}    productFields
     * 
     * @return  {string}    Product ID.
     */
    _renderProduct(page, productFields, rating = null, reviewId)
    {
        let id = 'product-' + string.slugify(productFields.name);
        let sch = SchemaCreator.create(productFields.type, id);

        for (let idx of Object.keys(productFields)) {
            if ('type' !== idx && !idx.startsWith('__') && !idx.startsWith('@')) {

                if ('brand' === idx) {
                    sch.brand(SchemaCreator.create('Organization', null, {name: productFields[idx]}));
                } else if ('operatingSystem' === idx) {
                    sch.operatingSystem(productFields[idx]);
                } else if ('Event' === productFields.type) {
                    if ('organizer' === idx) {
                        let n = {name: productFields[idx]};
                        if (productFields['organizer_url']) {
                            n.url = productFields['organizer_url'];
                        }
                        sch.organizer(SchemaCreator.create('Organization', null, n));
                    } else if ('location' === idx) {
                        sch.location(SchemaCreator.create('Place', null, {address: productFields[idx]}));
                    } else if ('organizer_url' !== idx) {
                        sch.addProp(idx, productFields[idx]);
                    }

                } else {
                    sch.addProp(idx, productFields[idx]);
                }
            }
        }

        /*
        if (rating) {
            sch.aggregateRating(SchemaCreator.create('AggregateRating', null, {
                ratingValue: rating,
                bestRating: 5,
                worstRating: 0,
                ratingCount: 1
            }));
        }
        */

        sch.review(SchemaBase.ref(reviewId));

        if (this.imageIds.length > 0) {
            sch.image(this.getImageIds());
        }

        if (this.videoIds.length > 0) {
            //sch.video(this.getVideoIds());
        }

        this.graph.set(id, sch);

        return id;
    }

    /**
     * Render a review.
     * 
     * @param   {string}    page 
     * 
     * @return  {void}
     */
    _renderReview(page)
    {
        if (!this.raw.review) {
            return;
        }

        let aggr = null;
        if (this.raw.review.review.aggr) {
            aggr = this.raw.review.review.aggr;
        }
        let rating = null;
        //if (aggr) {
            rating = this.raw.review.review.rating;
        //}

        let reviewFields = this.raw.review.review;
        let id = 'review-' + string.slugify(reviewFields.name);

        let pid = null;
        if (this.raw.review.product) {
            pid = this._renderProduct(page, this.raw.review.product, rating, id);
        }
 
        let sch = SchemaCreator.create('Review', id);

        for (let idx of Object.keys(reviewFields)) {
            if ('type' !== idx && !idx.startsWith('__') && !idx.startsWith('@')) {

                if ('rating' === idx) {
                    sch.reviewRating(SchemaCreator.create('Rating', null, {
                        ratingValue: reviewFields[idx],
                        bestRating: 5,
                        worstRating: 0
                    }));
                } else {
                    sch.addProp(idx, reviewFields[idx]);
                }

            }
        }

        if (!this.raw.faqpage) {
            sch.mainEntityOfPage(SchemaBase.ref('article'));
        }

        let author = 'author-' + string.slugify(this.ctx.author || this.config.site.defaultAuthor); 
        sch.author(SchemaBase.ref(author));


        sch.itemReviewed(SchemaBase.ref(pid));

        this.graph.set(id, sch);
    }

    /**
     * Render a howto.
     * 
     * @param   {string}    page 
     * 
     * @return  {void}
     */
    _renderHowTo(page)
    {
        if (!this.raw.howto) {
            return;
        }

        let sch = SchemaCreator.create('HowTo', 'howto');

        for (let idx of Object.keys(this.raw.howto)) {
            if ('type' !== idx && !idx.startsWith('__') && !idx.startsWith('@')) {
                sch.addProp(idx, this.raw.howto[idx]);
            }
        }

        sch.step(this._renderHowToSteps(page));
        sch.mainEntityOfPage(SchemaBase.ref('article'));

        this.graph.set('howto', sch);
    }

    /**
     * Render howto steps.
     * 
     * @param   {string}    page 
     * 
     * @return  {void}
     */
    _renderHowToSteps(page)
    {
        if (!this.raw.howtostep) {
            return [];
        }

        let ret = [];

        let stepNum = 1;

        for (let item of this.raw.howtostep) {

            let step = SchemaCreator.create('HowToStep', null, {
                name: item.name,
                text: item.text,
                url: this.qualify(path.join(page, '#step-' + stepNum))
            });

            if (item.image && this.imageIdsForSrc[item.image]) {
                let imgs = [];
                for (let im of this.imageIdsForSrc[item.image]) {
                    imgs.push(SchemaBase.ref(im));
                }
                step.image(imgs);
            }

            ret.push(step);
            stepNum++;
        }

        return ret;
    }

    /**
     * Render an FAQ page.
     * 
     * @param   {string}    page 
     * 
     * @return  {void}
     */
    _renderFaqPage(page)
    {
        if (!this.raw.faqpage) {
            return;
        }

        /*
        let sch = SchemaCreator.create('FAQPage', 'faqpage');
        for (let idx of Object.keys(this.raw.faqpage)) {
            if ('type' !== idx && !idx.startsWith('__') && !idx.startsWith('@')) {
                sch.setProp(idx, this.raw.faqpage[idx]);
            }
        }
        */

        this.graph.get('webpage').mainEntity(this._renderFaqQAs(page));

        //this.graph.set('faqpage', sch);
    }

    /**
     * Render FAQ QAs.
     * 
     * @param   {string}    page 
     * 
     * @return  {void}
     */
    _renderFaqQAs(page)
    {
        if (!this.raw.faqqa) {
            return [];
        }

        let ret = [];

        let stepNum = 1;

        for (let item of this.raw.faqqa) {

            let step = SchemaCreator.create('Question', null, {
                name: item.q,
                url: this.qualify(path.join(page, '#faq-' + stepNum))
            });

            step.addProp('acceptedAnswer', SchemaCreator.create('Answer', null, {text: item.text}));

            ret.push(step);
            stepNum++;
        }

        return ret;
    }

    /**
     * Render part.
     * 
     * @param   {string}    part
     * @param   {object}    data
     * 
     * @return
     */
    renderPart(part, data = null)
    {
        let defs = this.config.schemaDefs;
        if (!defs[part]) {
            syslog.error(`No schema defs for part '${part}'.`);
            return;
        }

        let partDefs = defs[part];

        if (!partDefs.type) {
            syslog.error(`No scheme definition for 'type' in part '${part}'.`);
            return;
        }

        let id = null;
        if (partDefs.id) {
            id = partDefs.id;
        }

        let sch = SchemaCreator.create(partDefs.type, id);

        let ignores = ['id', 'type'];
        let toqualify = ['url'];

        for (let key of Object.keys(partDefs)) {

            if (ignores.includes(key)) {
                continue;
            }

            let d = partDefs[key];
            let v = null;
            if ('string' === typeof(d)) {
                syslog.warning(d);
                if (d.startsWith('site.')) {
                    let dfilt = d.substring('site.'.length)
                    if (!this.config.site[dfilt]) {
                        syslog.error(`No site specification for '${dfilt}' - cannot process schema.`)
                        continue;
                    }
                    v = this.config.site[dfilt];
                /*
                } else if (d.startsWith('cfg.')) {
                    let dfilt = d.substring('cfg.'.length)
                    if (!this.config[dfilt]) {
                        syslog.error(`No config specification for '${dfilt}' - cannot process schema.`)
                        continue;
                    }
                    v = this.config[dfilt];
                    */
                }
            }

        
            if (null !== v) {
                if (toqualify.includes(key)) {
                    v = this.qualify(v);
                }
                
                sch.addProp(key, v);
            }

        }

        syslog.inspect(sch.resolveProps(), "error");

    }

    /**
     * Render the schema.
     * 
     * @return  {string}
     */
    render(page, replacer = null, space = null)
    {
        this.renderPart('website');

        this._renderImages(page);
        this._renderVideos(page);
        this._renderWebsite(page);
        this._renderWebpage(page);
        /*
        this._renderReview(page);
        this._renderHowTo(page);
        this._renderFaqPage(page);
        */

        //this.dumpImages(page);

        //debug(`${page}: %O`, this.items)

        /*
        let ret = {
            "@context": Schema.schemaContext,
            "@graph": []
        }
        for (let idx in this.items) {
            ret['@graph'].push(this.items[idx].attribs);
        }
        */
        return this.graph.resolve();
    }
}

module.exports = Schema;