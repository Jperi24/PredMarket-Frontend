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

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch(
          "http://localhost:3001/api/tournament-details"
        );
        const data = await response.json();
        setTournaments(data);
        console.log(data);
      } catch (error) {
        console.error("Failed to fetch tournaments:", error);
      }
    };

    fetchTournaments();
  }, []);

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

  const handleTournamentClick = (slug) => {
    // Ensure we are getting the full tournament data before setting it
    // fetchTournamentBySlug(slug);
    setSelectedTournament(slug);
    console.log(slug);
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
          <TournamentInfo name={selectedTournament.name} />
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
                onClick={() => handleTournamentClick(tournament)}
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
