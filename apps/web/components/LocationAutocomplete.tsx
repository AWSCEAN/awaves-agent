'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { surfService } from '@/lib/apiServices';

interface LocationOption {
  id: string;
  name: string;
  nameKo?: string;
  type: 'spot' | 'region' | 'country';
  searchText?: string; // additional searchable fields (address, region, country, LocationId)
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

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className = '',
  hasError = false,
  errorPlaceholder,
}: LocationAutocompleteProps) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [allLocations, setAllLocations] = useState<LocationOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all spots (unpaginated) from BE on mount to build autocomplete options
  useEffect(() => {
    let cancelled = false;
    surfService.getAllSpots().then((response) => {
      if (cancelled || !response.success || !response.data) return;
      const spots = response.data;
      const locations: LocationOption[] = [];
      const regionSet = new Set<string>();
      const countrySet = new Set<string>();

      spots.forEach((spot) => {
        locations.push({
          id: spot.LocationId,
          // Fallback to address or LocationId so the option always has a display name
          name: spot.name || spot.address || spot.LocationId,
          nameKo: spot.nameKo || spot.addressKo,
          type: 'spot',
          // Extra text searched against but not displayed
          searchText: [spot.address, spot.region, spot.country, spot.LocationId].filter(Boolean).join(' '),
        });
        if (spot.region && !regionSet.has(spot.region)) {
          regionSet.add(spot.region);
          locations.push({ id: `region-${spot.region}`, name: spot.region, nameKo: spot.regionKo, type: 'region' });
        }
        if (spot.country && !countrySet.has(spot.country)) {
          countrySet.add(spot.country);
          locations.push({ id: `country-${spot.country}`, name: spot.country, nameKo: spot.countryKo, type: 'country' });
        }
      });

      setAllLocations(locations);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (value.length < 1) {
      setOptions([]);
      setIsOpen(false);
      return;
    }

    const lowerValue = value.toLowerCase();
    const filtered = allLocations.filter((loc) => {
      const name = locale === 'ko' && loc.nameKo ? loc.nameKo : loc.name;
      return (
        name.toLowerCase().includes(lowerValue) ||
        loc.name.toLowerCase().includes(lowerValue) ||
        (loc.nameKo && loc.nameKo.toLowerCase().includes(lowerValue)) ||
        (loc.searchText && loc.searchText.toLowerCase().includes(lowerValue))
      );
    });

    // Sort by type: countries first, then regions, then spots
    // so broad categories are always visible within the 10-result limit
    const sorted = filtered.sort((a, b) => {
      const typeOrder = { country: 0, region: 1, spot: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    setOptions(sorted.slice(0, 10)); // Limit to 10 results
    setIsOpen(sorted.length > 0);
  }, [value, locale, allLocations]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeLabel = (type: LocationOption['type']): string => {
    switch (type) {
      case 'spot':
        return '📍';
      case 'region':
        return '🗺️';
      case 'country':
        return '🌍';
    }
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
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 1 && options.length > 0 && setIsOpen(true)}
        placeholder={hasError && errorPlaceholder ? errorPlaceholder : (placeholder || t('locationPlaceholder'))}
        className={`w-full px-3 py-2 text-sm border rounded-lg truncate
          focus:outline-none focus:ring-2 bg-white text-ocean-800 ${
            hasError
              ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500 placeholder:text-red-400'
              : 'border-sand-200 focus:ring-ocean-500/50 focus:border-ocean-500 placeholder:text-ocean-400'
          }`}
      />

      {isOpen && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg
          border border-sand-200 max-h-64 overflow-y-auto overflow-x-hidden z-50">
          {options.map((option) => {
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
                  <div className="text-sm font-medium text-ocean-800 truncate">
                    {displayName}
                  </div>
                  {secondaryName && (
                    <div className="text-xs text-ocean-400 truncate">
                      {secondaryName}
                    </div>
                  )}
                </div>
                <span className="text-xs text-ocean-400 capitalize">
                  {option.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
