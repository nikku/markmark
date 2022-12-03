import Markmark from '../../../lib/core/markmark.js';

import { fileUri } from './helper.js';


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
    markmark.addRoot(fileUri('test/fixtures/notes'));

    await on('ready', markmark);
    await on('references:changed', markmark);
  });

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
