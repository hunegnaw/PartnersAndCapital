"use client";

import { BLOCK_TYPES, type BlockType } from "@/lib/page-blocks";
import {
  Video,
  Image,
  Type,
  Grid3X3,
  BarChart3,
  Megaphone,
  Columns2,
  Mail,
  Newspaper,
  Quote,
  ImageIcon,
  Play,
  Minus,
  ListOrdered,
  X,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Video,
  Image,
  Type,
  Grid3X3,
  BarChart3,
  Megaphone,
  Columns2,
  Mail,
  Newspaper,
  Quote,
  ImageIcon,
  Play,
  Minus,
  ListOrdered,
};

interface BlockTypePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  allowedTypes?: BlockType[];
}

export function BlockTypePicker({
  open,
  onClose,
  onSelect,
  allowedTypes,
}: BlockTypePickerProps) {
  if (!open) return null;

  const entries = (
    Object.entries(BLOCK_TYPES) as [BlockType, (typeof BLOCK_TYPES)[BlockType]][]
  ).filter(([type]) => !allowedTypes || allowedTypes.includes(type));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Add Block</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 p-6">
          {entries.map(
            ([type, config]) => {
              const Icon = ICON_MAP[config.icon] || Type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    onSelect(type);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-[#B07D3A] hover:bg-[#f5f5f3] transition-colors text-center"
                >
                  <Icon size={24} />
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-gray-500">
                    {config.description}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
