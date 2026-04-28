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
};

interface BlockTypePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
}

export function BlockTypePicker({
  open,
  onClose,
  onSelect,
}: BlockTypePickerProps) {
  if (!open) return null;

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
          {(Object.entries(BLOCK_TYPES) as [BlockType, (typeof BLOCK_TYPES)[BlockType]][]).map(
            ([type, config]) => {
              const Icon = ICON_MAP[config.icon] || Type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    onSelect(type);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-[#b8860b] hover:bg-[#faf8f5] transition-colors text-center"
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
