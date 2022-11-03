# markmark

[![CI](https://github.com/nikku/markmark/actions/workflows/CI.yml/badge.svg)](https://github.com/nikku/markmark/actions/workflows/CI.yml)

Language tooling for [Markdown](https://en.wikipedia.org/wiki/Markdown) files. Use standalone or plug-in as a [language server](https://microsoft.github.io/language-server-protocol/) into your favorite IDE.


## What is this

Language tooling and code intelligence for markdown files:

* [x] Go to definition
* [x] Find references
* [x] Complete links and tags

Exposed as a library, but also as a [language server](https://microsoft.github.io/language-server-protocol/).


## Installation

```sh
npm install -g markmark
```


## Use

Start the language server (depends on the LSP integration of your editor):

```
markmark-lsp --stdio
```


## License

MIT
