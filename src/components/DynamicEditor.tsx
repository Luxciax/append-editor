import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import debounce from 'lodash/debounce';
import { EditorContent, useEditor } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { FindAndReplace } from '@tiptap/extension-find-and-replace';
import Mathematics from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Youtube from '@tiptap/extension-youtube';
import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import DOMPurify from 'dompurify';
import Callout, { CalloutType } from '../extensions/Callout';
import OutlineList from '../extensions/OutlineList';
import BlockMetadata, { createBlockId } from '../extensions/BlockMetadata';
import WebEmbed from '../extensions/WebEmbed';
import MediaEmbed, { MediaKind } from '../extensions/MediaEmbed';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight();
lowlight.register({
  bash,
  css,
  html: xml,
  java,
  javascript,
  json,
  python,
  sql,
  typescript,
  xml,
});

interface DynamicProps {
  debugMode: boolean;
  onChange: (text: string) => void;
  readOnly: boolean;
  text: string;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  onClick: () => void;
}

interface SlashMenuState {
  open: boolean;
  query: string;
  from: number;
  to: number;
  x: number;
  y: number;
  selected: number;
}

interface SlashCommandDefinition {
  id: string;
  label: string;
  description: string;
  keywords: string;
}

const CLOSED_SLASH_MENU: SlashMenuState = {
  open: false,
  query: '',
  from: 0,
  to: 0,
  x: 0,
  y: 0,
  selected: 0,
};

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: 'paragraph',
    label: 'Paragraph',
    description: 'Plain text paragraph',
    keywords: 'text normal paragraph',
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading',
    keywords: 'h1 title heading',
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    keywords: 'h2 subtitle heading',
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    keywords: 'h3 heading',
  },
  {
    id: 'bullet-list',
    label: 'Bullet list',
    description: 'Unordered list',
    keywords: 'bullet list unordered',
  },
  {
    id: 'ordered-list',
    label: 'Numbered list',
    description: 'Ordered list',
    keywords: 'ordered numbered list',
  },
  {
    id: 'outline-list',
    label: 'Outline list',
    description: 'Hierarchical outline numbering',
    keywords: 'outline nested hierarchy numbered list',
  },
  {
    id: 'task-list',
    label: 'Task list',
    description: 'Interactive checklist',
    keywords: 'task todo checkbox checklist',
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Highlighted note block',
    keywords: 'callout note info tip warning',
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Block quote',
    keywords: 'blockquote quote',
  },
  {
    id: 'code-block',
    label: 'Code block',
    description: 'Preformatted code',
    keywords: 'code preformatted',
  },
  {
    id: 'inline-math',
    label: 'Inline formula',
    description: 'KaTeX formula inside text',
    keywords: 'math latex katex equation inline',
  },
  {
    id: 'block-math',
    label: 'Formula block',
    description: 'Centered KaTeX formula block',
    keywords: 'math latex katex equation block',
  },
  {
    id: 'table',
    label: 'Table',
    description: '3 x 3 table',
    keywords: 'table grid',
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Insert image from URL',
    keywords: 'image picture photo url',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Embed a YouTube video',
    keywords: 'youtube video embed media',
  },
  {
    id: 'web-embed',
    label: 'Web embed',
    description: 'Embed a sandboxed HTTPS page',
    keywords: 'web iframe embed page media',
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Embed remote HTTPS audio',
    keywords: 'audio sound music media',
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Embed remote HTTPS video',
    keywords: 'video movie media',
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    keywords: 'divider separator horizontal rule',
  },
  {
    id: 'date',
    label: 'Current date',
    description: 'Insert the local date',
    keywords: 'date today calendar',
  },
  {
    id: 'time',
    label: 'Current time',
    description: 'Insert the local time',
    keywords: 'time clock now',
  },
  {
    id: 'date-time',
    label: 'Date and time',
    description: 'Insert local date and time',
    keywords: 'date time timestamp now',
  },
];

const ToolbarButton = ({
  active,
  disabled,
  title,
  children,
  onClick,
}: ToolbarButtonProps) => (
  <button
    type="button"
    className={`rich-toolbar-button${active ? ' active' : ''}`}
    disabled={disabled}
    title={title}
    aria-label={title}
    onMouseDown={(event) => {
      event.preventDefault();
      if (!disabled) {
        onClick();
      }
    }}
  >
    {children}
  </button>
);

const normalizeLink = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const richOnlyMarks = new Set([
  'highlight',
  'subscript',
  'superscript',
  'textStyle',
]);

