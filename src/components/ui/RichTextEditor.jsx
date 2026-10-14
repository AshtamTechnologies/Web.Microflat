import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  Eraser,
  Type,
  Palette,
  ChevronDown,
} from 'lucide-react';

const TextColor = Mark.create({
  name: 'textColor',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            style: `color: ${attributes.color}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*=color]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setColor:
        (color) =>
        ({ chain }) => {
          return chain().setMark(this.name, { color }).run();
        },
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run();
        },
    };
  },
});

const PRESET_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Primary Blue', value: 'var(--color-blue)' },
  { name: 'Sky Blue', value: 'var(--color-sky)' },
  { name: 'Green', value: 'var(--color-green)' },
  { name: 'Amber', value: 'var(--color-amber)' },
  { name: 'Red', value: 'var(--color-red)' },
  { name: 'Purple', value: 'var(--color-purple)' },
  { name: 'Muted Slate', value: 'var(--color-slate)' },
  { name: 'Dark', value: 'var(--color-dark)' },
];

function getCleanStringContent(val) {
  if (typeof val === 'string') return val;
  if (!val) return '';
  if (typeof val === 'object' && 'target' in val && val.target) {
    return typeof val.target.value === 'string' ? val.target.value : '';
  }
  return String(val || '');
}

export default function RichTextEditor({
  id,
  name,
  label,
  value = '',
  onChange,
  onBlur,
  placeholder = 'Type your specifications, tolerances, and notes here...',
  required = false,
  error = '',
  hint = '',
  disabled = false,
  className = '',
  minHeight = 'min-h-[160px]',
}) {
  const isUpdatingFromEditorRef = useRef(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const colorMenuRef = useRef(null);

  // Close color menu on outside click
  useEffect(() => {
    function handleDocClick(e) {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setIsColorMenuOpen(false);
      }
    }
    if (isColorMenuOpen) {
      document.addEventListener('mousedown', handleDocClick);
      return () => document.removeEventListener('mousedown', handleDocClick);
    }
  }, [isColorMenuOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextColor,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: getCleanStringContent(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      isUpdatingFromEditorRef.current = true;
      const html = editor.isEmpty ? '' : editor.getHTML();
      if (onChange) {
        onChange({
          target: {
            name: name || id,
            value: html,
          },
        });
      }
      setTimeout(() => {
        isUpdatingFromEditorRef.current = false;
      }, 0);
    },
    onBlur: () => {
      if (onBlur) {
        onBlur({
          target: {
            name: name || id,
            value: editor?.isEmpty ? '' : editor?.getHTML() || '',
          },
        });
      }
    },
  });

  // Sync external value changes (e.g. form reset, initial load, record switch)
  // WITHOUT resetting the user's cursor or text selection while they are actively typing/editing
  useEffect(() => {
    if (!editor) return;
    if (isUpdatingFromEditorRef.current) return;

    const currentHtml = editor.getHTML();
    const currentClean = editor.isEmpty ? '' : currentHtml;
    const incomingClean = getCleanStringContent(value);

    if (incomingClean !== currentClean) {
      editor.commands.setContent(incomingClean, false);
    }
  }, [value, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-heading">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className={`w-full rounded-lg border border-border bg-bg p-4 ${minHeight} animate-pulse`} />
      </div>
    );
  }

  // Toolbar button that prevents default on mousedown so text selection in editor is preserved!
  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent stealing focus from editor / collapsing selected text
        e.preventDefault();
      }}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`h-7 px-2 rounded flex items-center justify-center text-xs font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        isActive
          ? 'bg-primary text-white shadow-2xs font-semibold'
          : 'text-text-muted hover:text-heading hover:bg-surface active:bg-surface/80'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className={`mf-field ${className}`}>
      {/* Label and Mode info */}
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="mf-label"
          >
            {label}
            {required && <span className="mf-required">*</span>}
          </label>
          <span className="text-2xs text-text-muted">Rich Text Editor</span>
        </div>
      )}

      {/* Editor Main Box */}
      <div
        className={`w-full rounded-control border transition-all overflow-hidden bg-bg ${
          error
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/20'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        } ${disabled ? 'opacity-60 pointer-events-none bg-surface/30' : ''}`}
      >
        {/* ── Responsive Word-like Formatting Toolbar ── */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-surface/70 border-b border-border text-text select-none">
          {/* Paragraph / Normal Text */}
          <ToolbarButton
            onClick={() => editor.chain().focus().clearNodes().setParagraph().run()}
            isActive={editor.isActive('paragraph') && !editor.isActive('heading') && !editor.isActive('blockquote')}
            title="Normal Paragraph (Resets headings, quotes, lists)"
          >
            <Type size={14} className="mr-1" />
            <span className="text-2xs">Normal</span>
          </ToolbarButton>

          {/* Heading 1 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1 (Applies to current line/block)"
          >
            <Heading1 size={14} />
          </ToolbarButton>

          {/* Heading 2 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (Applies to current line/block)"
          >
            <Heading2 size={14} />
          </ToolbarButton>

          {/* Heading 3 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3 (Applies to current line/block)"
          >
            <Heading3 size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Bold */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B) - Applies to selected text"
          >
            <Bold size={14} />
          </ToolbarButton>

          {/* Italic */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I) - Applies to selected text"
          >
            <Italic size={14} />
          </ToolbarButton>

          {/* Underline */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U) - Applies to selected text"
          >
            <UnderlineIcon size={14} />
          </ToolbarButton>

          {/* Strikethrough */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough - Applies to selected text"
          >
            <Strikethrough size={14} />
          </ToolbarButton>

          {/* Text Color Picker */}
          <div className="relative" ref={colorMenuRef}>
            <button
              type="button"
              onClick={() => setIsColorMenuOpen((prev) => !prev)}
              title="Text Color"
              className="px-2 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 text-text-muted hover:text-heading hover:bg-surface active:bg-surface/80"
            >
              <Palette size={14} className="text-primary" />
              <span className="text-2xs hidden sm:inline">Color</span>
              <ChevronDown size={11} className="text-text-muted/70" />
            </button>

            {isColorMenuOpen && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-surface border border-border rounded-lg shadow-lg z-50 w-48 space-y-2">
                <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider px-1">
                  Preset Colors
                </div>
                <div className="grid grid-cols-5 gap-1.5 px-1">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      title={col.name}
                      onClick={() => {
                        if (col.value) {
                          editor.chain().focus().setColor(col.value).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setIsColorMenuOpen(false);
                      }}
                      className="w-6 h-6 rounded-md border border-border/70 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                      style={{
                        backgroundColor: col.value || 'var(--text)',
                      }}
                    >
                      {!col.value && (
                        <span className="text-2xs text-bg font-bold">×</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="pt-1.5 border-t border-border flex items-center justify-between gap-2 px-1">
                  <span className="text-xs text-text-muted">Custom:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-heading">
                    <input
                      type="color"
                      onChange={(e) => {
                        editor.chain().focus().setColor(e.target.value).run();
                        setIsColorMenuOpen(false);
                      }}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-2xs text-primary hover:underline">Pick</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Bullet List */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={14} />
          </ToolbarButton>

          {/* Numbered List */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </ToolbarButton>

          {/* Quote Block */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote Block"
          >
            <Quote size={14} />
          </ToolbarButton>

          {/* Code Block */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={14} />
          </ToolbarButton>

          {/* Horizontal Line Divider */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider Line"
          >
            <Minus size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Clear Formatting on Selected Text */}
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear Formatting (Selected text / current line)"
          >
            <Eraser size={14} />
          </ToolbarButton>

          {/* Undo / Redo */}
          <div className="ml-auto flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </ToolbarButton>
          </div>
        </div>

        {/* ── Content Editable Area ── */}
        <div className={`p-3 text-sm text-text bg-bg leading-relaxed cursor-text ${minHeight}`}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Error / Hint */}
      {error ? (
        <p className="text-xs text-danger font-medium mt-0.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
