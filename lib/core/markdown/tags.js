import { tags } from './tags/micromark.js';
import { tagsFromMarkdown } from './tags/mdast.js';


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
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    );

    list.push(value);
  }
}
