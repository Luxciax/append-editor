import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    webEmbed: {
      setWebEmbed: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

const isSafeEmbedUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const WebEmbed = Node.create({
  name: 'webEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: 'Embedded content',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-web-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || '');
    const title = String(HTMLAttributes.title || 'Embedded content');

    if (!isSafeEmbedUrl(src)) {
      return [
        'div',
        mergeAttributes(
          {
            'data-web-embed': 'true',
            'data-invalid-embed': 'true',
          },
          HTMLAttributes
        ),
        ['a', { href: src || '#', rel: 'noopener noreferrer' }, title],
      ];
    }

    return [
      'div',
      mergeAttributes(
        {
          'data-web-embed': 'true',
          class: 'web-embed',
        },
        HTMLAttributes
      ),
      [
        'iframe',
        {
          src,
          title,
          loading: 'lazy',
          referrerpolicy: 'no-referrer',
          sandbox:
            'allow-scripts allow-forms allow-popups allow-presentation allow-downloads',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setWebEmbed:
        (options) =>
        ({ commands }) => {
          if (!isSafeEmbedUrl(options.src)) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              title: options.title || 'Embedded content',
            },
          });
        },
    };
  },
});

export default WebEmbed;
