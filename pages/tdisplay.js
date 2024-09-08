import React, { useState, useCallback, useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import gql from "graphql-tag";
import TournamentInfo from "../components/tournamentInfo2";
import Header from "../components/Header";

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
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/tournament-details`
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

  const handleTournamentClick = (tournament) => {
    // Ensure we are getting the full tournament data before setting it
    // fetchTournamentBySlug(tournament);
    setSelectedTournament(tournament);

    console.log(tournament.slug, "this is the slug");
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

  const filteredTournaments = tournaments.filter(
    (tournament) =>
      tournament.name && // Safety check
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
