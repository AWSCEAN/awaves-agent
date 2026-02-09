import { gql } from '@apollo/client';
import { USER_FRAGMENT } from '../fragments';

export const LOGIN_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      data {
        tokens {
          accessToken
          refreshToken
          tokenType
          expiresIn
        }
        user {
          ...UserFields
        }
      }
      error
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      success
      data {
        tokens {
          accessToken
          refreshToken
          expiresIn
        }
      }
      error
    }
  }
`;

export const REGISTER_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      success
      data {
        tokens {
          accessToken
          refreshToken
          expiresIn
        }
        user {
          ...UserFields
        }
      }
      error
    }
  }
`;
