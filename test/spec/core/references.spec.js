import { EventEmitter } from 'node:events';

import {
  createIndexItem
} from '../../../lib/core/util.js';

import References from '../../../lib/core/references.js';

import { expect } from 'chai';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const parseTree_IDEAS = require('./references.parseTree.IDEAS.json');
const parseTree_NOTES = require('./references.parseTree.NOTES.json');


describe('core/references', () => {

  let eventBus, references;

  beforeEach(() => {
    eventBus = new EventEmitter();
    references = new References(console, eventBus);
  });


  describe('update / removal', () => {

    it('should update', () => {

      const uri = 'file:///tmp/IDEAS.md';

      // given
      const indexItem = createIndexItem({
        uri,
        parseTree: parseTree_IDEAS
      });

      // when
      eventBus.emit('indexer:updated', indexItem);

      // then
      expectRefs(references.getAnchors(), [
        {
          uri: 'file:///tmp/IDEAS.md#ideas'
        },
        {
          uri: 'file:///tmp/IDEAS.md#connect-this-and-that'
        },
        {
          uri: 'file:///tmp/IDEAS.md',
          position: {
            start: {
              line: 0,
              column: 0
            },
            end: {
              line: 0,
              column: 0
            }
          }
        }
      ]);

      expectRefs(references.getLinks(), [
        {
          uri: 'file:///tmp/IDEAS.md',
          targetUri: 'file:///tmp/NOTES.md'
        },
        {
          uri: 'file:///tmp/IDEAS.md',
          targetUri: 'file:///tmp/NOTES.md#deeplink'
        },
        {
          uri: 'file:///tmp/IDEAS.md',
          targetUri: 'file:///tmp/IDEAS.md#ideas'
        }
      ]);
    });


    it('should remove', () => {

      const uri = 'file:///tmp/IDEAS.md';

      // given
      const indexItem = createIndexItem({
        uri,
        parseTree: parseTree_IDEAS
      });

      eventBus.emit('indexer:updated', indexItem);

      // when
      eventBus.emit('indexer:removed', indexItem);

      // then
      expectRefs(references.getAnchors(), []);
      expectRefs(references.getLinks(), []);
    });

  });


  describe('querying', () => {

    beforeEach(() => {
      eventBus.emit('indexer:updated', createIndexItem({
        uri: 'file:///tmp/IDEAS.md',
        parseTree: parseTree_IDEAS
      }));

      eventBus.emit('indexer:updated', createIndexItem({
        uri: 'file:///tmp/NOTES.md',
        parseTree: parseTree_NOTES
      }));
    });


    describe('should find references', () => {

      it('to anchor', () => {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/NOTES.md',
          position: {
            start: {
              line: 3,
              column: 1
            },
            end: {
              line: 3,
              column: 12
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/IDEAS.md',
            targetUri: 'file:///tmp/NOTES.md#deeplink'
          }
        ]);
      });


      it('to tag', () => {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/IDEAS.md',
          position: {
            start: {
              line: 4,
              column: 6
            },
            end: {
              line: 4,
              column: 6
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/IDEAS.md'
          }
        ]);
      });


      it('to document', () => {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/NOTES.md',
          position: {
            start: {
              line: 2,
              column: 1
            },
            end: {
              line: 2,
              column: 1
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/IDEAS.md',
            targetUri: 'file:///tmp/NOTES.md'
          }
        ]);
      });


      it('of link', () => {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/IDEAS.md',
          position: {
            start: {
              line: 3,
              column: 5
            },
            end: {
              line: 3,
              column: 5
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/IDEAS.md',
            targetUri: 'file:///tmp/NOTES.md'
          }
        ]);
      });

    });


    describe('should find definition', () => {

      it('to document link', () => {

        // when
        const refs = references.findDefinitions({
          uri: 'file:///tmp/IDEAS.md',
          position: {
            start: {
              line: 3,
              column: 5
            },
            end: {
              line: 3,
              column: 5
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/NOTES.md'
          }
        ]);
      });


      it('to deep link', () => {

        // when
        const refs = references.findDefinitions({
          uri: 'file:///tmp/IDEAS.md',
          position: {
            start: {
              line: 11,
              column: 1
            },
            end: {
              line: 11,
              column: 24
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/NOTES.md#deeplink'
          }
        ]);
      });

    });

  });

});


// helpers /////////////////

function expectRefs(refs, expectedRefs) {

  expect(refs).to.have.length(expectedRefs.length);

  const actualRefs = expectedRefs.map((ref, idx) => {

    const actualRef = refs[idx];

    if (!actualRef) {
      return null;
    }

    return Object.keys(ref).reduce((obj, key) => {
      obj[key] = actualRef[key];

      return obj;
    }, {});
  });

  expect(actualRefs).to.eql(expectedRefs);
}
