import { VFile } from 'vfile';

import assert from 'node:assert';

/**
 * @typedef { import('./types.js').File } File
 * @typedef { import('./types.js').IndexItem } IndexItem
 * @typedef { import('./types.js').Position } Position
 * @typedef { import('./types.js').Point } Point
 * @typedef { import('./types.js').Node } Node
 * @typedef { import('./types.js').Parent } Parent
 */


/**
 * @param { { uri: string, localValue?: string } } item
 *
 * @return { IndexItem }
 */
export function createIndexItem(item) {

  const {
    uri,
    localValue,
    ...rest
  } = item;

  const file = createFile({
    path: new URL(uri),
    value: localValue
  });

  file.data.uri = uri;

  return {
    ...rest,
    uri,
    get value() {
      return this.localValue || /** @type {string|undefined} */ (this.file.value);
    },
    set value(value) {
      this.localValue = value;
    },
    file,
    localValue
  };

}


/**
 * @param { { path: URL, value: string | undefined } } props
 *
 * @return { File }
 */
export function createFile(props) {
  return /** @type File */ (new VFile(props));
}

/**
 * @param {Node} node
 *
 * @return { node is Parent }
 */
export function isParent(node) {
  return 'children' in node && node.children !== undefined;
}

/**
 * @template T extends undefined ? never : T
 *
 * @param {T|undefined} o
 *
 * @return {T}
 */
export function real(o) {
  assert(o !== undefined, 'expected to be defined');

  return /** @type {T} */ (o);
}


/**
 * @param { Position|Point|undefined } position
 * @param { Position|undefined } range
 *
 * @return { boolean }
 */
export function inRange(position, range) {

  if (position === undefined || range === undefined) {
    return false;
  }

  if (isDocumentRange(range)) {
    return true;
  }

  const start = 'start' in position ? position.start : position;
  const end = 'end' in position ? position.end : position;

  return (
    (
      range.start.line < start.line || (
        range.start.line === start.line &&
        range.start.column <= start.column
      )
    ) && (
      range.end.line > end.line || (
        range.end.line === end.line &&
        range.end.column >= end.column
      )
    )
  );
}

/**
 * @param { Position } position
 *
 * @return { boolean }
 */
export function isDocumentRange(position) {

  const start = position.start;
  const end = position.end;

  return [
    start.column,
    start.line,
    end.column,
    end.line
  ].every(n => n === 0);
}

/**
 * @return {Position}
 */
export function documentRange() {
  return {
    start: {
      line: 0,
      column: 0
    },
    end: {
      line: 0,
      column: 0
    }
  };
}
