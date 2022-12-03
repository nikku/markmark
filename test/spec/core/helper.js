import { pathToFileURL } from 'node:url';

/**
 * @param  { string } path
 * @return { string } uri
 */
export function fileUri(path) {
  return pathToFileURL(path).toString();
}
