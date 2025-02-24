/**
 * @typedef { import('./types.js').Position } Position
 * @typedef { import('./types.js').DocumentLocation } DocumentLocation
 * @typedef { import('./types.js').DocumentRange } DocumentRange
 *
 * @typedef { import('./types.js').Positioned } Positioned
 * @typedef { import('./types.js').ParsedIndexItem } ParsedIndexItem
 *
 * @typedef { import('./types.js').LocalAnchor } LocalAnchor
 * @typedef { import('./types.js').LocalLink } LocalLink
 * @typedef { import('./types.js').LocalTag } LocalTag
 *
 * @typedef { {
 *   name: string,
 *   references: Set<TagRef>
 * } } Tag
 *
 * @typedef { Positioned & {
 *   uri: string,
 *   tag: Tag
 * } } TagRef

 * @typedef { {
 *   uri: string,
 *   anchors: LocalAnchor[],
 *   links: LocalLink[],
 *   tags: LocalTag[]
 * } } Document
 *
 * @typedef { LocalAnchor } BaseAnchor
 * @typedef { LocalLink & { uri: string } } BaseLink
 * @typedef { LocalTag & { uri: string } } BaseTag

 * @typedef { BaseAnchor & { references: Set<Link> } } Anchor
 * @typedef { BaseLink & { anchor?: Anchor } } Link
 */

import { URL } from 'node:url';

import {
  inRange
} from './util.js';


/**
 * A references holder.
 */
export default class References {

  /**
   * @type { Map<string, Document> }
   */
  documentsById = new Map();

  /**
   * @type { Set<Anchor> }
   */
  anchors = new Set();

  /**
   * @type { Map<string, Set<Anchor>> }
   */
  anchorsByDocument = new Map();

  /**
   * @type { Map<string, Anchor> }
   */
  anchorsByUri = new Map();

  /**
   * @type { Map<string, Tag> }
   */
  tags = new Map();

  /**
   * @type { Map<string, Set<TagRef>> }
   */
  tagsByDocument = new Map();

  /**
   * @type { Set<Link> }
   */
  links = new Set();

  /**
   * @type { Map<string, Set<Link>> }
   */
  linksByDocument = new Map();

  /**
   * @type { Map<string, Set<Link>> }
   */
  linksByTarget = new Map();

  /**
   * @param { import('./logger.js').default } logger
   * @param { import('node:events').EventEmitter } eventBus
   */
  constructor(logger, eventBus) {
    this._logger = logger;
    this._eventBus = eventBus;

    eventBus.on('indexer:updated', (/** @type {ParsedIndexItem} */ item) => {

      try {
        const {
          uri,
          parseTree: {
            anchors,
            links,
            tags
          }
        } = item;

        this.addDocument({
          uri,
          anchors,
          links,
          tags
        });
      } catch (err) {
        this._logger.log('references :: failed to process ' + item.uri, err);
      }
    });

    eventBus.on('indexer:removed', (item) => {
      this.removeDocument(item.uri);
    });

    eventBus.on('references:changed', () => {

      this._logger.log('references :: changed', {
        links: this.links.size,
        anchors: this.anchors.size,
        tags: this.tags.size
      });
    });

  }

  /**
   * @internal
   */
  _changed() {
    clearTimeout(this._changedTimer);

    this._changedTimer = setTimeout(() => {
      this._eventBus.emit('references:changed');
    }, 300);

  }

  /**
   * @param { Document } doc
   */
  addDocument(doc) {

    const {
      uri: documentUri,
      anchors,
      links,
      tags
    } = doc;

    this._logger.log('references :: addDocument', documentUri);

    this.removeDocument(documentUri);

    this.documentsById.set(documentUri, doc);

    for (const tag of tags) {

      this._addTag({
        ...tag,
        uri: documentUri
      });
    }

    for (const anchor of anchors) {

      const {
        uri
      } = anchor;

      this._addAnchor({
        ...anchor,
        uri: resolve(uri, documentUri)
      });
    }

    for (const link of links) {
      const {
        targetUri
      } = link;

      this._addLink({
        ...link,
        uri: documentUri,
        targetUri: resolve(targetUri, documentUri)
      });
    }

    this._changed();
  }

  /**
   * @internal
   *
   * @param {BaseTag} baseTag
   */
  _addTag(baseTag) {

    const {
      uri: documentUri,
      value: name,
      position
    } = baseTag;

    let tag = this.tags.get(name);

    if (!tag) {
      tag = {
        name,
        references: new Set()
      };

      this.tags.set(name, tag);
    }

    const tagRef = {
      uri: documentUri,
      position,
      tag
    };

    tag.references.add(tagRef);

    this._addRef(tagRef, this.tagsByDocument, documentUri);
  }

  /**
   * @internal
   *
   * @param {TagRef} tagRef
   */
  _removeTag(tagRef) {
    this._removeRef(tagRef, this.tagsByDocument, tagRef.uri);

    const tag = tagRef.tag;

    tag.references.delete(tagRef);
  }

  /**
   * @internal
   *
   * @param {BaseLink} baseLink
   */
  _addLink(baseLink) {

    /** @type {Link} */
    const link = {
      ...baseLink,
      anchor: undefined
    };

    this.links.add(link);

    this._addRef(link, this.linksByTarget, link.targetUri);
    this._addDocRef(link, this.linksByDocument, link.uri);

    const anchor = this.anchorsByUri.get(link.targetUri);

    if (anchor) {
      anchor.references.add(link);
      link.anchor = anchor;
    }
  }

