import { gql } from '@apollo/client';
import { USER_FRAGMENT } from '../fragments';

export const ME_QUERY = gql`
  ${USER_FRAGMENT}
  query Me {
    me {
      ...UserFields
    }
  }
`;
