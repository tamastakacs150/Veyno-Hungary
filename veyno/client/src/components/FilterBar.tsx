// client/src/components/Filterbar.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  totalProducts: number;

  search: string;
  setSearch: (value: string) => void;
  min: string;
  setMin: (value: string) => void;
  max: string;
  setMax: (value: string) => void;

  updateQuery: (patch: { q?: string | null; min?: string | null; max?: string | null }) => void;

  mobileFilterOpen: boolean;
  setMobileFilterOpen: (open: boolean) => void;

  widthPx?: number;
  noSidePadding?: boolean;
}

export default function FilterBar({
  sortBy,
  onSortChange,
  totalProducts,
  search,
  setSearch,
  min,
  setMin,
  max,
  setMax,
  updateQuery,
  mobileFilterOpen,
  setMobileFilterOpen,
  widthPx,
  noSidePadding,
}: FilterBarProps) {
  return (
    <div
      className={`filterbar${noSidePadding ? " filterbar--no-pad" : ""}`}
      style={{
        width: widthPx && widthPx > 0 ? `${Math.round(widthPx)}px` : undefined,
        margin: widthPx ? "0 auto 18px" : undefined,
      }}
    >
      {/* TOP ROW */}
      <div className="filter-top">
        <div className="filter-top-left">
          {/* Search – always visible */}
          <input
            className="f-input f-input-search focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none"
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") updateQuery({ q: search || null }); }}
            onBlur={() => updateQuery({ q: search || null })}
          />

          {/* DESKTOP only: Min/Max in one line here, next to search */}
          <div className="f-range f-range--desktop">
            <input
              className="f-input focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Min price"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              onBlur={() => updateQuery({ min: min || null })}
            />
            <span className="f-sep">—</span>
            <input
              className="f-input"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Max price"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              onBlur={() => updateQuery({ max: max || null })}
            />
          </div>
        </div>

        {/* The button is only visible on MOBILE */}
        <button
          className="btn-filters"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          aria-expanded={mobileFilterOpen}
          aria-controls="filters-panel"
        >
          {mobileFilterOpen ? "Close Filters" : "Show Filters"}
        </button>
      </div>

      {/* DROP PANEL (on mobile): 1) Min/Max, 2) Showing + Sort */}
      <div id="filters-panel" className={`filters-panel ${mobileFilterOpen ? "is-open" : ""}`}>
        {/* Line 1 – Min/Max on mobile (hidden on desktop) */}
        <div className="f-range f-range--mobile">
          <input
            className="f-input"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min price"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            onBlur={() => updateQuery({ min: min || null })}
          />
          <span className="f-sep">—</span>
          <input
            className="f-input"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max price"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            onBlur={() => updateQuery({ max: max || null })}
          />
        </div>

        {/* Line 2 – Showing + Sort by */}
        <div className="f-sort">
          <p className="f-showing">
            Showing <span className="f-showing-emph">{totalProducts}</span> products
          </p>

          <div className="f-sort-control">
            <label htmlFor="sort" className="f-sort-label">Sort by:</label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger id="sort" className="f-input f-sort-trigger !h-[40px] !px-3 !py-2 !rounded-[10px] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="!rounded-[10px]">
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
                <SelectItem value="newest">Newest arrivals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
