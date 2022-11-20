/**
 * @typedef { import('./types').LinterResult } LinterResult
 * @typedef { import('./types').LinterResults } LinterResults
 */

export default class Linter {

  /**
   * @param { import('./logger').default } logger
   * @param { import('node:events').EventEmitter } eventBus
   * @param { import('./references').default } references
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
   * @param { Array<import('./references').Link> } links
   *
   * @return { Array<LinterResult> }
   */
  check(links) {
    const externalPattern = /^https?:\/\//i;
    const mdPattern = /\.md(#.*)?$/i;

    /**
     * @type { Map<string, LinterResult[]> }
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
