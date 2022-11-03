import Watcher from '../../../lib/core/watcher.js';
import Indexer from '../../../lib/core/indexer.js';
import Processor from '../../../lib/core/processor.js';
import Workqueue from '../../../lib/core/workqueue.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';
import { pathToFileURL } from 'node:url';


describe('core/indexer', () => {

  let watcher, processor, indexer, workqueue, eventBus;

  beforeEach(() => {
    eventBus = new EventEmitter();
    workqueue = new Workqueue(eventBus);
    processor = new Processor(console);
    watcher = new Watcher(console, eventBus);
    indexer = new Indexer(console, eventBus, processor, workqueue);
  });

  afterEach(() => {
    return watcher.close();
  });


  it('should index directory', async () => {

    // when
    watcher.addFolder(pathToFileURL('test/fixtures/notes').toString());

    await on('indexer:ready', eventBus);

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

    watcher.addFolder(pathToFileURL('test/fixtures/notes').toString());

    await on('indexer:ready', eventBus);

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

    watcher.addFolder(pathToFileURL('test/fixtures/notes').toString());

    await on('indexer:ready', eventBus);

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
    const uri = pathToFileURL('test/fixtures/notes/IDEAS.md').toString();

    // file-backed version added
    indexer.add(uri);

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

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
