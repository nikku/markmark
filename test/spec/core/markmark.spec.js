import Markmark from '../../../lib/core/markmark.js';

import { fileUri } from './helper.js';


describe('core/markmark', function() {

  let markmark;

  beforeEach(function() {
    markmark = new Markmark(console);
  });

  afterEach(function() {
    return markmark.close();
  });


  describe('should index', function() {

    it('internal watcher', async function() {

      // given
      markmark.init({ watch: true });

      // when
      markmark.addRoot(fileUri('test/fixtures/notes'));

      // then
      await on('ready', markmark);
      await on('references:changed', markmark);
    });


    it('external file change handler', async function() {

      // given
      markmark.init({ watch: false });

      // when
      markmark.addRoot(fileUri('test/fixtures/notes'));
      markmark.addFile(fileUri('test/fixtures/notes/IDEAS.md'));
      markmark.addFile(fileUri('test/fixtures/notes/NOTES.md'));
      markmark.updateFile(fileUri('test/fixtures/notes/IDEAS.md'));
      markmark.removeFile(fileUri('test/fixtures/notes/NON_EXISTING.md'));
      markmark.removeFile(fileUri('test/fixtures/notes/NOTES.md'));

      // then
      await on('ready', markmark);
      await on('references:changed', markmark);
    });

  });

});


function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
