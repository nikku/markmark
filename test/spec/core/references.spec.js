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
const parseTree_EXTERNAL = require('./references.parseTree.EXTERNAL.json');
const parseTree_IMG = require('./references.parseTree.IMG.json');


describe('core/references', function() {

  let eventBus, references;

  beforeEach(function() {
    eventBus = new EventEmitter();
    references = new References(console, eventBus);
  });


  describe('update / removal', function() {

    describe('should update', function() {

      it('basic', function() {

        // when
        triggerIndexed({
          uri: 'file:///tmp/IDEAS.md',
          parseTree: parseTree_IDEAS
        });

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


      it('external links', function() {

        // when
        triggerIndexed({
          uri: 'file:///tmp/EXTERNAL.md',
          parseTree: parseTree_EXTERNAL
        });

        // then
        expectRefs(references.getAnchors(), [
          {
            uri: 'file:///tmp/EXTERNAL.md'
          }
        ]);

        expectRefs(references.getLinks(), [
          {
            uri: 'file:///tmp/EXTERNAL.md',
            targetUri: 'https://github.com/'
          }
        ]);

      });


      it('images', function() {

        // when
        triggerIndexed({
          uri: 'file:///tmp/IMG.md',
          parseTree: parseTree_IMG
        });

        // then
        expectRefs(references.getAnchors(), [
          {
            uri: 'file:///tmp/IMG.md'
          }
        ]);

        expectRefs(references.getLinks(), [
          {
            uri: 'file:///tmp/IMG.md',
            targetUri: 'file:///tmp/img.png'
          },
          {
            uri: 'file:///tmp/IMG.md',
            targetUri: 'file:///tmp/img.png'
          }
        ]);
      });

    });


    it('should remove', function() {

      // given
      const indexItem = triggerIndexed({
        uri: 'file:///tmp/IDEAS.md',
        parseTree: parseTree_IDEAS
      });

      // when
      eventBus.emit('indexer:removed', indexItem);

      // then
      expectRefs(references.getAnchors(), []);
      expectRefs(references.getLinks(), []);
    });

  });


  describe('querying', function() {

    beforeEach(function() {

      triggerIndexed({
        uri: 'file:///tmp/IDEAS.md',
        parseTree: parseTree_IDEAS
      });

      triggerIndexed({
        uri: 'file:///tmp/NOTES.md',
        parseTree: parseTree_NOTES
      });

      triggerIndexed({
        uri: 'file:///tmp/IMG.md',
        parseTree: parseTree_IMG
      });

      triggerIndexed({
        uri: 'file:///tmp/EXTERNAL.md',
        parseTree: parseTree_EXTERNAL
      });

    });


    describe('should find references', function() {

      it('to anchor', function() {

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


      it('to tag', function() {

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


      it('to document', function() {

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


      it('to image', function() {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/IMG.md',
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
            uri: 'file:///tmp/IMG.md',
            targetUri: 'file:///tmp/img.png'
          }, {
            uri: 'file:///tmp/IMG.md',
            targetUri: 'file:///tmp/img.png'
          }
        ]);
      });


      it('to external resource', function() {

        // when
        const refs = references.findReferences({
          uri: 'file:///tmp/EXTERNAL.md',
          position: {
            start: {
              line: 1,
              column: 8
            },
            end: {
              line: 1,
              column: 8
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/EXTERNAL.md',
            targetUri: 'https://github.com/'
          }
        ]);
      });


      it('of link', function() {

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


    describe('should find definition', function() {

      it('to document link', function() {

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


      it('to deep link', function() {

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


      it('to image', function() {

        // when
        const refs = references.findDefinitions({
          uri: 'file:///tmp/IMG.md',
          position: {
            start: {
              line: 1,
              column: 8
            },
            end: {
              line: 1,
              column: 8
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'file:///tmp/img.png'
          }
        ]);
      });


      it('to external URI', function() {

        // when
        const refs = references.findDefinitions({
          uri: 'file:///tmp/EXTERNAL.md',
          position: {
            start: {
              line: 1,
              column: 8
            },
            end: {
              line: 1,
              column: 8
            }
          }
        });

        // then
        expectRefs(refs, [
          {
            uri: 'https://github.com/'
          }
        ]);
      });
    });

  });


  function triggerIndexed(args) {
    const indexItem = createIndexItem(args);

    eventBus.emit('indexer:updated', indexItem);

    return indexItem;
  }

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
