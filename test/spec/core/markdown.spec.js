import _remark from '../../../lib/core/markdown/remark.js';

import { toVFile } from 'to-vfile';

import { expect } from 'chai';

const remark = _remark();

const markdown = `
# Ideas

[](./NOTES.md)
[[PUNCH_LINE]]

## Connect This and That

To get super powers.


[](./NOTES.md#deeplink)

[local link](#ideas)
`;


describe('core/markdown', () => {

  it('should transform markdown', async () => {

    // given
    const file = toVFile(markdown);

    // when
    const tree = remark.parse(file);

    const transformedTree = await remark.run(tree, file);

    // then
    expect(transformedTree.links).to.exist;
    expect(transformedTree.anchors).to.exist;
  });

});
