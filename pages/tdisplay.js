import React, { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import gql from "graphql-tag";
import TournamentInfo from "../components/tournamentInfo2";
import Header from "../components/Header";

export const GET_ALL_TOURNAMENTS_QUERY = gql`
  query ActiveTournaments {
    tournaments(
      query: {
        page: 1
        perPage: 500
        filter: {
          afterDate: 1712707200
          beforeDate: 1715299200
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

function App() {
  const [selectedTournament, setSelectedTournament] = useState(null);

  const { afterDate, beforeDate } = useMemo(() => {
    const now = Date.now();
    return {
      afterDate: new Date(now - 7 * 24 * 60 * 60 * 1000).getTime(),
      beforeDate: new Date(now + 14 * 24 * 60 * 60 * 1000).getTime(),
    };
  }, []);

  const { data, loading, error } = useQuery(GET_ALL_TOURNAMENTS_QUERY, {
    variables: { afterDate, beforeDate },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <Header />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          padding: "20px",
        }}
      >
        {data?.tournaments?.nodes.map((tournament) => (
          <div
            key={tournament.slug}
            onClick={() => setSelectedTournament(tournament.slug)}
            style={{
              cursor: "pointer",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <h3>{tournament.name}</h3>
            <p>
              Start: {new Date(tournament.startAt * 1000).toLocaleDateString()}
            </p>

            <p>End: {new Date(tournament.endAt * 1000).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      {selectedTournament && <TournamentInfo slug={selectedTournament} />}
    </div>
  );
}

export default App;
