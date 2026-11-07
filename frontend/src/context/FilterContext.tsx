import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { StudentFilters } from "@/types";

interface FilterContextValue {
  filters: StudentFilters;
  setFilter: <K extends keyof StudentFilters>(key: K, value: StudentFilters[K]) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: StudentFilters = {};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_FILTERS);

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setFilter: (key, val) =>
        setFilters((prev) => ({ ...prev, [key]: val === "" || val === undefined ? undefined : val })),
      resetFilters: () => setFilters(DEFAULT_FILTERS),
    }),
    [filters]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
