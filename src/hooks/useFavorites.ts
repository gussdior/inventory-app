"use client";

import { useState, useEffect, useCallback } from "react";

const FAV_KEY = "medspa_favorites";
const DEF_KEY = "medspa_defaults";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [defaults, setDefaultsState] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const f = localStorage.getItem(FAV_KEY);
      if (f) setFavorites(new Set(JSON.parse(f)));
      const d = localStorage.getItem(DEF_KEY);
      if (d) setDefaultsState(JSON.parse(d));
    } catch {}
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const setDefault = useCallback((id: string, qty: number) => {
    setDefaultsState((prev) => {
      const next = { ...prev, [id]: qty };
      try { localStorage.setItem(DEF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const getDefault = useCallback(
    (id: string): number | null => defaults[id] ?? null,
    [defaults]
  );

  return { favorites, toggleFavorite, defaults, setDefault, getDefault };
}
