import Markmark from '../../../lib/core/markmark.js';

import { pathToFileURL } from 'node:url';


describe('core/markmark', () => {

  let markmark;

  beforeEach(() => {
    markmark = new Markmark(console);
  });

  afterEach(() => {
    return markmark.close();
  });


  it('should index directory', async () => {

    // when
    markmark.addRoot(pathToFileURL('test/fixtures/notes').toString());

    await on('ready', markmark);
    await on('references:changed', markmark);
  });

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
