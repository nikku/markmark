import Watcher from '../../../lib/core/watcher.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';
import { fileUri } from './helper.js';


describe('core/watcher', function() {

  let watcher, eventBus;

  beforeEach(function() {
    eventBus = new EventEmitter();

    watcher = new Watcher(console, eventBus);
  });

  afterEach(function() {
    return watcher.close();
  });


  it('should watch directory', async function() {

    // when
    watcher.addFolder(fileUri('test/fixtures/notes'));
    watcher.addFolder(fileUri('test/fixtures/notes'));

    await on('watcher:ready', eventBus);

    // then
    expect(watcher.getFiles()).to.have.length(4);
  });


  it('should unwatch directory', async function() {

    // given
    watcher.addFolder(fileUri('test/fixtures/notes'));

    await on('watcher:ready', eventBus);

    // when
    watcher.removeFolder(fileUri('test/fixtures/notes'));

    await on('watcher:changed', eventBus);

    // then
    expect(watcher.getFiles()).to.be.empty;
  });

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
