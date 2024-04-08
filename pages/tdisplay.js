import React from "react";
import TournamentInfo from "../components/tournamentInfo"; // Adjust the import path as necessary

function App() {
  const tournamentSlug = "trial-of-baldr-north-america-moose-wars"; // Replace this with your actual tournament slug

  return (
    <div>
      <h1>Tournament Information</h1>
      <TournamentInfo slug={tournamentSlug} />
    </div>
  );
}

export default App;
