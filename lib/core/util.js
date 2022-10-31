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
