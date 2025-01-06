import remark from './markdown/remark.js';

/**
 * @typedef { import('./types.js').Root } Root
 * @typedef { import('./types.js').TaggedRoot } TaggedRoot
 *
 * @typedef { import('./types.js').IndexItem } IndexItem
 */

export default class Processor {

  /**
   * @param { import('./logger.js').default } logger
   */
  constructor(logger) {
    this._processor = remark();
    this._logger = logger;
  }

  /**
   * @param {IndexItem} item
   *
   * @return { Promise<TaggedRoot> }
   */
  async process(item) {

    const tree = await this._processor.parse({
      ...item.file,
      value: item.value
    });

    return this._processor.run(tree, item.file);
  }

}
