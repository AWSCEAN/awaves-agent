'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import type { SurfInfo, SurferLevel } from '@/types';
import { getGradeBgColor, getGradeTextColor, getGradeBorderColor } from '@/lib/services/surfInfoService';

export interface SearchResult extends SurfInfo {
  distance?: number;
}

type SortMode = 'surfScore' | 'distance';

interface SearchResultsListProps {
  results: SearchResult[];
  isOpen: boolean;
  onClose: () => void;
  onSpotClick: (spot: SearchResult) => void;
  onSaveSpot: (spot: SearchResult) => void;
  onRemoveSpot?: (locationId: string) => void;
  savedSpotIds: Set<string>;
  selectedDate?: Date;
  selectedTime?: string;
  onSuggestByDistance?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  isWeeklyEstimate?: boolean;
  weekRange?: { start: Date; end: Date };
  onVisibleItemsChange?: (items: SearchResult[]) => void;
  showLocationPrompt?: boolean;
}

const ITEMS_PER_PAGE = 25;

export default function SearchResultsList({
  results,
  isOpen,
  onClose,
  onSpotClick,
  onSaveSpot,
  onRemoveSpot,
  savedSpotIds,
  selectedDate,
  selectedTime,
  onSuggestByDistance,
  userLocation,
  isWeeklyEstimate = false,
  weekRange,
  onVisibleItemsChange,
  showLocationPrompt = false,
}: SearchResultsListProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('surfScore');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Reset to page 1 when results change
  useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  // Sort results based on current sort mode
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortMode) {
      case 'surfScore':
        return sorted.sort((a, b) => b.derivedMetrics.surfScore - a.derivedMetrics.surfScore);
      case 'distance':
        return sorted.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      default:
        return sorted;
    }
  }, [results, sortMode]);

  const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResults = sortedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Notify parent of visible items when page or sort changes
  useEffect(() => {
    onVisibleItemsChange?.(paginatedResults);
  }, [currentPage, sortedResults, onVisibleItemsChange]);

  const getSurfScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyLabel = (difficulty: SurferLevel): string => {
    return t(`difficulty.${difficulty}`);
  };

  if (!isOpen) return null;

  const getSortLabel = (mode: SortMode): string => {
    switch (mode) {
      case 'surfScore':
        return locale === 'ko' ? '서핑 점수' : 'Surf Score';
      case 'distance':
        return locale === 'ko' ? '거리' : 'Distance';
      default:
        return '';
    }
  };

  return (
    <div className={`fixed left-0 bottom-0 w-96 bg-white shadow-xl z-40 flex flex-col transition-all duration-300 ${showLocationPrompt ? 'top-[100px]' : 'top-14'}`}>
      {/* Header */}
      <div className="p-4 border-b border-sand-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-ocean-800">{t('resultsTitle')}</h2>
            <p className="text-sm text-ocean-500">
              {tCommon('results', { count: results.length })} · {getSortLabel(sortMode)}
            </p>
            {selectedDate && !isWeeklyEstimate && (
              <p className="text-xs text-ocean-400 mt-1">
                {format(selectedDate, 'PPP', { locale: dateLocale })}
                {selectedTime && ` · ${selectedTime}`}
              </p>
            )}
            {isWeeklyEstimate && weekRange && (
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {locale === 'ko' ? '주간 예측' : 'Weekly Prediction'}
                </span>
                <span className="text-xs text-ocean-400">
                  {format(weekRange.start, 'MMM d', { locale: dateLocale })} - {format(weekRange.end, 'MMM d', { locale: dateLocale })}
                </span>
              </div>
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

        {/* Sort Filter Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSortMode('surfScore')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortMode === 'surfScore'
                ? 'bg-green-500 text-white'
                : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
            }`}
          >
            {locale === 'ko' ? '서핑 점수' : 'Surf Score'}
          </button>
          <button
            onClick={() => setSortMode('distance')}
            disabled={!userLocation}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortMode === 'distance'
                ? 'bg-blue-500 text-white'
                : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
            } ${!userLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!userLocation ? (locale === 'ko' ? '위치 권한이 필요합니다' : 'Location permission required') : ''}
          >
            {locale === 'ko' ? '거리' : 'Distance'}
          </button>
        </div>

        {/* Suggestion by Distance Button */}
        {onSuggestByDistance && (
          <button
            onClick={onSuggestByDistance}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-ocean-500 text-white
              hover:bg-ocean-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locale === 'ko' ? '내 주변 25개 스팟 추천' : 'Suggest 25 Nearby Spots'}
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-ocean-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>{tCommon('noResults')}</p>
          </div>
        ) : (
          <ul className="p-2 space-y-2">
            {paginatedResults.map((spot, index) => {
              const isSaved = savedSpotIds.has(spot.LocationId);
              const displayName = locale === 'ko' && spot.nameKo ? spot.nameKo : spot.name;

              return (
                <li
                  key={spot.LocationId}
                  className="p-3 bg-white rounded-xl border border-sand-200 hover:border-ocean-300 hover:shadow-md cursor-pointer transition-all"
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

                      {/* Scores + Grade */}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-2 bg-sand-100 rounded-lg px-2.5 py-1">
                          <div className={`w-3 h-3 rounded-full ${getSurfScoreColor(spot.derivedMetrics.surfScore)}`} />
                          <span className="text-lg font-bold text-ocean-800">
                            {Math.round(spot.derivedMetrics.surfScore)}
                          </span>
                          <span className="text-xs text-ocean-500">/100</span>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-base font-bold border ${getGradeBgColor(spot.derivedMetrics.surfGrade)} ${getGradeTextColor(spot.derivedMetrics.surfGrade)} ${getGradeBorderColor(spot.derivedMetrics.surfGrade)}`}>
                          {spot.derivedMetrics.surfGrade}
                        </span>
                      </div>

                      {/* Distance */}
                      {spot.distance !== undefined && (
                        <div className="mt-1 text-xs text-ocean-400">
                          {t('distance')}: {spot.distance} {tCommon('km')}
                        </div>
                      )}
                    </div>

                    {/* Save/Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSaved && onRemoveSpot) {
                          setConfirmDelete({ id: spot.LocationId, name: displayName });
                        } else if (!isSaved) {
                          onSaveSpot(spot);
                        }
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        isSaved
                          ? 'text-red-500 bg-red-50 hover:bg-red-100'
                          : 'text-ocean-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={isSaved ? (locale === 'ko' ? '저장 취소' : 'Remove from saved') : (locale === 'ko' ? '저장' : 'Save spot')}
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 m-4 max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-ocean-800 mb-2">
              {locale === 'ko' ? '저장 취소' : 'Remove from Saved'}
            </h3>
            <p className="text-sm text-ocean-600 mb-4">
              {locale === 'ko'
                ? `"${confirmDelete.name}"을(를) 저장 목록에서 삭제하시겠습니까?`
                : `Remove "${confirmDelete.name}" from your saved spots?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-sand-100 text-ocean-700
                  hover:bg-sand-200 transition-colors"
              >
                {locale === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (onRemoveSpot) {
                    onRemoveSpot(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white
                  hover:bg-red-600 transition-colors"
              >
                {locale === 'ko' ? '삭제' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