const hasRichOnlyFormatting = (node: any): boolean => {
  if (!node) return false;

  if (
    node.type === 'callout' ||
    node.type === 'outlineList' ||
    node.type === 'youtube' ||
    node.type === 'webEmbed' ||
    node.type === 'mediaEmbed'
  ) {
    return true;
  }

  if (node.attrs && node.attrs.blockId) {
    return true;
  }

  if (
    Array.isArray(node.marks) &&
    node.marks.some((mark: any) => richOnlyMarks.has(mark.type))
  ) {
    return true;
  }

  if (
    node.attrs &&
    typeof node.attrs.textAlign === 'string' &&
    node.attrs.textAlign !== 'left'
  ) {
    return true;
  }

  if (node.attrs && typeof node.attrs.dir === 'string' && node.attrs.dir) {
    return true;
  }

  if (
    node.type === 'image' &&
    node.attrs &&
    (node.attrs.width || node.attrs.height)
  ) {
    return true;
  }

  return Array.isArray(node.content)
    ? node.content.some((child: any) => hasRichOnlyFormatting(child))
    : false;
};

const serializeEditorContent = (editor: any) =>
  hasRichOnlyFormatting(editor.getJSON()) ? editor.getHTML() : editor.getMarkdown();

const supportedHtmlTags = new Set([
  'a',
  'aside',
  'audio',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'video',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const hasPotentiallyUnsupportedHtml = (value: string) => {
  if (!/<[a-z][\s\S]*>/i.test(value)) return false;

  const documentValue = new DOMParser().parseFromString(value, 'text/html');
  const elements = Array.from(documentValue.body.querySelectorAll('*'));

  for (const element of elements) {
    const tag = element.tagName.toLowerCase();

    if (tag === 'iframe') {
      if (
        element.closest('[data-youtube-video]') ||
        element.closest('[data-web-embed]')
      ) {
        continue;
      }
      return true;
    }

    if (!supportedHtmlTags.has(tag)) {
      return true;
    }
  }

  return false;
};

const isRichHtmlDocument = (value: string) =>
  /^\s*<(?:p|h[1-6]|ul|ol|blockquote|table|pre|div|aside)\b/i.test(value);

const setEditorContent = (editor: any, value: string, emitUpdate = false) => {
  editor.commands.setContent(value || '', {
    contentType: isRichHtmlDocument(value) ? 'html' : 'markdown',
    emitUpdate,
  });
};

export default function DynamicEditor({
  debugMode,
  onChange,
  readOnly,
  text,
}: DynamicProps) {
  const [sourceMode, setSourceMode] = useState(() =>
    hasPotentiallyUnsupportedHtml(text || '')
  );
  const [sourceText, setSourceText] = useState(text || '');
  const [, setRevision] = useState(0);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(
    CLOSED_SLASH_MENU
  );
  const [findOpen, setFindOpen] = useState(false);
  const [searchTerm, setSearchTermState] = useState('');
  const [replaceTerm, setReplaceTermState] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const runSlashCommandRef = useRef<(command: SlashCommandDefinition) => void>(
    () => {}
  );

  const emitChange = useMemo(
    () =>
      debounce((value: string) => {
        onChange(value);
      }, 120),
    [onChange]
  );

  useEffect(() => {
    return () => emitChange.cancel();
  }, [emitChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Markdown,
      CharacterCount,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing Markdown…",
      }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ['top', 'bottom', 'left', 'right'],
          minWidth: 40,
          minHeight: 40,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      OutlineList,
      Callout,
      WebEmbed,
      MediaEmbed,
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        width: 720,
        height: 405,
      }),
      BlockMetadata,
      TableKit.configure({
        table: {
          resizable: true,
          lastColumnResizable: true,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TextStyleKit,
      Subscript,
      Superscript,
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          strict: false,
        },
      }),
      FindAndReplace.configure({
        injectCSS: false,
        searchDebounceMs: 100,
      }),
    ],
    content: text || '',
    contentType: isRichHtmlDocument(text || '') ? 'html' : 'markdown',
    textDirection: 'auto',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'append-rich-editor ProseMirror',
        spellcheck: 'true',
      },
      transformPastedHTML: (html) =>
        DOMPurify.sanitize(html, {
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
          FORBID_ATTR: ['srcdoc'],
        }),
    },
    onUpdate: ({ editor: currentEditor }) => {
      const serialized = serializeEditorContent(currentEditor);
      setSourceText(serialized);
      emitChange(serialized);
      if (debugMode) {
        console.log(
          'DynamicEditor serialized content:',
          hasRichOnlyFormatting(currentEditor.getJSON()) ? 'rich-html' : 'markdown',
          serialized
        );
      }
    },
  });

  const updateSlashMenu = useCallback(() => {
    if (!editor || sourceMode || readOnly) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const { selection } = editor.state;
    const { $from, empty } = selection;

    if (!empty || !$from.parent.isTextblock) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const prefix = $from.parent.textBetween(
      0,
      $from.parentOffset,
      undefined,
      '\ufffc'
    );
    const match = prefix.match(/^\/([a-z0-9 -]*)$/i);

    if (!match) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const coords = editor.view.coordsAtPos($from.pos);
    const from = $from.pos - prefix.length;
    const query = match[1].trim().toLowerCase();

    setSlashMenu((previous) => ({
      open: true,
      query,
      from,
      to: $from.pos,
      x: Math.min(coords.left, window.innerWidth - 300),
      y: Math.min(coords.bottom + 6, window.innerHeight - 340),
      selected:
        previous.open && previous.query === query ? previous.selected : 0,
    }));
  }, [editor, readOnly, sourceMode]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || sourceMode) return;

    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== text) {
      setEditorContent(editor, text || '', false);
      setSourceText(text || '');
    }
  }, [editor, sourceMode, text]);

  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      setRevision((value) => value + 1);
      updateSlashMenu();
    };

    const onSelectionUpdate = () => {
      setRevision((value) => value + 1);
      updateSlashMenu();
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('transaction', onTransaction);

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('transaction', onTransaction);
    };
  }, [editor, updateSlashMenu]);

  useEffect(() => {
    if (!editor) return;

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const mathElement = target?.closest(
        '[data-type="inline-math"], [data-type="block-math"]'
      ) as HTMLElement | null;

      if (!mathElement) return;

      let pos: number;
      try {
        pos = editor.view.posAtDOM(mathElement, 0);
      } catch {
        return;
      }

      const node = editor.state.doc.nodeAt(pos);
      if (!node || (node.type.name !== 'inlineMath' && node.type.name !== 'blockMath')) {
        return;
      }

      const latex = window.prompt('Edit LaTeX formula', node.attrs.latex || '');
      if (latex === null || !latex.trim()) return;

      if (node.type.name === 'inlineMath') {
        editor.commands.updateInlineMath({ latex: latex.trim(), pos });
      } else {
        editor.commands.updateBlockMath({ latex: latex.trim(), pos });
      }
    };

    editor.view.dom.addEventListener('dblclick', handleDoubleClick);
    return () => editor.view.dom.removeEventListener('dblclick', handleDoubleClick);
  }, [editor]);

  useEffect(() => {
    if (!editor || sourceMode) return;

    const handleFindShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleFindShortcut);
    return () => window.removeEventListener('keydown', handleFindShortcut);
  }, [editor, sourceMode]);

  useEffect(() => {
    if (!editor) return;

    if (findOpen) {
      if (searchTerm) {
        editor.commands.setSearchTerm(searchTerm);
      }
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      editor.commands.clearSearch();
    }
  }, [editor, findOpen]);

  useEffect(() => {
    if (!editor || !slashMenu.open) return;

    const handleSlashKeys = (event: KeyboardEvent) => {
      const commands = SLASH_COMMANDS.filter((command) => {
        if (!slashMenu.query) return true;
        const haystack = `${command.label} ${command.description} ${command.keywords}`.toLowerCase();
        return haystack.includes(slashMenu.query);
      });

      if (!commands.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashMenu((previous) => ({
          ...previous,
          selected: (previous.selected + 1) % commands.length,
        }));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashMenu((previous) => ({
          ...previous,
          selected:
            (previous.selected - 1 + commands.length) % commands.length,
        }));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected =
          commands[Math.min(slashMenu.selected, commands.length - 1)];
        if (selected) {
          runSlashCommandRef.current(selected);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setSlashMenu(CLOSED_SLASH_MENU);
      }
    };

    editor.view.dom.addEventListener('keydown', handleSlashKeys);
    return () =>
      editor.view.dom.removeEventListener('keydown', handleSlashKeys);
  }, [editor, slashMenu]);

  if (!editor) {
    return <div className="DynamicEditor rich-editor-loading">Loading editor…</div>;
  }

  const toggleSourceMode = () => {
    if (sourceMode) {
      if (
        hasPotentiallyUnsupportedHtml(sourceText) &&
        !window.confirm(
          'This note contains HTML elements the rich editor may not understand. Switching to WYSIWYG mode can normalize or remove unsupported HTML. Continue?'
        )
      ) {
        return;
      }

      setEditorContent(editor, sourceText, false);
      setSourceMode(false);
      window.setTimeout(() => editor.commands.focus(), 0);
      return;
    }

    setSourceText(serializeEditorContent(editor));
    setSourceMode(true);
    setSlashMenu(CLOSED_SLASH_MENU);
    setFindOpen(false);
  };

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const value = window.prompt('Link URL', previous);
    if (value === null) return;

    const href = normalizeLink(value);
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const insertImage = () => {
    const value = window.prompt('Image URL (http/https)');
    if (!value) return;

    if (!isRemoteImageUrl(value)) {
      window.alert('Only http/https image URLs are supported for now.');
      return;
    }

    const alt = window.prompt('Alt text (optional)') || '';
    editor.chain().focus().setImage({ src: value.trim(), alt }).run();
  };

  const insertYoutube = () => {
    const value = window.prompt('YouTube URL');
    if (!value?.trim()) return;
    const ok = editor
      .chain()
      .focus()
      .setYoutubeVideo({ src: value.trim() })
      .run();

    if (!ok) {
      window.alert('That does not look like a supported YouTube URL.');
    }
  };

  const insertWebEmbed = () => {
    const value = window.prompt('HTTPS page URL');
    if (!value?.trim()) return;
    const title = window.prompt('Embed title (optional)') || 'Embedded content';
    const ok = editor
      .chain()
      .focus()
      .setWebEmbed({ src: value.trim(), title })
      .run();

    if (!ok) {
      window.alert('Only valid HTTPS URLs can be embedded.');
    }
  };

  const insertMedia = (kind: MediaKind) => {
    const value = window.prompt(
      kind === 'video' ? 'HTTPS video URL' : 'HTTPS audio URL'
    );
    if (!value?.trim()) return;

    const title =
      window.prompt(kind === 'video' ? 'Video title (optional)' : 'Audio title (optional)') ||
      (kind === 'video' ? 'Video' : 'Audio');

    const ok = editor
      .chain()
      .focus()
      .setMediaEmbed({ kind, src: value.trim(), title })
      .run();

    if (!ok) {
      window.alert('Only valid HTTPS media URLs can be embedded.');
    }
  };

  const insertInlineMath = () => {
    const latex = window.prompt('Inline LaTeX formula', 'E = mc^2');
    if (!latex?.trim()) return;
    editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
  };

  const insertBlockMath = () => {
    const latex = window.prompt('Block LaTeX formula', '\\frac{a}{b}');
    if (!latex?.trim()) return;
    editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run();
  };

  const insertDateTime = (kind: 'date' | 'time' | 'date-time') => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const value =
      kind === 'date' ? date : kind === 'time' ? time : `${date} ${time}`;

    editor.chain().focus().insertContent(value).run();
  };

  const insertCallout = (type: CalloutType = 'info') => {
    if (editor.isActive('callout')) {
      editor.chain().focus().setCalloutType(type).run();
      return;
    }

    editor.chain().focus().toggleCallout({ type }).run();
  };

  const getSelectedBlock = () => {
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth >= 1; depth -= 1) {
      const node = $from.node(depth);
      if (Object.prototype.hasOwnProperty.call(node.attrs, 'blockId')) {
        return {
          node,
          type: node.type.name,
          blockId: node.attrs.blockId as string | null,
        };
      }
    }

    return null;
  };

  const assignBlockId = async () => {
    const selected = getSelectedBlock();
    if (!selected) {
      window.alert('Place the cursor inside a supported block first.');
      return;
    }

    const current = selected.blockId || '';
    const requested = window.prompt(
      'Block ID (leave empty to generate one)',
      current
    );

    if (requested === null) return;

    const blockId = requested.trim() || createBlockId();
    editor
      .chain()
      .focus()
      .updateAttributes(selected.type, { blockId })
      .run();

    try {
      await navigator.clipboard?.writeText(`^${blockId}`);
    } catch {
      // Clipboard access is optional inside Standard Notes webviews.
    }
  };

  const clearBlockId = () => {
    const selected = getSelectedBlock();
    if (!selected) return;
    editor
      .chain()
      .focus()
      .updateAttributes(selected.type, { blockId: null })
      .run();
  };

  const currentHeading = [1, 2, 3, 4, 5, 6].find((level) =>
    editor.isActive('heading', { level })
  );

  const inTable = editor.isActive('table');
  const inCodeBlock = editor.isActive('codeBlock');
  const activeCodeLanguage = editor.getAttributes('codeBlock').language || '';
  const activeTextStyle = editor.getAttributes('textStyle');
  const activeFontFamily = activeTextStyle.fontFamily || '';
  const activeLineHeight = activeTextStyle.lineHeight || '';
  const activeDirection =
    editor.getAttributes('paragraph').dir ||
    editor.getAttributes('heading').dir ||
    '';
  const inCallout = editor.isActive('callout');
  const activeCalloutType = inCallout
    ? ((editor.getAttributes('callout').type || 'info') as CalloutType)
    : 'info';
  const richStorage = hasRichOnlyFormatting(editor.getJSON());
  const characterStorage = (editor.storage as any).characterCount;
  const characterCount = characterStorage?.characters?.() ?? 0;
  const wordCount = characterStorage?.words?.() ?? 0;
  const findStorage = (editor.storage as any).findAndReplace || {
    results: [],
    currentIndex: null,
  };
  const resultCount = Array.isArray(findStorage.results)
    ? findStorage.results.length
    : 0;
  const currentResult =
    typeof findStorage.currentIndex === 'number'
      ? findStorage.currentIndex + 1
      : 0;

  const filteredSlashCommands = SLASH_COMMANDS.filter((command) => {
    if (!slashMenu.query) return true;
    const haystack = `${command.label} ${command.description} ${command.keywords}`.toLowerCase();
    return haystack.includes(slashMenu.query);
  });

  const runSlashCommand = (command: SlashCommandDefinition) => {
    const { from, to } = slashMenu;
    const chain = editor.chain().focus().deleteRange({ from, to });

    switch (command.id) {
      case 'paragraph':
        chain.setParagraph().run();
        break;
      case 'heading1':
        chain.setHeading({ level: 1 }).run();
        break;
      case 'heading2':
        chain.setHeading({ level: 2 }).run();
        break;
      case 'heading3':
        chain.setHeading({ level: 3 }).run();
        break;
      case 'bullet-list':
        chain.toggleBulletList().run();
        break;
      case 'ordered-list':
        chain.toggleOrderedList().run();
        break;
      case 'outline-list':
        chain.toggleOutlineList().run();
        break;
      case 'task-list':
        chain.toggleTaskList().run();
        break;
      case 'callout':
        chain.run();
        window.setTimeout(() => insertCallout('info'), 0);
        break;
      case 'quote':
        chain.toggleBlockquote().run();
        break;
      case 'code-block':
        chain.toggleCodeBlock().run();
        break;
      case 'inline-math':
        chain.run();
        window.setTimeout(insertInlineMath, 0);
        break;
      case 'block-math':
        chain.run();
        window.setTimeout(insertBlockMath, 0);
        break;
      case 'table':
        chain
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
        break;
      case 'image':
        chain.run();
        window.setTimeout(insertImage, 0);
        break;
      case 'youtube':
        chain.run();
        window.setTimeout(insertYoutube, 0);
        break;
      case 'web-embed':
        chain.run();
        window.setTimeout(insertWebEmbed, 0);
        break;
      case 'audio':
        chain.run();
        window.setTimeout(() => insertMedia('audio'), 0);
        break;
      case 'video':
        chain.run();
        window.setTimeout(() => insertMedia('video'), 0);
        break;
      case 'divider':
        chain.setHorizontalRule().run();
        break;
      case 'date':
        chain.run();
        window.setTimeout(() => insertDateTime('date'), 0);
        break;
      case 'time':
        chain.run();
        window.setTimeout(() => insertDateTime('time'), 0);
        break;
      case 'date-time':
        chain.run();
        window.setTimeout(() => insertDateTime('date-time'), 0);
        break;
      default:
        chain.run();
        break;
    }

    setSlashMenu(CLOSED_SLASH_MENU);
  };

  runSlashCommandRef.current = runSlashCommand;

  const updateSearchTerm = (value: string) => {
    setSearchTermState(value);
    editor.commands.setSearchTerm(value);
  };

  const updateReplaceTerm = (value: string) => {
    setReplaceTermState(value);
    editor.commands.setReplaceTerm(value);
  };

  const toggleCaseSensitive = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    editor.commands.setCaseSensitive(next);
  };

  const toggleWholeWord = () => {
    const next = !wholeWord;
    setWholeWord(next);
    editor.commands.setWholeWord(next);
  };

  const toggleRegex = () => {
    const next = !useRegex;
    setUseRegex(next);
    editor.commands.setUseRegex(next);
  };

  return (
    <div className="DynamicEditor">
      {!sourceMode && !readOnly && (
        <>
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top', offset: 8 }}
            shouldShow={({ from, to }) => from !== to && !findOpen}
          >
            <div className="rich-context-menu selection-menu">
              <ToolbarButton
                title="Bold"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton
                title="Italic"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton
                title="Underline"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <u>U</u>
              </ToolbarButton>
              <ToolbarButton
                title="Strikethrough"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <s>S</s>
              </ToolbarButton>
              <ToolbarButton
                title="Highlight"
                active={editor.isActive('highlight')}
                onClick={() =>
                  editor.chain().focus().toggleHighlight({ color: '#fff59d' }).run()
                }
              >
                H
              </ToolbarButton>
              <ToolbarButton
                title="Link"
                active={editor.isActive('link')}
                onClick={setLink}
              >
                Link
              </ToolbarButton>
            </div>
          </BubbleMenu>

          <FloatingMenu
            editor={editor}
            options={{ placement: 'left-start', offset: 8 }}
            shouldShow={({ editor: currentEditor }) =>
              !slashMenu.open &&
              !findOpen &&
              currentEditor.state.selection.empty
            }
          >
            <div className="rich-context-menu insert-menu">
              <span className="insert-menu-label" title="Type / for all commands">
                +
              </span>
              <ToolbarButton
                title="Heading 1"
                onClick={() =>
                  editor.chain().focus().setHeading({ level: 1 }).run()
                }
              >
                H1
              </ToolbarButton>
              <ToolbarButton
                title="Task list"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              >
                ☑
              </ToolbarButton>
              <ToolbarButton title="Formula" onClick={insertInlineMath}>
                ∑
              </ToolbarButton>
              <ToolbarButton
                title="Callout"
                active={inCallout}
                onClick={() => insertCallout('info')}
              >
                💡
              </ToolbarButton>
              <ToolbarButton title="Image" onClick={insertImage}>
                Img
              </ToolbarButton>
              <ToolbarButton
                title="Table"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              >
                Tbl
              </ToolbarButton>
            </div>
          </FloatingMenu>
        </>
      )}

      <div className="rich-toolbar" role="toolbar" aria-label="Formatting toolbar">
        <div className="rich-toolbar-group">
          <select
            className="rich-toolbar-select"
            aria-label="Text style"
            title="Text style"
            disabled={sourceMode || readOnly}
            value={currentHeading ? `h${currentHeading}` : 'paragraph'}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = Number(value.substring(1)) as
                  | 1
                  | 2
                  | 3
                  | 4
                  | 5
                  | 6;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
          </select>

          <select
            className="rich-toolbar-select"
            aria-label="Font family"
            title="Font family"
            disabled={sourceMode || readOnly}
            value={activeFontFamily}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(value).run();
              }
            }}
          >
            <option value="">Font</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="'Times New Roman'">Times New Roman</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
            <option value="'Courier New'">Courier New</option>
            <option value="monospace">Monospace</option>
          </select>

          <select
            className="rich-toolbar-select compact"
            aria-label="Font size"
            title="Font size"
            disabled={sourceMode || readOnly}
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(value).run();
              }
            }}
          >
            <option value="">Size</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
          </select>

          <select
            className="rich-toolbar-select compact"
            aria-label="Line height"
            title="Line height"
            disabled={sourceMode || readOnly}
            value={activeLineHeight}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetLineHeight().run();
              } else {
                editor.chain().focus().setLineHeight(value).run();
              }
            }}
          >
            <option value="">Line</option>
            <option value="1">1.0</option>
            <option value="1.25">1.25</option>
            <option value="1.5">1.5</option>
            <option value="1.75">1.75</option>
            <option value="2">2.0</option>
          </select>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="Bold"
            active={editor.isActive('bold')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor.isActive('italic')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={editor.isActive('underline')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor.isActive('strike')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={editor.isActive('code')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            title="Subscript"
            active={editor.isActive('subscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            X₂
          </ToolbarButton>
          <ToolbarButton
            title="Superscript"
            active={editor.isActive('superscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            X²
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          <label className="rich-color-control" title="Text color">
            A
            <input
              type="color"
              aria-label="Text color"
              disabled={sourceMode || readOnly}
              onChange={(event) =>
                editor.chain().focus().setColor(event.target.value).run()
              }
            />
          </label>
          <label className="rich-color-control highlight" title="Highlight color">
            H
            <input
              type="color"
              aria-label="Highlight color"
              disabled={sourceMode || readOnly}
              defaultValue="#fff59d"
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .setHighlight({ color: event.target.value })
                  .run()
              }
            />
          </label>
          <ToolbarButton
            title="Remove inline formatting"
            disabled={sourceMode || readOnly}
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            Clear
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="Bullet list"
            active={editor.isActive('bulletList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={editor.isActive('orderedList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            title="Task list"
            active={editor.isActive('taskList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            title="Callout"
            active={inCallout}
            disabled={sourceMode || readOnly}
            onClick={() => insertCallout('info')}
          >
            💡
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={editor.isActive('blockquote')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            “ ”
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor.isActive('codeBlock')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            Code
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal rule"
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </ToolbarButton>
        </div>

        {inCallout && !sourceMode && (
          <div className="rich-toolbar-group callout-tools">
            <select
              className="rich-toolbar-select"
              aria-label="Callout type"
              title="Callout type"
              value={activeCalloutType}
              disabled={readOnly}
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .setCalloutType(event.target.value as CalloutType)
                  .run()
              }
            >
              <option value="info">Info</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
            <ToolbarButton
              title="Remove callout"
              disabled={readOnly}
              onClick={() => editor.chain().focus().unsetCallout().run()}
            >
              Remove
            </ToolbarButton>
          </div>
        )}

        <div className="rich-toolbar-group">
          {(['left', 'center', 'right', 'justify'] as const).map((alignment) => (
            <ToolbarButton
              key={alignment}
              title={`Align ${alignment}`}
              active={editor.isActive({ textAlign: alignment })}
              disabled={sourceMode || readOnly}
              onClick={() =>
                editor.chain().focus().setTextAlign(alignment).run()
              }
            >
              {alignment === 'left'
                ? '⇤'
                : alignment === 'center'
                ? '↔'
                : alignment === 'right'
                ? '⇥'
                : '≡'}
            </ToolbarButton>
          ))}
          <select
            className="rich-toolbar-select compact"
            aria-label="Text direction"
            title="Text direction"
            disabled={sourceMode || readOnly}
            value={activeDirection}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetTextDirection().run();
              } else {
                editor
                  .chain()
                  .focus()
                  .setTextDirection(value as 'ltr' | 'rtl' | 'auto')
                  .run();
              }
            }}
          >
            <option value="">Dir</option>
            <option value="auto">Auto</option>
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </select>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="Add or edit link"
            active={editor.isActive('link')}
            disabled={sourceMode || readOnly}
            onClick={setLink}
          >
            Link
          </ToolbarButton>
          <ToolbarButton
            title="Insert image by URL"
            disabled={sourceMode || readOnly}
            onClick={insertImage}
          >
            Image
          </ToolbarButton>
          <ToolbarButton
            title="Insert YouTube video"
            disabled={sourceMode || readOnly}
            onClick={insertYoutube}
          >
            YouTube
          </ToolbarButton>
          <ToolbarButton
            title="Insert sandboxed web embed"
            disabled={sourceMode || readOnly}
            onClick={insertWebEmbed}
          >
            Embed
          </ToolbarButton>
          <ToolbarButton
            title="Insert remote audio"
            disabled={sourceMode || readOnly}
            onClick={() => insertMedia('audio')}
          >
            Audio
          </ToolbarButton>
          <ToolbarButton
            title="Insert remote video"
            disabled={sourceMode || readOnly}
            onClick={() => insertMedia('video')}
          >
            Video
          </ToolbarButton>
          <ToolbarButton
            title="Insert inline formula"
            disabled={sourceMode || readOnly}
            onClick={insertInlineMath}
          >
            ∑
          </ToolbarButton>
          <ToolbarButton
            title="Insert block formula"
            disabled={sourceMode || readOnly}
            onClick={insertBlockMath}
          >
            ∫
          </ToolbarButton>
          <ToolbarButton
            title="Insert table"
            disabled={sourceMode || readOnly}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            Table
          </ToolbarButton>
        </div>

        {inCodeBlock && !sourceMode && (
          <div className="rich-toolbar-group code-tools">
            <select
              className="rich-toolbar-select"
              aria-label="Code language"
              title="Code language"
              value={activeCodeLanguage}
              disabled={readOnly}
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes('codeBlock', {
                    language: event.target.value || null,
                  })
                  .run()
              }
            >
              <option value="">Plain code</option>
              <option value="bash">Bash</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="json">JSON</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="typescript">TypeScript</option>
              <option value="xml">XML</option>
            </select>
          </div>
        )}

        {inTable && !sourceMode && (
          <div className="rich-toolbar-group table-tools">
            <ToolbarButton
              title="Add row"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Row+
            </ToolbarButton>
            <ToolbarButton
              title="Delete row"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Row−
            </ToolbarButton>
            <ToolbarButton
              title="Add column"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Col+
            </ToolbarButton>
            <ToolbarButton
              title="Delete column"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Col−
            </ToolbarButton>
            <ToolbarButton
              title="Toggle header row"
              disabled={readOnly}
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Header
            </ToolbarButton>
            <ToolbarButton
              title="Merge selected cells"
              disabled={readOnly || !editor.can().mergeCells()}
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              Merge
            </ToolbarButton>
            <ToolbarButton
              title="Split selected cell"
              disabled={readOnly || !editor.can().splitCell()}
              onClick={() => editor.chain().focus().splitCell().run()}
            >
              Split
            </ToolbarButton>
            <ToolbarButton
              title="Delete table"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </ToolbarButton>
          </div>
        )}

        <div className="rich-toolbar-group block-tools">
          <ToolbarButton
            title="Toggle outline list"
            active={editor.isActive('outlineList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleOutlineList().run()}
          >
            Outline
          </ToolbarButton>
          <ToolbarButton
            title="Set/generate block ID and copy reference"
            disabled={sourceMode || readOnly}
            onClick={assignBlockId}
          >
            Block ID
          </ToolbarButton>
          <ToolbarButton
            title="Remove block ID"
            disabled={sourceMode || readOnly || !getSelectedBlock()?.blockId}
            onClick={clearBlockId}
          >
            ID−
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group rich-toolbar-spacer">
          <span
            className={`rich-storage-badge${richStorage ? ' rich' : ''}`}
            title={
              richStorage
                ? 'HTML fallback is active to preserve formatting that Markdown cannot represent'
                : 'This note is currently stored as Markdown'
            }
          >
            {richStorage ? 'Rich HTML' : 'Markdown'}
          </span>
          <ToolbarButton
            title="Find and replace (Ctrl/Cmd+F)"
            active={findOpen}
            disabled={sourceMode}
            onClick={() => setFindOpen((value) => !value)}
          >
            Find
          </ToolbarButton>
          <ToolbarButton
            title="Undo"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().undo().run()
            }
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().redo().run()
            }
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </ToolbarButton>
          <ToolbarButton
            title={sourceMode ? 'Return to rich editor' : 'Edit source'}
            active={sourceMode}
            disabled={readOnly}
            onClick={toggleSourceMode}
          >
            {'</>'}
          </ToolbarButton>
        </div>
      </div>

      {findOpen && !sourceMode && (
        <div className="find-replace-panel" role="search" aria-label="Find and replace">
          <div className="find-replace-row">
            <input
              ref={searchInputRef}
              className="find-replace-input"
              type="text"
              value={searchTerm}
              placeholder="Find"
              aria-label="Find"
              onChange={(event) => updateSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (event.shiftKey) {
                    editor.commands.goToPreviousResult();
                  } else {
                    editor.commands.goToNextResult();
                  }
                } else if (event.key === 'Escape') {
                  setFindOpen(false);
                }
              }}
            />
            <span className="find-replace-count" aria-live="polite">
              {currentResult} / {resultCount}
            </span>
            <button
              type="button"
              className="find-replace-button"
              disabled={!resultCount}
              onClick={() => editor.commands.goToPreviousResult()}
              title="Previous result"
            >
              ↑
            </button>
            <button
              type="button"
              className="find-replace-button"
              disabled={!resultCount}
              onClick={() => editor.commands.goToNextResult()}
              title="Next result"
            >
              ↓
            </button>
            <button
              type="button"
              className="find-replace-button"
              onClick={() => setFindOpen(false)}
              title="Close find and replace"
            >
              ×
            </button>
          </div>
          <div className="find-replace-row">
            <input
              className="find-replace-input"
              type="text"
              value={replaceTerm}
              placeholder="Replace with"
              aria-label="Replace with"
              disabled={readOnly}
              onChange={(event) => updateReplaceTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !readOnly) {
                  event.preventDefault();
                  editor.commands.replace();
                }
              }}
            />
            <button
              type="button"
              className="find-replace-button text"
              disabled={readOnly || !resultCount}
              onClick={() => editor.commands.replace()}
            >
              Replace
            </button>
            <button
              type="button"
              className="find-replace-button text"
              disabled={readOnly || !resultCount}
              onClick={() => editor.commands.replaceAll()}
            >
              All
            </button>
          </div>
          <div className="find-replace-options">
            <label>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={toggleCaseSensitive}
              />
              Match case
            </label>
            <label>
              <input
                type="checkbox"
                checked={wholeWord}
                disabled={useRegex}
                onChange={toggleWholeWord}
              />
              Whole word
            </label>
            <label>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={toggleRegex}
              />
              Regex
            </label>
          </div>
        </div>
      )}

      {slashMenu.open && (
        <div
          className="slash-command-menu"
          role="listbox"
          aria-label="Insert block"
          style={{ left: slashMenu.x, top: slashMenu.y }}
        >
          <div className="slash-command-header">
            {slashMenu.query ? `Commands matching “${slashMenu.query}”` : 'Insert'}
          </div>
          {filteredSlashCommands.length ? (
            filteredSlashCommands.map((command, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === slashMenu.selected}
                className={`slash-command-item${
                  index === slashMenu.selected ? ' selected' : ''
                }`}
                key={command.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSlashCommand(command);
                }}
                onMouseEnter={() =>
                  setSlashMenu((previous) => ({
                    ...previous,
                    selected: index,
                  }))
                }
              >
                <strong>{command.label}</strong>
                <span>{command.description}</span>
              </button>
            ))
          ) : (
            <div className="slash-command-empty">No matching commands</div>
          )}
        </div>
      )}

      {sourceMode ? (
        <textarea
          className="rich-source-editor"
          aria-label="Note source"
          spellCheck={false}
          value={sourceText}
          onChange={(event) => {
            const value = event.target.value;
            setSourceText(value);
            emitChange(value);
          }}
        />
      ) : (
        <>
          {!readOnly && (
            <DragHandle
              editor={editor}
              nested
              className="append-block-drag-handle"
            >
              <button
                type="button"
                className="append-block-drag-button"
                title="Drag block"
                aria-label="Drag block"
              >
                ⋮⋮
              </button>
            </DragHandle>
          )}
          <EditorContent editor={editor} />
        </>
      )}

      {!sourceMode && (
        <div className="rich-editor-status">
          <span>{wordCount} words · {characterCount} characters</span>
          <span>Type / for insert commands</span>
          <span>Double-click a formula to edit LaTeX</span>
          <span>Ctrl/Cmd+F to search</span>
        </div>
      )}
    </div>
  );
}
