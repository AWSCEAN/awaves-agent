import { useState, useRef, useEffect } from 'react';
import { SPOTS } from '../data/spots';
import { useLocale } from '../contexts/LocaleContext';

interface LocationOption {
  id: string;
  name: string;
  nameKo?: string;
  type: 'spot' | 'region' | 'country';
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: LocationOption) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  errorPlaceholder?: string;
}

// Build options from SPOTS once
const ALL_OPTIONS: LocationOption[] = (() => {
  const opts: LocationOption[] = [];
  const regionSet = new Set<string>();
  const countrySet = new Set<string>();
  SPOTS.forEach(spot => {
    opts.push({ id: spot.locationId, name: spot.name, nameKo: spot.nameKo, type: 'spot' });
    if (!regionSet.has(spot.region)) {
      regionSet.add(spot.region);
      opts.push({ id: `region-${spot.region}`, name: spot.region, nameKo: spot.regionKo, type: 'region' });
    }
    if (!countrySet.has(spot.country)) {
      countrySet.add(spot.country);
      opts.push({ id: `country-${spot.country}`, name: spot.country, nameKo: spot.countryKo, type: 'country' });
    }
  });
  return opts;
})();

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search spots...',
  className = '',
  hasError = false,
  errorPlaceholder,
}: LocationAutocompleteProps) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length < 1) { setOptions([]); setIsOpen(false); return; }
    const q = value.toLowerCase();
    const filtered = ALL_OPTIONS.filter(loc => {
      const name = locale === 'ko' && loc.nameKo ? loc.nameKo : loc.name;
      return name.toLowerCase().includes(q) || loc.name.toLowerCase().includes(q)
        || (loc.nameKo && loc.nameKo.toLowerCase().includes(q));
    }).sort((a, b) => {
      const order = { country: 0, region: 1, spot: 2 };
      return order[a.type] - order[b.type];
    }).slice(0, 10);
    setOptions(filtered);
    setIsOpen(filtered.length > 0);
  }, [value, locale]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeLabel = (type: LocationOption['type']) => {
    if (type === 'spot') return '📍';
    if (type === 'region') return '🗺️';
    return '🌍';
  };

  const handleSelect = (option: LocationOption) => {
    const displayName = locale === 'ko' && option.nameKo ? option.nameKo : option.name;
    onChange(displayName);
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => value.length >= 1 && options.length > 0 && setIsOpen(true)}
        placeholder={hasError && errorPlaceholder ? errorPlaceholder : placeholder}
        className={`w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border rounded-lg truncate
          focus:outline-none focus:ring-2 bg-white text-ocean-800 ${
          hasError
            ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500 placeholder:text-red-400'
            : 'border-sand-200 focus:ring-ocean-500/50 focus:border-ocean-500 placeholder:text-ocean-400'
        }`}
      />
      {isOpen && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg
          border border-sand-200 max-h-64 overflow-y-auto overflow-x-hidden z-50">
          {options.map(option => {
            const displayName = locale === 'ko' && option.nameKo ? option.nameKo : option.name;
            const secondaryName = locale === 'ko' && option.nameKo ? option.name : option.nameKo;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="w-full px-3 py-2 text-left hover:bg-sand-50 flex items-center gap-2
                  transition-colors border-b border-sand-100 last:border-b-0"
              >
                <span className="text-sm">{getTypeLabel(option.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ocean-800 truncate">{displayName}</div>
                  {secondaryName && <div className="text-xs text-ocean-400 truncate">{secondaryName}</div>}
                </div>
                <span className="text-xs text-ocean-400 capitalize">{option.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
