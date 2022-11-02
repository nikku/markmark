import { VFile } from 'vfile';

/**
 * @typedef { import('./types').File } File
 * @typedef { import('./types').IndexItem } IndexItem
 */

/**
 * @param { { uri: string, version?: string, localValue?: string } } item
 *
 * @return {IndexItem}
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
 * @param { Position } position
 * @param { Position } range
 *
 * @return { boolean }
 */
export function inRange(position, range) {

  if (isDocumentRange(range)) {
    return true;
  }

  return (
    (
      range.start.line < position.start.line || (
        range.start.line === position.start.line &&
        range.start.column <= position.start.column
      )
    ) && (
      range.end.line > position.end.line || (
        range.end.line === position.end.line &&
        range.end.column >= position.end.column
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
  return [
    position.start.column,
    position.start.line,
    position.end.column,
    position.end.line
  ].every(n => n === 0);
}
