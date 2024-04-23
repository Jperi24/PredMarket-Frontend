import React, { useState, useCallback, useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import gql from "graphql-tag";
import TournamentInfo from "../components/tournamentInfo2";
import Header from "../components/Header";

export const GET_ALL_TOURNAMENTS_QUERY = gql`
  query ActiveTournaments(
    $afterDate: Timestamp
    $beforeDate: Timestamp
    $page: Int
    $perPage: Int
  ) {
    tournaments(
      query: {
        filter: {
          afterDate: $afterDate
          beforeDate: $beforeDate
          isFeatured: true
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

export const GET_TOURNAMENT_BY_SLUG_QUERY = gql`
  query TournamentBySlug($slug: String!) {
    tournament(slug: $slug) {
      name
      startAt
      endAt
      slug
    }
  }
`;

function App() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const apolloClient = useApolloClient();

  const fetchAllTournaments = useCallback(async () => {
    try {
      let allTournaments = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const { data } = await apolloClient.query({
          query: GET_ALL_TOURNAMENTS_QUERY,
          variables: {
            afterDate: Math.floor(
              new Date(Date.now() - 45 * 24 * 3600 * 1000).getTime() / 1000
            ),
            beforeDate: Math.floor(
              new Date(Date.now() + 45 * 24 * 3600 * 1000).getTime() / 1000
            ),
            page,
            perPage,
          },
        });
        allTournaments = [...allTournaments, ...data.tournaments.nodes];
        hasMore = data.tournaments.nodes.length === perPage;
        page += 1;
      }

      setTournaments(allTournaments);
    } catch (error) {
      console.error("Failed to fetch tournaments:", error);
    }
  }, [apolloClient]);

  const fetchTournamentBySlug = useCallback(
    async (slug) => {
      try {
        const { data } = await apolloClient.query({
          query: GET_TOURNAMENT_BY_SLUG_QUERY,
          variables: { slug },
        });
        if (data.tournament) {
          setSelectedTournament(data.tournament); // Set the entire tournament object
        } else {
          alert("Tournament not found.");
          setSelectedTournament(null);
        }
      } catch (error) {
        console.error("Error fetching tournament by slug:", error);
        alert("Tournament not found.");
      }
    },
    [apolloClient]
  );

  const handleSlugSubmit = () => {
    fetchTournamentBySlug(slugInput);
    setSlugInput(""); // Clear the input after submission
  };

  const handleSlugInputChange = (event) => {
    setSlugInput(event.target.value);
  };

  useEffect(() => {
    fetchAllTournaments();
  }, [fetchAllTournaments]);

  const handleTournamentClick = (slug) => {
    // Ensure we are getting the full tournament data before setting it
    fetchTournamentBySlug(slug);
  };

  const resetSelection = () => {
    setSelectedTournament(null);
    setSearchTerm("");
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setSelectedTournament(null);
  };

  if (tournaments.length === 0) return <p>Loading tournaments...</p>;

  const filteredTournaments = tournaments.filter((tournament) =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header />
      {selectedTournament ? (
        <>
          <button
            onClick={resetSelection}
            style={{ margin: "20px", padding: "10px" }}
          >
            Show All Tournaments
          </button>
          <TournamentInfo slug={selectedTournament.slug} />
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search tournaments by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ margin: "20px", padding: "10px", width: "300px" }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                padding: "10px",
                border: "1px solid #ccc",
              }}
            >
              <input
                type="text"
                placeholder="Enter tournament slug..."
                value={slugInput}
                onChange={handleSlugInputChange}
                style={{ margin: "10px", padding: "5px", width: "90%" }}
              />
              <button onClick={handleSlugSubmit} style={{ padding: "5px" }}>
                Load Tournament
              </button>
            </div>
            {filteredTournaments.map((tournament, index) => (
              <div
                key={`${tournament.slug}-${index}`}
                onClick={() => handleTournamentClick(tournament.slug)}
                style={{
                  cursor: "pointer",
                  padding: "10px",
                  border: "1px solid #ccc",
                }}
              >
                <h3>{tournament.name}</h3>
                <p>
                  Start:{" "}
                  {new Date(tournament.startAt * 1000).toLocaleDateString()}
                </p>
                <p>
                  End: {new Date(tournament.endAt * 1000).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
