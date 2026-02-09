import { gql } from '@apollo/client';
import { SAVED_ITEM_FRAGMENT } from '../fragments';

export const SAVE_ITEM_MUTATION = gql`
  ${SAVED_ITEM_FRAGMENT}
  mutation SaveItem($input: SaveItemInput!) {
    saveItem(input: $input) {
      success
      data {
        ...SavedItemFields
      }
      error
    }
  }
`;

export const DELETE_SAVED_ITEM_MUTATION = gql`
  mutation DeleteSavedItem($input: DeleteSavedItemInput!) {
    deleteSavedItem(input: $input)
  }
`;

export const ACKNOWLEDGE_CHANGE_MUTATION = gql`
  mutation AcknowledgeChange($input: AcknowledgeChangeInput!) {
    acknowledgeChange(input: $input)
  }
`;