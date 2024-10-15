// mockData.js

const GET_FEATURED_TOURNAMENTS_RESPONSE = {
  tournaments: {
    nodes: [
      {
        name: "Test Tournament",
        startAt: 1620000000, // Example timestamps
        endAt: 1625000000,
        slug: "test-tournament",
      },
    ],
  },
};

const GET_ALL_TOURNAMENTS_RESPONSE = {
  tournaments: {
    pageInfo: {
      total: 1,
    },
    nodes: [
      {
        name: "Non-Featured Tournament",
        startAt: 1621000000,
        endAt: 1626000000,
        slug: "non-featured-tournament",
        numAttendees: 60,
      },
    ],
  },
};

const GET_TOURNAMENT_DETAILS_RESPONSE = {
  tournament: {
    slug: "test-tournament",
    id: "tournament-123",
    name: "Test Tournament",
    images: [{ url: "http://example.com/image.jpg" }],
    startAt: 1620000000,
    endAt: 1625000000,
    events: [
      {
        videogame: { name: "Test Game" },
        id: "event-456",
        name: "Test Event",
        phases: [
          {
            id: "phase-789",
            name: "Test Phase",
          },
        ],
      },
    ],
  },
};

// Initial set data where the set is ongoing (both entrants have placement 2)
const GET_SETS_BY_PHASE_RESPONSE_INITIAL = {
  phase: {
    id: "phase-789",
    name: "Test Phase",
    sets: {
      nodes: [
        {
          fullRoundText: "Round 1",
          id: "set-101112",
          slots: [
            {
              id: "slot-1",
              entrant: { id: "entrant-1", name: "Player A" },
              standing: { placement: 2 },
            },
            {
              id: "slot-2",
              entrant: { id: "entrant-2", name: "Player B" },
              standing: { placement: 2 },
            },
          ],
        },
        // Add more sets as needed
      ],
    },
  },
};

// Updated set data where the set has a winner (one entrant has placement 1)
const GET_SETS_BY_PHASE_RESPONSE_UPDATED = {
  phase: {
    id: "phase-789",
    name: "Test Phase",
    sets: {
      nodes: [
        {
          fullRoundText: "Round 1",
          id: "set-101112",
          slots: [
            {
              id: "slot-1",
              entrant: { id: "entrant-1", name: "Player A" },
              standing: { placement: 1 },
            },
            {
              id: "slot-2",
              entrant: { id: "entrant-2", name: "Player B" },
              standing: { placement: 2 },
            },
          ],
        },
        // Add more sets as needed
      ],
    },
  },
};

// Updated set data where entrants have switched
const GET_SETS_BY_PHASE_RESPONSE_ENTRANTS_SWITCHED = {
  phase: {
    id: "phase-789",
    name: "Test Phase",
    sets: {
      nodes: [
        {
          fullRoundText: "Round 1",
          id: "set-101112",
          slots: [
            {
              id: "slot-1",
              entrant: { id: "entrant-3", name: "Player C" },
              standing: { placement: 2 },
            },
            {
              id: "slot-2",
              entrant: { id: "entrant-4", name: "Player D" },
              standing: { placement: 2 },
            },
          ],
        },
        // Add more sets as needed
      ],
    },
  },
};

module.exports = {
  GET_FEATURED_TOURNAMENTS_RESPONSE,
  GET_ALL_TOURNAMENTS_RESPONSE,
  GET_TOURNAMENT_DETAILS_RESPONSE,
  GET_SETS_BY_PHASE_RESPONSE_INITIAL,
  GET_SETS_BY_PHASE_RESPONSE_UPDATED,
  GET_SETS_BY_PHASE_RESPONSE_ENTRANTS_SWITCHED,
};
