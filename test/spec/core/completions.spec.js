import Indexer from '../../../lib/core/indexer.js';
import Processor from '../../../lib/core/processor.js';
import Workqueue from '../../../lib/core/workqueue.js';
import Completions from '../../../lib/core/completions.js';
import References from '../../../lib/core/references.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';

import { fileUri } from './helper.js';

const NOTES_ROOT_URI = fileUri('test/fixtures/notes');
const IDEAS_URI = fileUri('test/fixtures/notes/IDEAS.md');

const COMPLETIONS_ROOT_URI = fileUri('test/fixtures/completions');
const BASE_URI = fileUri('test/fixtures/completions/BASE.md');
const HEADING_URI = fileUri('test/fixtures/completions/HEADING.md');
const ANCHOR_URI = fileUri('test/fixtures/completions/ANCHOR.md');
const TAGGED_URI = fileUri('test/fixtures/completions/TAGGED.md');


describe('core/completions', function() {

  /**
   * @type { Processor }
   */
  let processor;

  /**
   * @type { Indexer }
   */
  let indexer;

  /**
   * @type { Workqueue }
   */
  let workqueue;

  /**
   * @type { EventEmitter }
   */
  let eventBus;

  /**
   * @type { Completions }
   */
  let completions;

  /**
   * @type { References }
   */
  let references;


  beforeEach(function() {
    eventBus = new EventEmitter();
    workqueue = new Workqueue(eventBus);
    processor = new Processor(console);
    indexer = new Indexer(console, eventBus, processor, workqueue);
    references = new References(console, eventBus);
    completions = new Completions(console, indexer, references);
  });


  beforeEach(async function() {
    indexer.addRoot(COMPLETIONS_ROOT_URI);
    await indexer.add(ANCHOR_URI);
    await indexer.add(BASE_URI);
    await indexer.add(TAGGED_URI);
    await indexer.add(HEADING_URI);

    indexer.addRoot(NOTES_ROOT_URI);
    await indexer.add(IDEAS_URI);
  });


  it('should complete tag', async function() {

    // when
    const items = await completions.get({
      uri: BASE_URI,
      position: {
        line: 1,
        column: 3
      }
    });

    // then
    expect(items).to.eql([
      {
        label: '#fo',
        replace: {
          position: {
            start: {
              line: 1,
              column: 1,
              offset: 0
            },
            end: {
              line: 1,
              column: 4,
              offset: 3
            }
          },
          newText: '#fo'
        }
      },
      {
        label: '#fooop',
        replace: {
          position: {
            start: {
              line: 1,
              column: 1,
              offset: 0
            },
            end: {
              line: 1,
              column: 4,
              offset: 3
            }
          },
          newText: '#fooop'
        }
      }
    ]);
  });


  it('should complete text <#>', async function() {

    // #fo #| #fooop

    // when
    const items = await completions.get({
      uri: BASE_URI,
      position: {
        line: 1,
        column: 6
      }
    });

    const expectedCompletions = [
      'fo',
      'fooop',
      'other',
      'bar'
    ].map(tag => ({
      label: '#' + tag,
      replace: {
        position: {
          start: {
            line: 1,
            column: 5,
            offset: 4
          },
          end: {
            line: 1,
            column: 6,
            offset: 5
          }
        },
        newText: '#' + tag
      }
    }));

    // then
    expect(items).to.eql(expectedCompletions);
  });


  it('should complete heading <#>', async function() {

    // #|

    // when
    const items = await completions.get({
      uri: HEADING_URI,
      position: {
        line: 1,
        column: 2
      }
    });

    const expectedCompletions = [
      'fo',
      'fooop',
      'other',
      'bar'
    ].map(tag => ({
      label: '#' + tag,
      replace: {
        position: {
          start: {
            line: 1,
            column: 1,
            offset: 0
          },
          end: {
            line: 1,
            column: 2,
            offset: 1
          }
        },
        newText: '#' + tag
      }
    }));

    // then
    expect(items).to.eql(expectedCompletions);
  });


  it('should NOT complete link name', async function() {

    // [|]()

    // when
    const nameCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 3,
        column: 2
      }
    });

    // then
    expect(nameCompletions).to.eql([]);
  });


  it('should NOT complete text within root', async function() {

    // asdf yes| no

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 12,
        column: 10
      }
    });

    // then
    expect(refCompletions).to.eql([]);
  });


  it('should complete link ref', async function() {

    // [](|)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 3,
        column: 4
      }
    });

    // then
    expect(refCompletions).to.eql([
      {
        'label': './ANCHOR.md#anchor',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md#anchor'
        }
      },
      {
        'label': './ANCHOR.md#deeplink',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md#deeplink'
        }
      },
      {
        'label': './ANCHOR.md',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md'
        }
      },
      {
        'label': '#local',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': '#local'
        }
      },
      {
        'label': './TAGGED.md#tagged',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './TAGGED.md#tagged'
        }
      },
      {
        'label': './TAGGED.md',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './TAGGED.md'
        }
      },
      {
        'label': './HEADING.md',
        'replace': {
          'newText': './HEADING.md',
          'position': {
            'end': {
              'column': 4,
              'line': 3,
              'offset': 17
            },
            'start': {
              'column': 4,
              'line': 3,
              'offset': 17
            }
          }
        }
      }
    ]);
  });


  it('should complete link ref with # prefix', async function() {

    // [](|)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 5,
        column: 5
      }
    });

    const expectedCompletions = [
      './ANCHOR.md#anchor',
      './ANCHOR.md#deeplink',
      '#local',
      './TAGGED.md#tagged'
    ].map(ref => ({
      'label': ref,
      'replace': {
        'position': {
          'start': {
            'line': 5,
            'column': 4,
            'offset': 30
          },
          'end': {
            'line': 5,
            'column': 5,
            'offset': 31
          }
        },
        'newText': ref
      }
    }));

    // then
    expect(refCompletions).to.eql(expectedCompletions);
  });


  it('should complete link with name ref', async function() {

    // [foo](|)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 4,
        column: 7
      }
    });

    const expectedCompletions = [
      './ANCHOR.md#anchor',
      './ANCHOR.md#deeplink',
      './ANCHOR.md',
      '#local',
      './TAGGED.md#tagged',
      './TAGGED.md',
      './HEADING.md'
    ].map(ref => ({
      'label': ref,
      'replace': {
        'position': {
          'start': {
            'line': 4,
            'column': 7,
            'offset': 25
          },
          'end': {
            'line': 4,
            'column': 7,
            'offset': 25
          }
        },
        'newText': ref
      }
    }));

    // then
    expect(refCompletions).to.eql(expectedCompletions);
  });


  it('should complete link ref with prefix', async function() {

    // [](./A|N)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 7,
        column: 7
      }
    });

    // then
    expect(refCompletions).to.eql([
      {
        'label': './ANCHOR.md#anchor',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
            }
          },
          'newText': './ANCHOR.md#anchor'
        }
      },
      {
        'label': './ANCHOR.md#deeplink',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
            }
          },
          'newText': './ANCHOR.md#deeplink'
        }
      },
      {
        'label': './ANCHOR.md',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
            }
          },
          'newText': './ANCHOR.md'
        }
      }
    ]);
  });


  it('should complete link (with image) ref', async function() {

    // [![asd](./asd.png)](./A|N)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 8,
        column: 24
      }
    });

    const expectedCompletions = [
      './ANCHOR.md#anchor',
      './ANCHOR.md#deeplink',
      './ANCHOR.md'
    ].map(ref => ({
      'label': ref,
      'replace': {
        'position': {
          'start': {
            'line': 8,
            'column': 21,
            'offset': 70
          },
          'end': {
            'line': 8,
            'column': 25,
            'offset': 74
          }
        },
        'newText': ref
      }
    }));

    // then
    expect(refCompletions).to.eql(expectedCompletions);
  });

});


// eslint-disable-next-line
function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