  /**
   * @internal
   *
   * @param {Link} link
   */
  _removeLink(link) {
    this.links.delete(link);

    this._removeRef(link, this.linksByTarget, link.targetUri);
    this._removeDocRef(link, this.linksByDocument, link.uri);

    const anchor = link.anchor;

    if (anchor) {
      anchor.references.delete(link);
      link.anchor = undefined;
    }
  }

  /**
   * @internal
   *
   * @param { BaseAnchor } baseAnchor
   */
  _addAnchor(baseAnchor) {

    /** @type {Anchor} */
    const anchor = {
      ...baseAnchor,
      references: new Set()
    };

    this.anchors.add(anchor);
    this.anchorsByUri.set(anchor.uri, anchor);

    this._addDocRef(anchor, this.anchorsByDocument, anchor.uri);

    const links = this.linksByTarget.get(anchor.uri);

    if (links) {
      for (const link of links) {
        link.anchor = anchor;
        anchor.references.add(link);
      }
    }
  }

  /**
   * @internal
   *
   * @param { Anchor } anchor
   */
  _removeAnchor(anchor) {

    this.anchors.delete(anchor);
    this.anchorsByUri.delete(anchor.uri);

    this._removeDocRef(anchor, this.anchorsByDocument, anchor.uri);

    for (const link of anchor.references) {
      link.anchor = undefined;
    }

    anchor.references.clear();
  }

  /**
   * @internal
   *
   * @template T
   * @param { T } ref
   * @param { Map<string, Set<T>> } refsByDocument
   * @param { string } uri
   */
  _addDocRef(ref, refsByDocument, uri) {

    const url = new URL(uri);
    url.search = '';
    url.hash = '';

    const documentUri = url.toString();

    return this._addRef(ref, refsByDocument, documentUri);
  }

  /**
   * @internal
   *
   * @template T
   * @param { T } ref
   * @param { Map<string, Set<T>> } refsByUri
   * @param { string } uri
   */
  _addRef(ref, refsByUri, uri) {

    let refs = refsByUri.get(uri);

    if (!refs) {
      refs = new Set();
      refsByUri.set(uri, refs);
    }

    refs.add(ref);
  }

  /**
   * @internal
   *
   * @template T
   * @param { T } ref
   * @param { Map<string, Set<T>> } refsByDocument
   * @param { string } uri
   */
  _removeDocRef(ref, refsByDocument, uri) {

    const url = new URL(uri);
    url.search = '';
    url.hash = '';

    const documentUri = url.toString();

    return this._removeRef(ref, refsByDocument, documentUri);
  }

  /**
   * @internal
   *
   * @template T
   * @param { T } ref
   * @param { Map<string, Set<T>> } refsByUri
   * @param { string } uri
   */
  _removeRef(ref, refsByUri, uri) {

    let refs = refsByUri.get(uri);

    if (!refs) {
      return;
    }

    refs.delete(ref);
  }

  /**
   * Find references to referenced link _or_ current document.
   *
   * @param { DocumentLocation } ref
   *
   * @return { DocumentRange[] } references
   */
  findReferences(ref) {

    const linkRef = this._findRef(this.linksByDocument, ref);

    // resolve links to external resources
    if (linkRef && !linkRef.anchor) {
      return Array.from(this.linksByTarget.get(linkRef.targetUri) || []);
    }

    const anchor = (
      linkRef?.anchor ||
      this._findRef(this.tagsByDocument, ref)?.tag ||
      this._findRef(this.anchorsByDocument, ref)
    );

    if (!anchor) {
      return [];
    }

    return Array.from(
      /** @type {Set<DocumentRange>} */ (anchor.references)
    );
  }

  /**
   * @param {DocumentLocation} ref
   *
   * @return {DocumentRange[]} references
   */
  findDefinitions(ref) {
    const link = this._findRef(this.linksByDocument, ref);

    if (!link) {
      return [];
    }

    if (!link.anchor) {
      const self = {
        uri: link.targetUri,
        position: link.position
      };

      return [ self ];
    }

    return [
      link.anchor
    ];
  }

  /**
   * @param {string} uri
   */
  removeDocument(uri) {

    if (!this.documentsById.has(uri)) {
      return;
    }

    const anchors = this.anchorsByDocument.get(uri);

    if (anchors) {
      for (const anchor of anchors) {
        this._removeAnchor(anchor);
      }
    }

    const links = this.linksByDocument.get(uri);

    if (links) {
      for (const link of links) {
        this._removeLink(link);
      }
    }

    const tagRefs = this.tagsByDocument.get(uri);

    if (tagRefs) {
      for (const tagRef of tagRefs) {
        this._removeTag(tagRef);
      }
    }
    this.documentsById.delete(uri);

    this._changed();
  }


  /**
   * @internal
   *
   * @template { Positioned } T
   *
   * @param { Map<string, Set<T>> } refs
   * @param { DocumentLocation } ref
   *
   * @return { T | undefined }
   */
  _findRef(refs, ref) {

    const { uri, position } = ref;

    const potentialRefs = refs.get(uri);

    if (!potentialRefs) {
      return;
    }

    return Array.from(potentialRefs).find(ref => inRange(position, ref.position));
  }

  getAnchors() {
    return Array.from(this.anchors);
  }

  getLinks() {
    return Array.from(this.links);
  }

  getTags() {
    return Array.from(this.tags.values());
  }
}


/**
 * @param {string} uri
 * @param {string} baseUri
 *
 * @return {string}
 */
function resolve(uri, baseUri) {
  const url = new URL(uri, baseUri);
  return url.toString();
}
