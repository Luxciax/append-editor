import { mergeAttributes, Node } from '@tiptap/core';

export type MediaKind = 'audio' | 'video';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbed: {
      setMediaEmbed: (options: {
        kind: MediaKind;
        src: string;
        title?: string;
      }) => ReturnType;
    };
  }
}

const isSafeMediaUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const MediaEmbed = Node.create({
  name: 'mediaEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: 'audio',
        parseHTML: (element) =>
          element.tagName.toLowerCase() === 'video' ? 'video' : 'audio',
      },
      src: {
        default: null,
      },
      title: {
        default: 'Media',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'audio[data-rich-media]' }, { tag: 'video[data-rich-media]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind: MediaKind =
      HTMLAttributes.kind === 'video' ? 'video' : 'audio';
    const src = String(HTMLAttributes.src || '');
    const title = String(HTMLAttributes.title || 'Media');

    if (!isSafeMediaUrl(src)) {
      return [
        'a',
        {
          href: src || '#',
          rel: 'noopener noreferrer',
          'data-invalid-media': 'true',
        },
        title,
      ];
    }

    return [
      kind,
      mergeAttributes(
        {
          src,
          title,
          controls: 'true',
          preload: 'metadata',
          'data-rich-media': 'true',
        },
        HTMLAttributes
      ),
    ];
  },

  addCommands() {
    return {
      setMediaEmbed:
        (options) =>
        ({ commands }) => {
          if (!isSafeMediaUrl(options.src)) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              kind: options.kind,
              src: options.src,
              title: options.title || (options.kind === 'video' ? 'Video' : 'Audio'),
            },
          });
        },
    };
  },
});

export default MediaEmbed;
