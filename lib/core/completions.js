import { visit } from 'unist-util-visit';

import { location } from 'vfile-location';

import path from 'node:path/posix';

import {
  fileURLToPath
} from 'node:url';

import {
  inRange,
  real,
  isParent
} from './util.js';


/**
 * @typedef { import('./types.js').Completion } Completion
 * @typedef { import('./types.js').DocumentLocation } DocumentLocation
 *
 * @typedef { import('./types.js').IndexItem } IndexItem
 *
 * @typedef { import('./types.js').Node } Node
 * @typedef { import('./types.js').Point } Point
 */


export default class Completions {

  /**
   * @param { import('./logger.js').default } logger
   * @param { import('./indexer.js').default } indexer
   * @param { import('./references.js').default } references
   */
  constructor(logger, indexer, references) {
    this._logger = logger;
    this._indexer = indexer;
    this._references = references;
  }

  /**
   * @param { DocumentLocation } ref
   *
   * @return { Promise<Completion[]> } completions
   */
  async get(ref) {

    const {
      uri,
      position
    } = ref;

    const indexItem = await this._indexer.get(uri);

    if (!indexItem) {
      return [];
    }

    const node = findNode(indexItem.parseTree, position);

    if (!node) {
      return [];
    }

    if (
      node.type === 'text' ||
      node.type === 'tag' ||
      node.type === 'heading'
    ) {
      return this._completeTag(indexItem, node, position);
    }

    if (
      node.type === 'link'
    ) {
      return this._completeRef(indexItem, node, position);
    }


    this._logger.log('cannot complete node', node);

    return [];
  }

  /**
   * @param { IndexItem } indexItem
   * @param { Node } node
   * @param { Point } point
   *
   * @return { Completion[] } completions
   */
  _completeTag(indexItem, node, point) {

    const value = String(indexItem.value);

    const loc = location(value);

    // complete after <#>
    if (node.type === 'text' || node.type === 'heading') {
      const offset = loc.toOffset(point);

      if (offset === undefined || value.charAt(offset - 1) !== '#') {
        return [];
      }

      return this._findTags(indexItem, '').map(tag => {
        return {
          label: '#' + tag,
          replace: {
            position: {
              start: real(loc.toPoint(offset - 1)),
              end: real(loc.toPoint(offset))
            },
            newText: '#' + tag
          }
        };
      });
    }

    // complete in <#tag>
    if (node.type === 'tag') {
      const nodeOffset = loc.toOffset(node.position?.start);
      const startOffset = loc.toOffset(point);

      if (nodeOffset === undefined || startOffset === undefined) {
        return [];
      }

      const prefix = value.substring(nodeOffset + 1, startOffset);

      return this._findTags(indexItem, prefix).map(tag => {
        return {
          label: '#' + tag,
          replace: {
            position: real(node.position),
            newText: '#' + tag
          }
        };
      });
    }

    return [];
  }

  /**
   * @param { IndexItem } indexItem
   * @param { string } prefix
   *
   * @return { string[] } tags
   */
  _findTags(indexItem, prefix) {
    const roots = this._indexer.getRoots();
    const root = findRoot(indexItem.uri, roots);

    return this._references.getTags()
      .filter(tag => tag.name !== prefix && tag.name.includes(prefix))
      .filter(tag => Array.from(tag.references).some(ref => root === findRoot(ref.uri, roots)))
      .map(tag => tag.name);
  }

  /**
   * @param { IndexItem } indexItem
   * @param { Node } node
   * @param { Point } point
   *
   * @return { Completion[] } completions
   */
  _completeRef(indexItem, node, point) {
    const value = String(indexItem.value);

    const loc = location(value);

    const nodeStartOffset = loc.toOffset(node.position?.start);
    const nodeEndOffset = loc.toOffset(node.position?.end);

    if (nodeStartOffset === undefined || nodeEndOffset === undefined) {
      return [];
    }

    const nodeValue = value.substring(nodeStartOffset, nodeEndOffset);
    const linkPartOffset = nodeValue.lastIndexOf('(');

    const startOffset = real(loc.toOffset(point));

    const positionOffset = startOffset - nodeStartOffset;

    if (positionOffset <= linkPartOffset) {
      return [];
    }

    const prefix = nodeValue.slice(linkPartOffset + 1, -1);

    const refs = this._findRefs(indexItem, prefix);

    return refs.map(ref => {

      return {
        label: ref,
        replace: {
          position: {
            start: real(loc.toPoint(nodeStartOffset + linkPartOffset + 1)),
            end: real(loc.toPoint(nodeEndOffset - 1))
          },
          newText: ref
        }
      };
    });
  }

  /**
   * @param { IndexItem } indexItem
   * @param { string } prefix
   *
   * @return { string[] } refs
   */
  _findRefs(indexItem, prefix) {

    const roots = this._indexer.getRoots();

    const item = {
      root: findRoot(indexItem.uri, roots),
      base: fileURLToPath(indexItem.uri)
    };

    const anchors = this._references.getAnchors().flatMap(
      anchor => {
        const { uri } = anchor;

        if (!uri) {
          return [];
        }

        const url = new URL(uri);
        const hash = url.hash;
        const base = fileURLToPath(url);

        const relative = base === item.base
          ? ''
          : path.join(path.relative(path.dirname(item.base), path.dirname(base)), path.basename(base));

        return {
          base,
          relative: relative && !relative.startsWith('.') ? './' + relative : relative,
          root: findRoot(uri, roots),
          hash
        };
      }
    ).filter(
      anchor => anchor.root === item.root && (anchor.hash || anchor.relative)
    ).map(
      anchor => anchor.relative + anchor.hash
    );

    return Array.from(
      new Set(
        anchors.filter(anchor => anchor.includes(prefix))
      )
    );
  }

}

/**
 * @param { Node } root
 * @param { Point } point
 *
 * @return { Node | undefined }
 */
function findNode(root, point) {
  let node;

  visit(
    root,
    n => (
      (isParent(n) ? n.children : []).every(ch => !inRange(point, ch.position))
    ) && inRange(point, n.position),
    n => node = n
  );

  return node;
}

/**
 * @param { string } uri
 * @param { string[] } roots
 *
 * @return { string | undefined }
 */
function findRoot(uri, roots) {
  return roots.find(root => uri.startsWith(root));
}
