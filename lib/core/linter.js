/**
 * @typedef { import('./types.js').LinterResult } LinterResult
 * @typedef { import('./types.js').LinterResults } LinterResults
 *
 * @typedef { import('./references.js').Link } Link
 */

export default class Linter {

  /**
   * @param { import('./logger.js').default } logger
   * @param { import('node:events').EventEmitter } eventBus
   * @param { import('./references.js').default } references
   */
  constructor(logger, eventBus, references) {

    this._logger = logger;
    this._eventBus = eventBus;
    this._references = references;

    eventBus.on('references:changed', () => {
      this.lint();
    });
  }

  /**
   * @param { Link[] } links
   *
   * @return { LinterResults[] }
   */
  check(links) {
    const externalPattern = /^https?:\/\//i;
    const mdPattern = /\.md(#.*)?$/i;

    /**
     * @type { Map<string, Link[]> }
     */
    const resultsMap = new Map();

    for (const link of links) {

      const {
        uri,
        targetUri,
        anchor
      } = link;

      if (!mdPattern.test(targetUri) || externalPattern.test(targetUri) || anchor) {
        continue;
      }

      /**
       * @type { Link[] | undefined }
       */
      let results = resultsMap.get(uri);

      if (!results) {
        results = [];
        resultsMap.set(uri, results);
      }

      results.push(link);
    }

    /**
     * @type { LinterResults[] }
     */
    const results = [];

    for (const [ uri, brokenLinks ] of resultsMap.entries()) {

      results.push({
        uri,
        results: brokenLinks.map(link => ({
          position: link.position,
          message: 'Target is unresolved',
          severity: 'warn'
        }))
      });

    }

    return results;
  }

  lint() {
    const links = this._references.getLinks();

    const results = this.check(links);

    this._logger.log('linter :: lint complete', results);

    this._eventBus.emit('linter:lint', results);
  }
}
