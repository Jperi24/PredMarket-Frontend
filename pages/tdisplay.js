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

function App() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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
      console.log(allTournaments);
    } catch (error) {
      console.error("Failed to fetch tournaments:", error);
    }
  }, [apolloClient]);

  useEffect(() => {
    fetchAllTournaments();
  }, [fetchAllTournaments]);

  const handleTournamentClick = (slug) => {
    setSelectedTournament(slug);
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
          <TournamentInfo slug={selectedTournament} />
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
