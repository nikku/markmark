import remark from './markdown/remark.js';

/**
 * @typedef { import('mdast').Root } Root
 */

export default class Processor {

  constructor() {
    this._processor = remark();
  }

  async process(item) {
    const tree = await this._processor.parse(item.file);

    const transformedTree = /** @type Root */ (await this._processor.run(tree, item.file));

    item.parseTree = transformedTree;

    return item;
  }

}
