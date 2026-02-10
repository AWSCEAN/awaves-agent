'use client';

import { HttpLink } from '@apollo/client/link/http';
import { ErrorLink } from '@apollo/client/link/error';
import { ApolloLink } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { CombinedGraphQLErrors } from '@apollo/client/errors';

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

// Token refresh logic for GraphQL operations
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }

    const data = await response.json();
    if (data.result === 'success' && data.data) {
      localStorage.setItem('accessToken', data.data.access_token);
      if (data.data.refresh_token) {
        localStorage.setItem('refreshToken', data.data.refresh_token);
      }
      return true;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }
}

function synchronizedTokenRefresh(): Promise<boolean> {
  if (isRefreshing) return refreshPromise!;

  isRefreshing = true;
  refreshPromise = attemptTokenRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

export const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) return;

  const hasAuthError = error.errors.some(
    (err) => err.message === 'Not authenticated'
  );

  if (!hasAuthError) return;

  // Return an Observable that refreshes the token and retries
  return new Observable((observer) => {
    synchronizedTokenRefresh()
      .then((refreshed) => {
        if (!refreshed) {
          observer.error(error);
          return;
        }

        // Update the operation headers with the new token
        const newToken = localStorage.getItem('accessToken');
        operation.setContext({
          headers: {
            authorization: newToken ? `Bearer ${newToken}` : '',
          },
        });

        // Retry the operation
        forward(operation).subscribe(observer);
      })
      .catch((refreshErr: unknown) => {
        observer.error(refreshErr);
      });
  });
});
