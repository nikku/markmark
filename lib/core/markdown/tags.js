import { tags } from './tags/micromark.js';
import { tagsFromMarkdown } from './tags/mdast.js';

/** @typedef { {} } Options */
/** @typedef { import('../types.js').Root } Root */

/**
 * Plugin to add support for frontmatter.
 *
 * @type { import('unified').Plugin<[Options?]|void[], Root> }
 */
export default function remarkTags() {
  const data = this.data();

  add('micromarkExtensions', tags());
  add('fromMarkdownExtensions', tagsFromMarkdown());

  /**
   * @param {'micromarkExtensions' | 'fromMarkdownExtensions'} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      data[field] ? data[field] : (data[field] = [])
    );

    list.push(value);
  }
}
