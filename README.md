# markmark

[![CI](https://github.com/nikku/markmark/actions/workflows/CI.yml/badge.svg)](https://github.com/nikku/markmark/actions/workflows/CI.yml)

[Markdown](https://en.wikipedia.org/wiki/Markdown) language tooling. Use standalone or plug-in as a [language server](https://microsoft.github.io/language-server-protocol/) into your favorite IDE.


## What is this

Language tooling and code intelligence for [Markdown](https://en.wikipedia.org/wiki/Markdown) files:

* [x] Go to definition
* [x] Find references
* [x] Complete links and tags
* [X] Validate links

Scalable across many Markdown files:

* [x] Project awareness
* [x] Built in or external file watching support

Exposed as a library, but also as a [language server](https://microsoft.github.io/language-server-protocol/).


## Installation

```sh
npm install -g markmark
```


## Usage

### Run as [Language Server](https://microsoft.github.io/language-server-protocol/)

Start using `markmark-lsp` binary (depends on the LSP integration of your editor):

```
markmark-lsp --stdio
```


### Use as a Library

```javascript
import { Markmark } from 'markmark';

const markmark = new Markmark(console);

// intialize
markmark.init({ watch: true });

// add a search root
markmark.addRoot('file:///some-folder');

// listen on <ready>
markmark.on('ready', () => {
  console.log('Markmark is ready!');
});

// find references at position
const refs = markmark.findReferences({
  uri: 'file:///some-folder/foo.md',
  position: {
    start: { line: 1, column: 5 },
    end: { line: 1, column: 5 }
  }
});

// find definitions at document position
const defs = markmark.findDefinitions({
  uri: 'file:///some-folder/foo.md',
  position: {
    start: { line: 1, column: 5 },
    end: { line: 1, column: 5 }
  }
});
```


## License

MIT
