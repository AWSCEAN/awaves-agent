import { gql } from '@apollo/client';
import { SAVED_ITEM_FRAGMENT } from '../fragments';

export const GET_SAVED_ITEMS = gql`
  ${SAVED_ITEM_FRAGMENT}
  query GetSavedItems {
    savedItems {
      items {
        ...SavedItemFields
      }
      total
    }
  }
`;

export const GET_SAVED_ITEM = gql`
  ${SAVED_ITEM_FRAGMENT}
  query GetSavedItem($locationId: String!, $surfTimestamp: String!) {
    savedItem(locationId: $locationId, surfTimestamp: $surfTimestamp) {
      ...SavedItemFields
    }
  }
`;
