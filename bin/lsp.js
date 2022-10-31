#!/usr/bin/env node

import process from 'node:process';

import { createLanguageServer } from '../lib/index.js';

process.title = 'markmark-language-server';

createLanguageServer();
