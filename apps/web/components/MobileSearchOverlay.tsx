'use client';

import { useRef, useCallback } from 'react';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import DatePickerInput from '@/components/DatePickerInput';
import type { SurferLevel } from '@/types';
import type { OverlayMode } from '@/components/EnhancedMapboxMap';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  // Location
  locationQuery: string;
  onLocationChange: (val: string) => void;
  onLocationSelect: (option: { id: string; name: string; type: string }) => void;
  locationPlaceholder: string;
  locationHasError: boolean;
  locationErrorPlaceholder: string;
  // Date
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  // Time
  selectedTime: string;
  onTimeChange: (time: string) => void;
  timeSlots: string[];
  isPredictionMode: boolean;
  // Level
  surferLevel: SurferLevel | '';
  onLevelChange: (level: SurferLevel | '') => void;
  levelHasError: boolean;
  // Actions
  onSearch: () => void;
  onNearby: () => void;
  userLocationAvailable: boolean;
  // Toggles
  overlayMode: OverlayMode;
  onOverlayToggle: (mode: OverlayMode) => void;
  showWindParticles: boolean;
  onWindToggle: () => void;
  // Labels
  labels: {
    allTimes: string;
    allLevels: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    search: string;
    predict: string;
    nearby: string;
    surfScore: string;
    windParticles: string;
    levelRequired: string;
    cancel: string;
  };
}

export default function MobileSearchOverlay({
  isOpen,
  onClose,
  locationQuery,
  onLocationChange,
  onLocationSelect,
  locationPlaceholder,
  locationHasError,
  locationErrorPlaceholder,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  timeSlots,
  isPredictionMode,
  surferLevel,
  onLevelChange,
  levelHasError,
  onSearch,
  onNearby,
  userLocationAvailable,
  overlayMode,
  onOverlayToggle,
  showWindParticles,
  onWindToggle,
  labels,
}: MobileSearchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && overlayRef.current) {
      overlayRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current !== null && currentYRef.current !== null) {
      const diff = currentYRef.current - startYRef.current;
      if (diff > 120) {
        onClose();
      }
    }
    if (overlayRef.current) {
      overlayRef.current.style.transform = '';
    }
    startYRef.current = null;
    currentYRef.current = null;
  }, [onClose]);

  if (!isOpen) return null;

  const handleSearch = () => {
    onSearch();
    onClose();
  };

  const handleNearby = () => {
    onNearby();
    onClose();
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[60] bg-white flex flex-col animate-slide-up transition-transform">
      {/* Header — drag handle area for swipe-to-dismiss */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-sand-200 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-sand-300 rounded-full" />
        <h2 className="text-lg font-semibold text-ocean-800 pt-2">
          {isPredictionMode ? labels.predict : labels.search}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-sand-500 hover:text-ocean-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1">Location</label>
          <LocationAutocomplete
            value={locationQuery}
            onChange={onLocationChange}
            onSelect={onLocationSelect}
            placeholder={locationPlaceholder}
            className="w-full"
            hasError={locationHasError}
            errorPlaceholder={locationErrorPlaceholder}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1">Date</label>
          <DatePickerInput
            value={selectedDate}
            onChange={onDateChange}
            className="w-full"
          />
        </div>

        {/* Time - hidden in prediction mode */}
        {!isPredictionMode && (
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1">Time</label>
            <select
              value={selectedTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800"
            >
              <option value="">{labels.allTimes}</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        )}

        {/* Surfer Level */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1">Level</label>
          <select
            value={surferLevel}
            onChange={(e) => onLevelChange(e.target.value as SurferLevel | '')}
            className={`w-full px-3 py-2 text-sm border rounded-lg
              focus:outline-none focus:ring-2 bg-white ${
                levelHasError
                  ? 'border-red-400 text-red-400 focus:ring-red-500/50'
                  : 'border-sand-200 text-ocean-800 focus:ring-ocean-500/50'
              }`}
          >
            <option value="">{levelHasError ? labels.levelRequired : labels.allLevels}</option>
            <option value="beginner">{labels.beginner}</option>
            <option value="intermediate">{labels.intermediate}</option>
            <option value="advanced">{labels.advanced}</option>
          </select>
        </div>

        {/* Toggle buttons row */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onOverlayToggle('surf')}
            className={`flex-1 min-w-[120px] px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
              overlayMode === 'surf'
                ? 'bg-green-500 text-white'
                : 'bg-sand-200 text-ocean-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {labels.surfScore}
          </button>
          <button
            onClick={onWindToggle}
            className={`flex-1 min-w-[120px] px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
              showWindParticles
                ? 'bg-ocean-500 text-white'
                : 'bg-sand-200 text-ocean-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5c1.104 0 2 .896 2 2s-.896 2-2 2H3M17 11c1.104 0 2 .896 2 2s-.896 2-2 2H3M9 17c1.104 0 2 .896 2 2s-.896 2-2 2H3" />
            </svg>
            {labels.windParticles}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="flex-shrink-0 px-4 pt-3 border-t border-sand-200 space-y-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSearch}
          className={`w-full py-3 text-white text-sm font-semibold rounded-lg transition-colors ${
            isPredictionMode
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-ocean-500 hover:bg-ocean-600'
          }`}
        >
          {isPredictionMode ? labels.predict : labels.search}
        </button>
        <button
          onClick={handleNearby}
          disabled={!userLocationAvailable}
          className={`w-full py-3 text-white text-sm font-semibold rounded-lg transition-colors ${
            userLocationAvailable
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-blue-300 cursor-not-allowed opacity-60'
          }`}
        >
          {labels.nearby}
        </button>
      </div>
    </div>
  );
}
