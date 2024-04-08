import React, { useState, useEffect } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} from "../queries";

const TournamentInfo = ({ slug }) => {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [phaseSets, setPhaseSets] = useState([]);
  const [phases, setPhases] = useState([]);
  const {
    loading: tournamentLoading,
    error: tournamentError,
    data: tournamentData,
  } = useQuery(GET_TOURNAMENT_QUERY, {
    variables: { slug },
  });
  const client = useApolloClient();

  useEffect(() => {
    if (!selectedEventId) return;

    const fetchPhases = async () => {
      try {
        const { data: eventData } = await client.query({
          query: GET_PHASE_QUERY,
          variables: { eventId: selectedEventId },
        });
        console.log("Fetched Phases:", eventData.event.phases); // Debug: Verify fetched data
        setPhases(eventData.event.phases); // Assume these include id and name based on your query structure
      } catch (error) {
        console.error("Failed to fetch phases:", error);
      }
    };

    fetchPhases();
  }, [selectedEventId, client]);

  useEffect(() => {
    const fetchSetsForSelectedPhase = async () => {
      if (!selectedPhaseId) {
        setPhaseSets([]);
        return;
      }

      try {
        const sets = await fetchAllSetsForPhase(selectedPhaseId);
        setPhaseSets([
          {
            phaseName: phases.find((phase) => phase.id === selectedPhaseId)
              ?.name,
            sets,
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch sets for phase:", error);
      }
    };

    fetchSetsForSelectedPhase();
  }, [selectedPhaseId, client, phases]);

  const fetchAllSetsForPhase = async (phaseId) => {
    let allSets = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const { data: phaseData } = await client.query({
        query: GET_SETS_BY_PHASE_QUERY,
        variables: { phaseId, page, perPage },
      });
      console.log("Fetched Sets Data:", phaseData);

      const fetchedSets = phaseData.phase.sets.nodes;
      allSets = [...allSets, ...fetchedSets];
      hasMore = fetchedSets.length === perPage;
      page += 1;
    }

    return allSets;
  };

  const handleEventSelection = (eventId) => {
    setSelectedEventId(eventId);
    setSelectedPhaseId(null); // Reset phase selection when event changes
  };

  const handlePhaseSelection = (phaseId) => {
    setSelectedPhaseId(phaseId);
  };

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value.toLowerCase());
  };

  if (tournamentLoading) return <p>Loading...</p>;
  if (tournamentError) return <p>Error: {tournamentError.message}</p>;

  return (
    <div>
      <h2>Tournament: {tournamentData?.tournament?.name}</h2>
      <select
        onChange={(e) => handleEventSelection(e.target.value)}
        value={selectedEventId}
      >
        <option value="">Select an event</option>
        {tournamentData.tournament.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>

      {selectedEventId && (
        <select
          onChange={(e) => handlePhaseSelection(e.target.value)}
          value={selectedPhaseId || ""}
        >
          <option value="">Select a phase</option>
          {phases &&
            phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
        </select>
      )}

      <input
        type="text"
        value={searchInput}
        onChange={handleSearchInputChange}
        placeholder="Search by player name"
      />

      <div className="grid-container">
        {phaseSets.map((phase, phaseIndex) => (
          <div key={phaseIndex}>
            <h3>{phase.phaseName}</h3>
            {phase.sets
              .filter((set) =>
                set.slots.some(
                  (slot) =>
                    slot.entrant &&
                    slot.entrant.name.toLowerCase().includes(searchInput)
                )
              )
              .map((set, setIndex) => {
                const inGame = set.slots.every(
                  (slot) => slot.standing && slot.standing.placement === 2
                );
                const hasWinner = set.slots.some(
                  (slot) => slot.standing && slot.standing.placement === 1
                );
                const winningSlot = set.slots.find(
                  (slot) => slot.standing && slot.standing.placement === 1
                );
                const winnerName = winningSlot
                  ? winningSlot.entrant.name
                  : "Unknown";
                const hasUnknownEntrant = set.slots.some(
                  (slot) => !slot.entrant || slot.entrant.name === "Unknown"
                );

                return (
                  <div key={set.id} className="set-box">
                    <h4>Set {setIndex + 1}</h4>
                    <p>
                      Entrants:{" "}
                      {set.slots.map((slot, slotIndex) => (
                        <React.Fragment key={slotIndex}>
                          {slotIndex > 0 ? " vs " : ""}
                          {slot.entrant ? slot.entrant.name : "Unknown"}
                        </React.Fragment>
                      ))}
                    </p>
                    {inGame && !hasWinner && <p>Status: In game</p>}
                    {!inGame && hasWinner && <p>Status: {winnerName} Won</p>}
                    {!inGame && !hasWinner && hasUnknownEntrant && (
                      <p>Status: Waiting For Opponent</p>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentInfo;
