'use client';

import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_SAVED_ITEMS } from '@/lib/graphql/queries';
import {
  SAVE_ITEM_MUTATION,
  DELETE_SAVED_ITEM_MUTATION,
  ACKNOWLEDGE_CHANGE_MUTATION,
  SUBMIT_FEEDBACK_MUTATION,
} from '@/lib/graphql/mutations';
import type { FeedbackStatus, SavedItemResponse } from '@/types';

// GraphQL camelCase interface
interface SavedItemGraphQL {
  userId: string;
  locationSurfKey: string;
  locationId: string;
  surfTimestamp: string;
  savedAt: string;
  departureDate?: string;
  address?: string;
  region?: string;
  country?: string;
  waveHeight?: number;
  wavePeriod?: number;
  windSpeed?: number;
  waterTemperature?: number;
  surferLevel: string;
  surfScore: number;
  surfGrade: string;
  flagChange: boolean;
  changeMessage?: string;
  feedbackStatus?: FeedbackStatus;
}

// Transform GraphQL camelCase to REST snake_case for backward compatibility
function transformToSnakeCase(item: SavedItemGraphQL): SavedItemResponse {
  return {
    user_id: item.userId,
    location_surf_key: item.locationSurfKey,
    location_id: item.locationId,
    surf_timestamp: item.surfTimestamp,
    saved_at: item.savedAt,
    departure_date: item.departureDate,
    address: item.address,
    region: item.region,
    country: item.country,
    wave_height: item.waveHeight,
    wave_period: item.wavePeriod,
    wind_speed: item.windSpeed,
    water_temperature: item.waterTemperature,
    surfer_level: item.surferLevel,
    surf_score: item.surfScore,
    surf_grade: item.surfGrade,
    flag_change: item.flagChange,
    change_message: item.changeMessage,
    feedback_status: item.feedbackStatus,
  };
}

interface SavedItemsResult {
  savedItems: {
    items: SavedItemGraphQL[];
    total: number;
  };
}

interface SaveItemResult {
  saveItem: {
    success: boolean;
    data?: SavedItemGraphQL;
    error?: string;
  };
}

interface DeleteSavedItemResult {
  deleteSavedItem: boolean;
}

interface AcknowledgeChangeResult {
  acknowledgeChange: boolean;
}

interface SubmitFeedbackResult {
  submitFeedback: {
    success: boolean;
    error?: string;
  };
}

export function useSavedItems() {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  const { data, loading, error, refetch } = useQuery<SavedItemsResult>(GET_SAVED_ITEMS, {
    fetchPolicy: 'cache-and-network',
    skip: !hasToken,
  });

  const [saveItemMutation] = useMutation<SaveItemResult>(SAVE_ITEM_MUTATION, {
    refetchQueries: [{ query: GET_SAVED_ITEMS }],
  });

  const [deleteItemMutation] = useMutation<DeleteSavedItemResult>(DELETE_SAVED_ITEM_MUTATION, {
    refetchQueries: [{ query: GET_SAVED_ITEMS }],
  });

  const [acknowledgeChangeMutation] = useMutation<AcknowledgeChangeResult>(ACKNOWLEDGE_CHANGE_MUTATION, {
    refetchQueries: [{ query: GET_SAVED_ITEMS }],
  });

  const [submitFeedbackMutation] = useMutation<SubmitFeedbackResult>(SUBMIT_FEEDBACK_MUTATION, {
    refetchQueries: [{ query: GET_SAVED_ITEMS }],
  });

  const saveItem = async (input: {
    locationId: string;
    surfTimestamp: string;
    surferLevel: string;
    surfScore: number;
    surfGrade: string;
    departureDate?: string;
    address?: string;
    region?: string;
    country?: string;
    waveHeight?: number;
    wavePeriod?: number;
    windSpeed?: number;
    waterTemperature?: number;
  }) => {
    const result = await saveItemMutation({ variables: { input } });
    return result.data?.saveItem;
  };

  const deleteItem = async (locationSurfKey: string) => {
    const result = await deleteItemMutation({
      variables: { input: { locationSurfKey } },
    });
    return result.data?.deleteSavedItem;
  };

  const acknowledgeChange = async (locationSurfKey: string) => {
    const result = await acknowledgeChangeMutation({
      variables: { input: { locationSurfKey } },
    });
    return result.data?.acknowledgeChange;
  };

  const submitFeedback = async (
    locationId: string,
    surfTimestamp: string,
    feedbackStatus: FeedbackStatus
  ) => {
    const result = await submitFeedbackMutation({
      variables: { input: { locationId, surfTimestamp, feedbackStatus } },
    });
    return result.data?.submitFeedback;
  };

  // Transform GraphQL camelCase items to snake_case for backward compatibility
  const rawItems = data?.savedItems?.items;
  const items: SavedItemResponse[] = useMemo(
    () => (rawItems || []).map(transformToSnakeCase),
    [rawItems]
  );

  return {
    items,
    total: data?.savedItems?.total || 0,
    loading,
    error,
    refetch,
    saveItem,
    deleteItem,
    acknowledgeChange,
    submitFeedback,
  };
}
