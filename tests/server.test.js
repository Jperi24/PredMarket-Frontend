// server.test.js
process.env.NODE_ENV = "test";

const { print, getOperationAST } = require("graphql");

jest.mock("../apollo-client", () => {
  return {
    query: jest.fn(),
  };
});

const apolloClient = require("../apollo-client");

const serverModule = require("../server"); // Adjust the path if needed

const {
  fetchAllTournamentDetails,
  updateFrequentCache,
  dailyCache,
  frequentCache,
  setStatuses,
  updateMongoDBWithWinner,
} = serverModule;

const {
  GET_FEATURED_TOURNAMENTS_QUERY,
  GET_ALL_TOURNAMENTS_QUERY,
  GET_TOURNAMENT_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} = require("../queries"); // Adjust the path if needed

const {
  GET_FEATURED_TOURNAMENTS_RESPONSE,
  GET_ALL_TOURNAMENTS_RESPONSE,
  GET_TOURNAMENT_DETAILS_RESPONSE,
  GET_SETS_BY_PHASE_RESPONSE_INITIAL,
  GET_SETS_BY_PHASE_RESPONSE_UPDATED,
  GET_SETS_BY_PHASE_RESPONSE_ENTRANTS_SWITCHED,
} = require("../mockData");

// Mock the sleep function to avoid actual delays
jest.spyOn(serverModule, "sleep").mockImplementation(() => Promise.resolve());

// Mock Date.now()
jest.spyOn(Date, "now").mockImplementation(() => 1622500000000);

// Mock the cron jobs to prevent them from running during tests
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

// Mock console.log and console.error to suppress logs during tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// Use fake timers to handle any intervals or timeouts
jest.useFakeTimers();

// Mock fetch to prevent real network requests during tests
jest.mock("cross-fetch", () =>
  jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  )
);

describe("Server Functions", () => {
  beforeEach(() => {
    // Clear caches and mocks before each test
    dailyCache.flushAll();
    frequentCache.flushAll();
    setStatuses.clear();
    jest.clearAllMocks();

    // Define the mock implementation here

    apolloClient.query.mockImplementation(({ query, variables }) => {
      // Extract the operation name directly from the query definitions
      let operationName = null;
      if (
        query &&
        query.definitions &&
        query.definitions[0] &&
        query.definitions[0].name
      ) {
        operationName = query.definitions[0].name.value;
      }

      console.log("Operation name:", operationName);

      if (operationName === "FeaturedTournamentsQuery") {
        return Promise.resolve({ data: GET_FEATURED_TOURNAMENTS_RESPONSE });
      } else if (operationName === "TournamentQuery") {
        return Promise.resolve({ data: GET_ALL_TOURNAMENTS_RESPONSE });
      } else if (operationName === "GetTournamentDetails") {
        return Promise.resolve({ data: GET_TOURNAMENT_DETAILS_RESPONSE });
      } else if (operationName === "PhaseSets") {
        return Promise.resolve({ data: GET_SETS_BY_PHASE_RESPONSE_INITIAL });
      }
      return Promise.reject(new Error("Unknown query"));
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("fetchAllTournamentDetails should fetch and cache tournaments", async () => {
    // Call the function
    await fetchAllTournamentDetails();

    // Assertions
    expect(apolloClient.query).toHaveBeenCalled();
    expect(dailyCache.get("test-tournament")).toEqual(
      GET_TOURNAMENT_DETAILS_RESPONSE.tournament
    );
    expect(frequentCache.get("phase-789")).toEqual(
      GET_SETS_BY_PHASE_RESPONSE_INITIAL.phase.sets.nodes
    );

    // Verify initial setStatuses
    const setKey = "test-tournament-event-456-set-101112";
    expect(setStatuses.get(setKey)).toEqual({
      status: "ongoing",
      winner: null,
    });
  }, 300000); // Increase timeout if necessary

  test("updateFrequentCache correctly updates set statuses when data changes", async () => {
    // Prepare the dailyCache with a tournament
    dailyCache.set("test-tournament", {
      slug: "test-tournament",
      startAt: 1620000000,
      endAt: 1625000000,
      events: GET_TOURNAMENT_DETAILS_RESPONSE.tournament.events,
    });

    // Mock apolloClient.query for updateFrequentCache
    apolloClient.query.mockImplementation(({ query, variables }) => {
      let operationName = null;
      if (
        query &&
        query.definitions &&
        query.definitions[0] &&
        query.definitions[0].name
      ) {
        operationName = query.definitions[0].name.value;
      }

      if (operationName === "GetTournamentDetails") {
        return Promise.resolve({ data: GET_TOURNAMENT_DETAILS_RESPONSE });
      } else if (operationName === "PhaseSets") {
        return Promise.resolve({ data: GET_SETS_BY_PHASE_RESPONSE_UPDATED });
      }
      return Promise.reject(new Error("Unknown query"));
    });

    // Mock updateMongoDBWithWinner to avoid actual DB operations
    const updateMongoDBWithWinnerMock = jest
      .spyOn(serverModule, "updateMongoDBWithWinner")
      .mockImplementation(() => Promise.resolve());

    // Call the function
    await updateFrequentCache();

    // Assertions
    expect(apolloClient.query).toHaveBeenCalled();
    const setKey = "test-tournament-event-456-set-101112";
    expect(setStatuses.get(setKey)).toEqual({
      status: "completed",
      winner: "Player A",
    });
    expect(updateMongoDBWithWinnerMock).toHaveBeenCalledWith(
      setKey,
      "Player A"
    );
  });

  test("updateFrequentCache correctly updates set statuses when entrants change", async () => {
    // Prepare the dailyCache with a tournament
    dailyCache.set("test-tournament", {
      slug: "test-tournament",
      startAt: 1620000000,
      endAt: 1625000000,
      events: GET_TOURNAMENT_DETAILS_RESPONSE.tournament.events,
    });

    // Mock apolloClient.query for updateFrequentCache
    apolloClient.query.mockImplementation(({ query, variables }) => {
      let operationName = null;
      if (
        query &&
        query.definitions &&
        query.definitions[0] &&
        query.definitions[0].name
      ) {
        operationName = query.definitions[0].name.value;
      }

      if (operationName === "GetTournamentDetails") {
        return Promise.resolve({ data: GET_TOURNAMENT_DETAILS_RESPONSE });
      } else if (operationName === "PhaseSets") {
        return Promise.resolve({
          data: GET_SETS_BY_PHASE_RESPONSE_ENTRANTS_SWITCHED,
        });
      }
      return Promise.reject(new Error("Unknown query"));
    });

    // Call the function
    await updateFrequentCache();

    // Assertions
    expect(apolloClient.query).toHaveBeenCalled();
    const setKey = "test-tournament-event-456-set-101112";
    expect(setStatuses.get(setKey)).toEqual({
      status: "ongoing",
      winner: null,
    });

    // Verify that the entrants have changed
    const cachedSets = frequentCache.get("phase-789");
    const updatedSet = cachedSets.find((s) => s.id === "set-101112");
    expect(updatedSet.slots[0].entrant.name).toBe("Player C");
    expect(updatedSet.slots[1].entrant.name).toBe("Player D");
  });
});
