import Indexer from '../../../lib/core/indexer.js';
import Processor from '../../../lib/core/processor.js';
import Workqueue from '../../../lib/core/workqueue.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';
import { fileUri } from './helper.js';


describe('core/indexer', () => {

  let processor, indexer, workqueue, eventBus;

  beforeEach(() => {
    eventBus = new EventEmitter();
    workqueue = new Workqueue(eventBus);
    processor = new Processor(console);
    indexer = new Indexer(console, eventBus, processor, workqueue);
  });


  it('should index directory', async () => {

    // when
    await addFiles([
      'test/fixtures/notes/ideas/PUNCH_LINE.md',
      'test/fixtures/notes/ideas/nested/NESTED_IDEAS.md',
      'test/fixtures/notes/IDEAS.md',
      'test/fixtures/notes/NOTES.md'
    ]);

    // then
    const items = indexer.getItems();

    expect(items).to.have.length(4);

    for (const item of items) {
      expect(item.parseTree).to.exist;
      expect(item.parseTree.anchors).to.exist;
      expect(item.parseTree.links).to.exist;
      expect(item.parseTree.tags).to.exist;
    }
  });


  it('should emit <indexer.updated>', async () => {

    // when
    const items = [];

    eventBus.on('indexer:updated', (item) => {
      items.push(item);
    });

    await addFiles([
      'test/fixtures/notes/ideas/PUNCH_LINE.md',
      'test/fixtures/notes/ideas/nested/NESTED_IDEAS.md',
      'test/fixtures/notes/IDEAS.md',
      'test/fixtures/notes/NOTES.md'
    ]);

    // then
    expect(items).to.have.length(4);

    for (const item of items) {
      expect(item.parseTree).to.exist;
      expect(item.parseTree.anchors).to.exist;
      expect(item.parseTree.links).to.exist;
      expect(item.parseTree.tags).to.exist;
    }
  });


  it('should remove item', async () => {

    // given
    const removedItems = [];

    eventBus.on('indexer:removed', (item) => {
      removedItems.push(item);
    });

    await addFiles([
      'test/fixtures/notes/ideas/PUNCH_LINE.md',
      'test/fixtures/notes/ideas/nested/NESTED_IDEAS.md',
      'test/fixtures/notes/IDEAS.md',
      'test/fixtures/notes/NOTES.md'
    ]);

    // when
    const [ firstItem ] = indexer.getItems();

    // removing locally
    indexer.remove(firstItem.uri, true);

    // then
    expect(removedItems).to.be.empty;

    // actually removing
    indexer.remove(firstItem.uri);

    // then
    expect(removedItems).to.eql([ firstItem ]);
  });


  it('should eagerly fetch index item', async () => {

    // given
    // file-backed version added
    const uri = await addFile('test/fixtures/notes/IDEAS.md');

    // when
    const item = await indexer.get(uri);

    // then
    expect(item.parseTree).to.exist;
    expect(item.parseTree.anchors).to.have.length(3);
    expect(item.parseTree.links).to.have.length(2);
    expect(item.parseTree.tags).to.have.length(1);

    // but when
    // local override added
    indexer.fileOpen({
      uri,
      value: '# hello world!'
    });

    // when
    const openedItem = await indexer.get(uri);

    // then
    expect(openedItem.parseTree).to.exist;
    expect(openedItem.parseTree.anchors).to.have.length(2);
    expect(openedItem.parseTree.links).to.have.length(0);

    // but when
    // local override closed
    indexer.fileClosed(uri);

    // when
    const closedItem = await indexer.get(uri);

    // then
    expect(closedItem.parseTree).to.exist;
    expect(closedItem.parseTree.anchors).to.have.length(3);
    expect(closedItem.parseTree.links).to.have.length(2);
  });


  it('should handle non-existing file', async () => {

    // given
    // file-backed version added
    const uri = await addFile('test/fixtures/NON_EXISTING.md');

    // when
    const item = await indexer.get(uri);

    // then
    expect(item.parseTree).to.exist;
    expect(item.parseTree.anchors).to.have.length(1);
    expect(item.parseTree.links).to.have.length(0);
    expect(item.parseTree.tags).to.have.length(0);
  });


  function addFiles(paths) {

    for (const path of paths) {
      addFile(path);
    }

    eventBus.emit('watcher:ready');

    return on('indexer:ready');
  }

  function addFile(path) {
    const uri = fileUri(path);

    indexer.add(uri);

    return uri;
  }

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
