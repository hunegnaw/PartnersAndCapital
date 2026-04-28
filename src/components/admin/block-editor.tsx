"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BLOCK_TYPES, type BlockType, type PageBlockData } from "@/lib/page-blocks";
import { BlockTypePicker } from "./block-type-picker";
import { BlockEditorForm } from "./block-editor-form";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

interface BlockEditorProps {
  blocks: PageBlockData[];
  onChange: (blocks: PageBlockData[]) => void;
}

function SortableBlock({
  block,
  index,
  onUpdate,
  onRemove,
}: {
  block: PageBlockData;
  index: number;
  onUpdate: (index: number, props: Record<string, unknown>) => void;
  onRemove: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id || `block-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = BLOCK_TYPES[block.type as BlockType];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg bg-white mb-3"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="text-sm font-medium text-gray-700 flex-1">
          {config?.label || block.type}
        </span>
        <span className="text-xs text-gray-400">#{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="p-4">
          <BlockEditorForm
            type={block.type as BlockType}
            props={block.props}
            onChange={(newProps) => onUpdate(index, newProps)}
          />
        </div>
      )}
    </div>
  );
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [showPicker, setShowPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(
      (b, i) => (b.id || `block-${i}`) === active.id
    );
    const newIndex = blocks.findIndex(
      (b, i) => (b.id || `block-${i}`) === over.id
    );

    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      sortOrder: i,
    }));
    onChange(reordered);
  };

  const addBlock = (type: BlockType) => {
    const config = BLOCK_TYPES[type];
    const newBlock: PageBlockData = {
      id: `new-${Date.now()}`,
      type,
      props: { ...config.defaultProps },
      sortOrder: blocks.length,
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (index: number, props: Record<string, unknown>) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], props };
    onChange(updated);
  };

  const removeBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index).map((b, i) => ({
      ...b,
      sortOrder: i,
    }));
    onChange(updated);
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b, i) => b.id || `block-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <SortableBlock
              key={block.id || `block-${index}`}
              block={block}
              index={index}
              onUpdate={updateBlock}
              onRemove={removeBlock}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#b8860b] hover:text-[#b8860b] transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add Block
      </button>

      <BlockTypePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addBlock}
      />
    </div>
  );
}
