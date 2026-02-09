'use client';

import { ApolloClient, InMemoryCache, from } from '@apollo/client/core';
import { authLink, errorLink, httpLink } from './links';

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          savedItems: {
            merge(_, incoming) {
              return incoming;
            },
          },
        },
      },
      SavedItem: {
        keyFields: ['locationSurfKey'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
