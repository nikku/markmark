import _remark from '../../../lib/core/markdown/remark.js';

import { toVFile } from 'to-vfile';

import { expect } from 'chai';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const parseTree_LINKS = require('./markdown.parseTree.LINKS.json');


const remark = _remark();


describe('core/markdown', () => {

  describe('should transform markdown', () => {

    it('basic', async () => {

      // given
      const markdown = `
  # Ideas

  #foo

  [](./NOTES.md)
  [[PUNCH_LINE]]

  ## Connect This and That

  To get super powers.


  [](./NOTES.md#deeplink)

  [local link](#ideas)

  ![img](./image.png)
  [image link](./img.svg)

  [external-uri](https://foobar.com)
  `;

      const file = toVFile({ value: markdown });

      // when
      const tree = remark.parse(file);

      const transformedTree = await remark.run(tree, file);

      // then
      expect(transformedTree.links).to.have.length(6);
      expect(transformedTree.anchors).to.have.length(3);
      expect(transformedTree.tags).to.have.length(1);
    });


    it('external links', async () => {

      // given
      const markdown = `
  [external-uri](https://foobar.com)
  `;

      const file = toVFile({ value: markdown });

      // when
      const tree = remark.parse(file);

      const transformedTree = await remark.run(tree, file);

      // then
      expect(transformedTree.links).to.have.length(1);
      expect(transformedTree.anchors).to.have.length(1);
      expect(transformedTree.tags).to.have.length(0);
    });


    it('image links', async () => {

      // given
      const markdown = `
  ![img](./image.png)
  [image link](./img.svg)
  `;

      const file = toVFile({ value: markdown });

      // when
      const tree = remark.parse(file);

      const transformedTree = await remark.run(tree, file);

      // then
      expect(transformedTree.links).to.have.length(2);
      expect(transformedTree.anchors).to.have.length(1);
      expect(transformedTree.tags).to.have.length(0);
    });

  });


  it('should recognize tags', async () => {

    // given
    const markdown = `
# heading

#some-tag, #other_tag
#tag no-tag
[](./rel#link)
![](./rel.png#image)
`;

    const file = toVFile({ value: markdown });

    // when
    const tree = remark.parse(file);

    // then
    expect(tree).to.eql(parseTree_LINKS);
  });

});
