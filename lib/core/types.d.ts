import { VFile } from 'vfile';

import { Position, Point } from 'unist';
import { Node as UnistNode } from 'unist';

import { Root, Content, Heading, Definition } from 'mdast';

export type Node = (Content|Root) & UnistNode;

export type DocumentRange = {
  uri?: string,
  position: Position,
  value?: string
};

export type DocumentLocation = {
  uri: string,
  position: Point
};

export type File = VFile;

export type TaggedRoot = Root & {
  anchors: DocumentRange[],
  links: DocumentRange[],
  tags: DocumentRange[]
};

export type Positioned = {
  uri: string,
  position: Position
};

export type Completion = {
  label: string,
  replace: {
    position: Position,
    newText: string
  },
  detail?: string
};

export type LinterResult = {
  message: string,
  severity: 'warn' | 'error' | undefined,
  position: Position
};

export type LinterResults = {
  uri: string,
  results: LinterResult[]
};

export interface IndexItem extends Record<string, any> {
  uri: string,
  value?: string,
  version?: number,
  localValue?: string,
  file: File,
  parseTree?: Root
}

export {
  Root,
  Heading,
  Definition,
  Position,
  Point
};
