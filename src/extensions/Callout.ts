import { mergeAttributes, Node } from '@tiptap/core';

export type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      setCalloutType: (type: CalloutType) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

const normalizeType = (value: unknown): CalloutType => {
  if (
    value === 'tip' ||
    value === 'warning' ||
    value === 'danger' ||
    value === 'info'
  ) {
    return value;
  }

  return 'info';
};

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) =>
          normalizeType(element.getAttribute('data-callout-type')),
        renderHTML: (attributes) => ({
          'data-callout-type': normalizeType(attributes.type),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes({ 'data-callout': 'true' }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        (attributes = {}) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, {
            type: normalizeType(attributes.type),
          }),
      setCalloutType:
        (type) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            type: normalizeType(type),
          }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default Callout;
