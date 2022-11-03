import { VFile } from 'vfile';

/**
 * @typedef { import('./types').File } File
 * @typedef { import('./types').IndexItem } IndexItem
 * @typedef { import('./types').Position } Position
 * @typedef { import('./types').Point } Point
 */

/**
 * @param { { uri: string, version?: string, localValue?: string } } item
 *
 * @return { IndexItem }
 */
export function createIndexItem(item) {

  const {
    uri,
    localValue,
    version,
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
    version,
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
 * @param { { path: string, value: string } } props
 *
 * @return { File }
 */
export function createFile(props) {
  return /** @type File */ (new VFile(props));
}


/**
 * @param { Position|Point } position
 * @param { Position } range
 *
 * @return { boolean }
 */
export function inRange(position, range) {

  if (isDocumentRange(range)) {
    return true;
  }

  const start = position.start || position;
  const end = position.end || position;

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
 * @param { Position|Point } position
 *
 * @return { boolean }
 */
export function isDocumentRange(position) {

  const start = position.start || position;
  const end = position.end || position;

  return [
    start.column,
    start.line,
    end.column,
    end.line
  ].every(n => n === 0);
}
