import { gql } from '@apollo/client';

export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    userId
    username
    userLevel
    privacyConsentYn
    lastLoginDt
    createdAt
  }
`;
