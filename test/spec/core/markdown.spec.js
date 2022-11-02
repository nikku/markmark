import _remark from '../../../lib/core/markdown/remark.js';

import { toVFile } from 'to-vfile';

import { expect } from 'chai';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const parseTree_LINKS = require('./markdown.parseTree.LINKS.json');


const remark = _remark();

describe('core/markdown', () => {

  it('should transform markdown', async () => {

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
`;

    const file = toVFile({ value: markdown });

    // when
    const tree = remark.parse(file);

    const transformedTree = await remark.run(tree, file);

    // then
    expect(transformedTree.links).to.have.length(3);
    expect(transformedTree.anchors).to.have.length(3);
    expect(transformedTree.tags).to.have.length(1);
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
