"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-text-style";
import { BackgroundColor } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSavedColors } from "@/components/providers/saved-colors-provider";
import { BrandColorPickerModal } from "@/components/admin/brand-color-picker-modal";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  ImageIcon,
  Quote,
  Code,
  Table as TableIcon,
  Undo,
  Redo,
  Palette,
  Highlighter,
  SwatchBook,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageRequest?: () => Promise<string | null>;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
        active ? "bg-gray-200 text-[#1A2640]" : "text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

const FONT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Inter", value: "Inter" },
];

const FONT_SIZE_OPTIONS = [
  { label: "Default", value: "" },
  { label: "10px", value: "10px" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
  { label: "56px", value: "56px" },
  { label: "64px", value: "64px" },
  { label: "72px", value: "72px" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

function ToolbarColorPopover({
  icon,
  title,
  onApply,
  onUnset,
}: {
  icon: React.ReactNode;
  title: string;
  onApply: (hex: string) => void;
  onUnset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [customColor, setCustomColor] = useState("#000000");
  const { colors: savedColors, addColor, findBrandColor } = useSavedColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      // Ignore clicks inside the dialog overlay (modal is open)
      if ((e.target as Element)?.closest?.("[data-slot='dialog-overlay'], [data-slot='dialog-content']")) return;
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !modalOpen) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, modalOpen]);

  // Show up to 8 saved colors for quick access
  const quickColors = savedColors.slice(0, 8);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        title={title}
        className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
          open ? "bg-gray-200 text-[#1A2640]" : "text-gray-600"
        }`}
      >
        {icon}
      </button>
      {open && (
        <div
          ref={containerRef}
          className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 w-64"
        >
          {/* Quick-access saved colors */}
          {quickColors.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Quick Colors</p>
              <div className="flex flex-wrap gap-1.5">
                {quickColors.map((c) => {
                  const brand = findBrandColor(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      title={brand ? `${brand.name} (${brand.hex})` : c}
                      onClick={() => {
                        onApply(c);
                        setOpen(false);
                      }}
                      className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
                {savedColors.length > 8 && (
                  <span className="text-[10px] text-gray-400 self-center">+{savedColors.length - 8}</span>
                )}
              </div>
            </div>
          )}

          {/* Browse Palette button */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-[#B07D3A] hover:bg-[#FDF5E8] border border-[#E8D5B0] rounded-md py-1.5 mb-2 transition-colors"
          >
            <SwatchBook size={13} />
            Browse Brand Palette
          </button>

          {/* Custom color row */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomColor(v);
              }}
              className="flex-1 text-xs border rounded px-2 py-1 font-mono"
              placeholder="#000000"
            />
            <button
              type="button"
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                  onApply(customColor);
                  setOpen(false);
                }
              }}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Apply
            </button>
          </div>

          {/* Save + Default row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                  addColor(customColor);
                }
              }}
              className="text-[11px] text-blue-600 hover:underline"
            >
              Save this color
            </button>
            <button
              type="button"
              onClick={() => {
                onUnset();
                setOpen(false);
              }}
              className="text-[11px] text-gray-500 hover:text-gray-700"
            >
              Default
            </button>
          </div>
        </div>
      )}

      <BrandColorPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(hex) => {
          onApply(hex);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  onImageRequest,
  placeholder,
}: RichTextEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      BackgroundColor,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;
    if (onImageRequest) {
      const url = await onImageRequest();
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } else {
      const url = window.prompt("Enter image URL:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  }, [editor, onImageRequest]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const toggleSource = useCallback(() => {
    if (!editor) return;
    if (!showSource) {
      setSourceHtml(editor.getHTML());
      setShowSource(true);
    } else {
      editor.commands.setContent(sourceHtml);
      onChange(sourceHtml);
      setShowSource(false);
    }
  }, [editor, showSource, sourceHtml, onChange]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg bg-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-gray-50 px-2 py-1.5 flex flex-wrap items-center gap-0.5 rounded-t-lg">
        {/* Font select */}
        <select
          value={editor.getAttributes("textStyle").fontFamily || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor.chain().focus().setFontFamily(val).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-7 text-xs border border-gray-300 rounded px-1.5 bg-white text-gray-600 focus:outline-none"
          title="Font Family"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font size select */}
        <select
          value={editor.getAttributes("textStyle").fontSize || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor.chain().focus().setFontSize(val).run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
          className="h-7 text-xs border border-gray-300 rounded px-1.5 bg-white text-gray-600 focus:outline-none"
          title="Font Size"
        >
          {FONT_SIZE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarColorPopover
          icon={<Palette size={16} />}
          title="Text Color"
          onApply={(hex) => editor.chain().focus().setColor(hex).run()}
          onUnset={() => editor.chain().focus().unsetColor().run()}
        />
        <ToolbarColorPopover
          icon={<Highlighter size={16} />}
          title="Background Color"
          onApply={(hex) => editor.chain().focus().setBackgroundColor(hex).run()}
          onUnset={() => editor.chain().focus().unsetBackgroundColor().run()}
        />

        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Image">
          <ImageIcon size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Table">
          <TableIcon size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={toggleSource}
          className={`px-2 py-1 text-xs rounded ${
            showSource
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {showSource ? "Visual" : "HTML"}
        </button>
      </div>

      {/* Editor */}
      {showSource ? (
        <textarea
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm focus:outline-none resize-y"
          placeholder={placeholder}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
