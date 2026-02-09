import { gql } from '@apollo/client';

export const SUBMIT_FEEDBACK_MUTATION = gql`
  mutation SubmitFeedback($input: FeedbackInput!) {
    submitFeedback(input: $input) {
      success
      data {
        id
        userId
        locationId
        surfTimestamp
        feedbackResult
        feedbackStatus
        createdAt
      }
      error
    }
  }
`;