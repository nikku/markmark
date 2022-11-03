import { visit } from 'unist-util-visit';

import { location } from 'vfile-location';

import path from 'node:path/posix';

import {
  fileURLToPath
} from 'node:url';

import {
  inRange
} from './util.js';

/**
 * @typedef { import('./types').Completion } Completion
 * @typedef { import('./types').DocumentLocation } DocumentLocation
 * @typedef { import('./types').Node } Node
 * @typedef { import('./types').Position } Position
 * @typedef { import('./types').Point } Point
 */


export default class Completions {

  /**
   * @param { import('./logger').default } logger
   * @param { import('./indexer').default } indexer
   * @param { import('./references').default } references
   */
  constructor(logger, indexer, references) {
    this._logger = logger;
    this._indexer = indexer;
    this._references = references;
  }

  /**
   * @param { DocumentLocation } ref
   *
   * @return { Completion[] } completions
   */
  async get(ref) {

    const {
      uri,
      position
    } = ref;

    const indexItem = await this._indexer.get(uri);

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

      if (value.charAt(offset - 1) !== '#') {
        return [];
      }

      return this._findTags(indexItem, '').map(tag => {
        return {
          label: '#' + tag,
          replace: {
            position: {
              start: loc.toPoint(offset - 1),
              end: loc.toPoint(offset)
            },
            newText: '#' + tag
          }
        };
      });
    }

    // complete in <#tag>
    if (node.type === 'tag') {
      const nodeOffset = loc.toOffset(node.position.start);
      const startOffset = loc.toOffset(point);

      const prefix = value.substring(nodeOffset + 1, startOffset);

      return this._findTags(indexItem, prefix).map(tag => {
        return {
          label: '#' + tag,
          replace: {
            position: node.position,
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

    return Array.from(this._references.tags.values())
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

    const nodeStartOffset = loc.toOffset(node.position.start);
    const nodeEndOffset = loc.toOffset(node.position.end);

    const nodeValue = value.substring(nodeStartOffset, nodeEndOffset);
    const linkPartOffset = nodeValue.indexOf('(');

    const startOffset = loc.toOffset(point);

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
            start: loc.toPoint(nodeStartOffset + linkPartOffset + 1),
            end: loc.toPoint(nodeEndOffset - 1)
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

    const anchors = this._references.getAnchors().map(
      anchor => {
        const { uri } = anchor;

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
 * @param { Position } position
 *
 * @return { Node | null }
 */
function findNode(root, position) {
  let node = null;

  visit(
    root,
    n => (!n.children || n.children.length === 0) && inRange(position, n.position),
    n => node = n
  );

  return node;
}

/**
 * @param { string } uri
 * @param { string[] } roots
 *
 * @return { string }
 */
function findRoot(uri, roots) {
  return roots.find(root => uri.startsWith(root));
}
