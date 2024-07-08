const { gql } = require("@apollo/client");

const GET_FEATURED_TOURNAMENTS_QUERY = gql`
  query FeaturedTournamentsQuery(
    $afterDate: Timestamp
    $beforeDate: Timestamp
    $page: Int
    $perPage: Int
  ) {
    tournaments(
      query: {
        filter: {
          isFeatured: true
          afterDate: $afterDate
          beforeDate: $beforeDate
        }
        page: $page
        perPage: $perPage
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

const GET_ALL_TOURNAMENTS_QUERY = gql`
  query TournamentQuery(
    $todayDate: Timestamp
    $tomorrowDate: Timestamp
    $page: Int
    $perPage: Int
  ) {
    tournaments(
      query: {
        filter: { afterDate: $todayDate, beforeDate: $tomorrowDate }
        page: $page
        perPage: $perPage
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

const GET_TOURNAMENT_QUERY = gql`
  query GetTournamentDetails($slug: String!) {
    tournament(slug: $slug) {
      slug
      id
      name
      startAt
      endAt
      events {
        videogame {
          name
        }
        id
        name
        phases {
          id
          name
        }
      }
    }
  }
`;

const GET_PHASE_QUERY = gql`
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

const GET_SETS_BY_PHASE_QUERY = gql`
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

// Using module.exports to export all queries
module.exports = {
  GET_ALL_TOURNAMENTS_QUERY,
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
  GET_FEATURED_TOURNAMENTS_QUERY,
};
