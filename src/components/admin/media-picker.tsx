"use client";

import { useState, useEffect } from "react";
import { X, Upload, Search, ImageIcon, Film } from "lucide-react";

interface Media {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
  accept?: "image" | "video" | "all";
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  accept = "all",
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"browse" | "upload">("browse");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.resolve().then(() => setLoading(true));
    const typeParam = accept === "all" ? "" : accept;
    fetch(
      `/api/admin/media?page=${page}&pageSize=24&search=${encodeURIComponent(
        search
      )}&type=${typeParam}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setMedia(data.media || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, search, accept]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const uploaded = await res.json();
        onSelect(uploaded);
        onClose();
      }
    } catch {
      // Upload failed
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-4 px-6 py-3 border-b">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("browse")}
              className={`px-3 py-1.5 text-sm rounded ${
                tab === "browse"
                  ? "bg-[#1A2640] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setTab("upload")}
              className={`px-3 py-1.5 text-sm rounded ${
                tab === "upload"
                  ? "bg-[#1A2640] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Upload
            </button>
          </div>
          {tab === "browse" && (
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search media..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "upload" ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Upload size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">
                Click to upload or drag and drop
              </p>
              <label className="px-6 py-2 bg-[#B07D3A] text-white rounded-lg cursor-pointer hover:bg-[#7A5520] transition-colors">
                {uploading ? "Uploading..." : "Choose File"}
                <input
                  type="file"
                  accept={
                    accept === "image"
                      ? "image/*"
                      : accept === "video"
                      ? "video/*"
                      : "image/*,video/*"
                  }
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                Images: max 10MB | Videos: max 100MB
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-[#B07D3A] border-t-transparent rounded-full" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ImageIcon size={48} className="mb-2" />
              <p>No media found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {media.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#B07D3A] transition-colors bg-gray-100"
                  >
                    {item.mimeType.startsWith("video/") ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Film size={24} className="text-white/60" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.filePath}
                        alt={item.alt || item.fileName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">
                        {item.fileName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm rounded border disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm rounded border disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
