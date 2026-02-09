'use client';

import { HttpLink } from '@apollo/client/link/http';
import { ErrorLink } from '@apollo/client/link/error';
import { ApolloLink } from '@apollo/client/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
});

export const authLink = new ApolloLink((operation, forward) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')
    : null;

  operation.setContext({
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
  });

  return forward(operation);
});

export const errorLink = new ErrorLink(({ error }) => {
  console.error(`[GraphQL/Network error]: ${error.message}`);

  // Handle authentication errors
  if (error.message === 'Not authenticated') {
    console.warn('Authentication required');
  }
});
