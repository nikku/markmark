/**
 * @typedef { import('mdast').Literal } Literal
 * @typedef { import('mdast-util-from-markdown').Extension } FromMarkdownExtension
 * @typedef { import('mdast-util-from-markdown').Handle } FromMarkdownHandle
 * @typedef { import('mdast-util-to-markdown').Handle } ToMarkdownHandle
 * @typedef { import('mdast-util-to-markdown').Map } Map
 */

/**
 * Function that can be called to get an extension for
 * `mdast-util-from-markdown`.
 *
 * @param { Options } [options]
 * @returns { FromMarkdownExtension }
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

/** @type { FromMarkdownHandle } */
function open(token) {
  this.enter({ type: 'tag', value: '' }, token);
  this.buffer();
}

/** @type { FromMarkdownHandle } */
function close(token) {
  const data = this.resume();

  const node = /** @type {Literal} */ (this.stack[this.stack.length - 1]);
  node.value = data;

  return this.exit(token);
}

/** @type { FromMarkdownHandle } */
function value(token) {
  this.config.enter.data.call(this, token);
  this.config.exit.data.call(this, token);
}
