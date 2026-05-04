"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SavedColorsContextValue {
  colors: string[];
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
}

const SavedColorsContext = createContext<SavedColorsContextValue>({
  colors: [],
  addColor: () => {},
  removeColor: () => {},
});

export function useSavedColors() {
  return useContext(SavedColorsContext);
}

export function SavedColorsProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/saved-colors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.colors)) {
          setColors(data.colors);
        }
      })
      .catch(console.error);
  }, []);

  const persist = useCallback((updated: string[]) => {
    fetch("/api/admin/saved-colors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colors: updated }),
    }).catch(console.error);
  }, []);

  const addColor = useCallback(
    (color: string) => {
      const normalized = color.toLowerCase();
      setColors((prev) => {
        if (prev.includes(normalized)) return prev;
        const updated = [...prev, normalized];
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const removeColor = useCallback(
    (color: string) => {
      const normalized = color.toLowerCase();
      setColors((prev) => {
        const updated = prev.filter((c) => c !== normalized);
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  return (
    <SavedColorsContext.Provider value={{ colors, addColor, removeColor }}>
      {children}
    </SavedColorsContext.Provider>
  );
}
