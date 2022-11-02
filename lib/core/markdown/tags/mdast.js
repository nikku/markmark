/**
 * @typedef {import('mdast').Literal} Literal
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown/lib/types.js').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown/lib/types.js').Handle} ToMarkdownHandle
 * @typedef {import('mdast-util-to-markdown/lib/util/indent-lines.js').Map} Map
 */

/**
 * Function that can be called to get an extension for
 * `mdast-util-from-markdown`.
 *
 * @param {Options} [options]
 * @returns {FromMarkdownExtension}
 */
export function tagsFromMarkdown(options) {
  return {
    enter: {
      tag: open,
    },
    exit: {
      tag: close,
      tagName: value
    }
  };
}

/** @type {FromMarkdownHandle} */
function open(token) {
  this.enter({ type: 'tag', value: '' }, token);
  this.buffer();
}

/** @type {FromMarkdownHandle} */
function close(token) {
  const data = this.resume();
  const node = /** @type {Literal} */ (this.exit(token));

  node.value = data;
}

/** @type {FromMarkdownHandle} */
function value(token) {
  this.config.enter.data.call(this, token);
  this.config.exit.data.call(this, token);
}
