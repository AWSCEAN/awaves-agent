import { gql } from '@apollo/client';

export const SAVED_ITEM_FRAGMENT = gql`
  fragment SavedItemFields on SavedItem {
    userId
    locationSurfKey
    locationId
    surfTimestamp
    savedAt
    departureDate
    address
    region
    country
    waveHeight
    wavePeriod
    windSpeed
    waterTemperature
    surferLevel
    surfScore
    surfGrade
    flagChange
    changeMessage
    feedbackStatus
  }
`;