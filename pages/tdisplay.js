import React from "react";
import TournamentInfo from "../components/tournamentInfo2"; // Adjust the import path as necessary

function App() {
  const tournamentSlug = "battle-of-bc-6-7"; // Replace this with your actual tournament slug

  return (
    <div>
      <h1>Tournament Information</h1>
      <TournamentInfo slug={tournamentSlug} />
    </div>
  );
}

export default App;
