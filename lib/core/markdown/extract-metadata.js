import { visit } from 'unist-util-visit';

import { Index } from 'unist-util-index';

import GithubSlugger from 'github-slugger';

import { toString } from 'mdast-util-to-string';
import { documentRange, real } from '../util.js';

/**
 * @typedef { import('../types.js').LocalLink } Link
 * @typedef { import('../types.js').LocalTag } Tag
 * @typedef { import('../types.js').LocalAnchor } Anchor
 *
 * @typedef { import('../types.js').Root } Root
 * @typedef { import('../types.js').Definition } Definition
 * @typedef { import('../types.js').TaggedRoot } TaggedRoot
 *
 * @typedef { import('vfile').VFile } VFile
 *
 * @typedef { import('unist').Position } Position
 *
 * @typedef { {} } Options
 */

/**
 * Tag links plug-in.
 *
 * @type { import('unified').Plugin<[Options?]|void[], Root, TaggedRoot> }
 *
 * @param { Options } [_options]
 */
export default function tagLinks(_options) {

  /**
   * @param { Root } tree
   * @param { VFile } _file
   *
   * @return { TaggedRoot }
   */
  return (tree, _file) => {

    const slugger = new GithubSlugger();

    const definitionsById = new Index('identifier', tree, 'definition');

    /**
     * @type { Link[] }
     */
    const links = [];

    /**
     * @type { Anchor[] }
     */
    const anchors = [];

    /**
     * @type { Tag[] }
     */
    const tags = [];

    visit(tree, (node) => {

      if (!node.position) {
        return;
      }

      if (
        node.type === 'tag'
      ) {
        tags.push({
          position: real(node.position),
          value: node.value
        });
      }

      if (
        node.type === 'link' ||
        node.type === 'image'
      ) {
        links.push({
          position: real(node.position),
          targetUri: node.url
        });
      }

      if (
        node.type === 'linkReference'
      ) {

        const definition = /** @type { Definition } */ (
          definitionsById.get(node.identifier)[0]
        );

        links.push({
          position: real(node.position),
          targetUri: definition.url
        });
      }

      if (
        node.type === 'heading'
      ) {

        const slug = slugger.slug(toString(node));

        anchors.push({
          position: real(node.position),
          uri: '#' + slug
        });
      }
    });

    anchors.push({
      uri: '',
      position: documentRange()
    });

    return {
      ...tree,
      links,
      anchors,
      tags
    };
  };
}
