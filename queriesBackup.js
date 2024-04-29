import { gql } from "@apollo/client";

export const GET_ALL_TOURNAMENTS_QUERY = gql`
  query TournamentQuery($afterDate: Timestamp, $beforeDate: Timestamp) {
    tournaments(
      query: {
        filter: {
          afterDate: $afterDate
          beforeDate: $beforeDate
          isFeatured: true
        }
      }
    ) {
      nodes {
        name
        startAt
        endAt
        slug
      }
    }
  }
`;
export const GET_TOURNAMENT_QUERY = gql`
  query TournamentQuery($slug: String) {
    tournament(slug: $slug) {
      name
      endAt
      events {
        id
        name
        phases {
          id
        }
      }
    }
  }
`;

export const GET_PHASE_QUERY = gql`
  query EventSets($eventId: ID!) {
    event(id: $eventId) {
      id
      name
      videogame {
        name
      }
      phases {
        id
        name
      }
    }
  }
`;
export const GET_SETS_BY_PHASE_QUERY = gql`
  query PhaseSets($phaseId: ID!, $page: Int!, $perPage: Int!) {
    phase(id: $phaseId) {
      id
      name
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        nodes {
          fullRoundText
          id
          slots {
            id
            entrant {
              id
              name
            }
            standing {
              placement
            }
          }
        }
      }
    }
  }
`;
