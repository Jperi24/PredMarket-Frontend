import { gql } from "@apollo/client";

export const GET_TOURNAMENT_QUERY = gql`
  query TournamentQuery($slug: String) {
    tournament(slug: $slug) {
      id
      name
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

export const GET_EVENT_QUERY = gql`
  query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      id
      name
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        pageInfo {
          total
        }
        nodes {
          id
          slots {
            id
            entrant {
              id
              name
            }
          }
        }
      }
    }
  }
`;

export const GET_SET_QUERY = gql`
  query set($setId: ID!) {
    set(id: $setId) {
      id
      slots {
        id
        standing {
          id
          placement
          stats {
            score {
              label
              value
            }
          }
        }
      }
    }
  }
`;
