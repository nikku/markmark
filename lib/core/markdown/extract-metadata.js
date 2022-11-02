import { visit } from 'unist-util-visit';

import { Index } from 'unist-util-index';

import GithubSlugger from 'github-slugger';

import { toString } from 'mdast-util-to-string';

/**
 * @typedef { import('../types').DocumentRef } DocumentRef
 * @typedef { import('../types').Root } Root
 * @typedef { import('../types').Definition } Definition
 * @typedef { import('../types').TaggedRoot } TaggedRoot
 */

/**
 * Tag links plug-in.
 *
 * @type { import('unified').Plugin<[Options?]|void[], Root, TaggedRoot> }
 */
export default function tagLinks(options) {

  /**
   * @param { Root } tree
   * @param { VFile } file
   *
   * @return { TaggedRoot }
   */
  return (tree, file) => {

    const slugger = new GithubSlugger();

    const definitionsById = new Index('identifier', tree, 'definition');

    /**
     * @type { DocumentRef[] }
     */
    const links = [];

    /**
     * @type { DocumentRef[] }
     */
    const anchors = [];

    /**
     * @type { DocumentRef[] }
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
          position: node.position,
          value: node.value
        });
      }

      if (
        node.type === 'link' ||
        node.type === 'image'
      ) {
        links.push({
          targetUri: node.url,
          position: node.position
        });
      }

      if (
        node.type === 'linkReference'
      ) {

        const definition = /** @type { Definition } */ (
          definitionsById.get(node.identifier)[0]
        );

        links.push({
          targetUri: definition.url,
          position: node.position
        });
      }

      if (
        node.type === 'heading'
      ) {

        const slug = slugger.slug(toString(node));

        anchors.push({
          uri: '#' + slug,
          position: node.position
        });
      }
    });

    anchors.push({
      uri: '',
      position: {
        start: {
          line: 0,
          column: 0
        },
        end: {
          line: 0,
          column: 0
        }
      }
    });

    return {
      ...tree,
      links,
      anchors,
      tags
    };
  };
}
