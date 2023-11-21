/**
 * @typedef { import('micromark-util-types').Extension } Extension
 * @typedef { import('micromark-util-types').ConstructRecord } ConstructRecord
 * @typedef { import('micromark-util-types').Construct } Construct
 * @typedef { import('micromark-util-types').Tokenizer } Tokenizer
 * @typedef { import('micromark-util-types').State } State
 */

import { markdownLineEndingOrSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

/**
 * Add support for parsing tags in markdown.
 *
 * Function that can be called to get a syntax extension for micromark (passed
 * in `extensions`).
 *
 * @returns { Extension }
 *   Syntax extension for micromark (passed in `extensions`).
 */
export function tags() {

  return {
    text: {
      35: parse() // <#>
    }
  };
}

const tagType = 'tag';
const tagNameType = 'tagName';

/**
 * @returns { Construct }
 */
function parse() {
  const tagName = { tokenize: tokenizeName, partial: true };

  return { tokenize: tokenizeTag, concrete: true };

  /** @type { Tokenizer } */
  function tokenizeTag(effects, ok, nok) {
    return start;

    /** @type { State } */
    function start(code) {

      effects.enter(tagType);
      effects.consume(code);

      return effects.attempt(tagName, exit, nok);
    }

    /** @type { State } */
    function exit(code) {
      effects.exit(tagType);
      return ok(code);
    }
  }

  /** @type { Tokenizer } */
  function tokenizeName(effects, ok, nok) {

    return start;

    /** @type { State } */
    function start(code) {
      if (code === codes.eof || code === codes.comma || markdownLineEndingOrSpace(code)) {
        return nok(code);
      }

      effects.enter(tagNameType);
      return insideName(code);
    }

    function insideName(code) {
      if (code !== codes.eof && code !== codes.comma && !markdownLineEndingOrSpace(code)) {
        effects.consume(code);

        return insideName;
      }

      effects.exit(tagNameType);
      return ok(code);
    }
  }
}
