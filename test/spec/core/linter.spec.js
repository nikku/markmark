import Indexer from '../../../lib/core/indexer.js';
import Processor from '../../../lib/core/processor.js';
import Workqueue from '../../../lib/core/workqueue.js';
import References from '../../../lib/core/references.js';
import Linter from '../../../lib/core/linter.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';
import { fileUri } from './helper.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const results_README = require('./linter.results.README.json');


describe('core/linter', () => {

  let processor, indexer,
      workqueue, eventBus, references;

  beforeEach(() => {
    eventBus = new EventEmitter();
    workqueue = new Workqueue(eventBus);
    processor = new Processor(console);
    indexer = new Indexer(console, eventBus, processor, workqueue);
    references = new References(console, eventBus);

    new Linter(console, eventBus, references);
  });


  it('should lint directory', async () => {

    // given
    const uris = await addFiles([
      'test/fixtures/linter/README.md',
      'test/fixtures/linter/EXTERNAL.md',
      'test/fixtures/linter/IMG.md',
      'test/fixtures/linter/nested/README.md'
    ]);

    // when
    const reports = await on('linter:lint', eventBus);

    // then
    expect(reports).to.exist;

    // only README is invalid
    expect(reports).to.have.length(1);

    const [ firstReport ] = reports;

    expect(firstReport).to.eql({
      uri: uris[0],
      results: results_README
    });
  });


  async function addFiles(paths) {

    const uris = paths.map(addFile);

    await on('workqueue:empty', eventBus);

    return uris;
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
