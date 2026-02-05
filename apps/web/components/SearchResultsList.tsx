'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import type { SurfSpot, SurferLevel } from '@/types';

interface SearchResult extends SurfSpot {
  surfScore: number;
  safetyScore: number;
  distance?: number;
}

interface SearchResultsListProps {
  results: SearchResult[];
  isOpen: boolean;
  onClose: () => void;
  onSpotClick: (spot: SearchResult) => void;
  onSaveSpot: (spot: SearchResult) => void;
  savedSpotIds: Set<string>;
  selectedDate?: Date;
  selectedTime?: string;
}

const ITEMS_PER_PAGE = 25;

export default function SearchResultsList({
  results,
  isOpen,
  onClose,
  onSpotClick,
  onSaveSpot,
  savedSpotIds,
  selectedDate,
  selectedTime,
}: SearchResultsListProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getSurfScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSafetyScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDifficultyLabel = (difficulty: SurferLevel): string => {
    return t(`difficulty.${difficulty}`);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-0 bottom-0 w-96 bg-white shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sand-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ocean-800">{t('resultsTitle')}</h2>
          <p className="text-sm text-ocean-500">
            {tCommon('results', { count: results.length })} · {t('sortedBy')}
          </p>
          {selectedDate && (
            <p className="text-xs text-ocean-400 mt-1">
              {format(selectedDate, 'PPP', { locale: dateLocale })}
              {selectedTime && ` · ${selectedTime}`}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-sand-100 rounded-lg transition-colors"
          aria-label={tCommon('close')}
        >
          <svg className="w-5 h-5 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-ocean-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>{tCommon('noResults')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-sand-100">
            {paginatedResults.map((spot, index) => {
              const isSaved = savedSpotIds.has(spot.id);
              const displayName = locale === 'ko' && spot.nameKo ? spot.nameKo : spot.name;

              return (
                <li
                  key={spot.id}
                  className="p-4 hover:bg-sand-50 cursor-pointer transition-colors"
                  onClick={() => onSpotClick(spot)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Rank and Name */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-ocean-400">
                          #{startIndex + index + 1}
                        </span>
                        <h3 className="font-medium text-ocean-800 truncate">{displayName}</h3>
                      </div>

                      {/* Location and Level */}
                      <div className="flex items-center gap-2 text-xs text-ocean-500 mb-2">
                        <span>{spot.region}, {spot.country}</span>
                        <span className="px-1.5 py-0.5 bg-sand-100 rounded text-ocean-600">
                          {getDifficultyLabel(spot.difficulty)}
                        </span>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${getSurfScoreColor(spot.surfScore)}`} />
                          <span className="text-sm font-medium text-ocean-700">
                            Surf {spot.surfScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${getSafetyScoreColor(spot.safetyScore)}`} />
                          <span className="text-sm text-ocean-600">
                            Safety {spot.safetyScore}
                          </span>
                        </div>
                      </div>

                      {/* Distance */}
                      {spot.distance !== undefined && (
                        <div className="mt-1 text-xs text-ocean-400">
                          {t('distance')}: {spot.distance} {tCommon('km')}
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSaved) {
                          onSaveSpot(spot);
                        }
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        isSaved
                          ? 'text-coral-500 bg-coral-50'
                          : 'text-ocean-400 hover:text-coral-500 hover:bg-coral-50'
                      }`}
                      disabled={isSaved}
                      title={isSaved ? 'Saved' : 'Save spot'}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={isSaved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-sand-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-sand-100 text-ocean-700
              hover:bg-sand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-ocean-600">
            {t('page')} {currentPage} {t('of')} {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-sand-100 text-ocean-700
              hover:bg-sand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
