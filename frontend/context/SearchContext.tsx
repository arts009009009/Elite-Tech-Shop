"use client";
import { createContext, useState, useCallback, useContext, useMemo, useRef, useEffect } from "react";

type SearchResult = { id: number; title: string; price: number; currency: string; category: string };
type SearchContextType = {
  search: string; setSearch: (s: string) => void; liveResults: SearchResult[];
  setLiveResults: (results: SearchResult[]) => void; isSearching: boolean;
  setIsSearching: (v: boolean) => void; performSearch: (query: string) => SearchResult[];
  clearSearch: () => void; registerProducts: (products: SearchResult[]) => void;
};

export const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productsRef = useRef<SearchResult[]>([]);

  const registerProducts = useCallback((products: SearchResult[]) => { productsRef.current = products; }, []);
  const performSearch = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return productsRef.current.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 10);
  }, []);

  const clearSearch = useCallback(() => { setSearch(""); setLiveResults([]); setIsSearching(false); }, []);

  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(true);
    debounceRef.current = setTimeout(() => { setLiveResults(performSearch(query)); setIsSearching(false); }, 200);
  }, [performSearch]);

  const debouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; }, [debouncedSearch]);

  useEffect(() => {
    const fn = debouncedSearchRef.current;
    if (fn) fn(search);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const value = useMemo(() => ({ search, setSearch, liveResults, setLiveResults, isSearching, setIsSearching, performSearch, clearSearch, registerProducts }), [search, liveResults, isSearching, performSearch, clearSearch, registerProducts]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) return { search: "", setSearch: () => {}, liveResults: [], setLiveResults: () => {}, isSearching: false, setIsSearching: () => {}, performSearch: () => [], clearSearch: () => {}, registerProducts: () => {} };
  return ctx;
};
