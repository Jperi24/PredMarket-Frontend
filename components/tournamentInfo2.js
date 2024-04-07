import React, { useState, useEffect } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} from "../queries";

const TournamentInfo = ({ slug }) => {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [phaseSets, setPhaseSets] = useState([]);
  const {
    loading: tournamentLoading,
    error: tournamentError,
    data: tournamentData,
  } = useQuery(GET_TOURNAMENT_QUERY, {
    variables: { slug },
  });
  const client = useApolloClient();

  // Load phases and sets for a selected event
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchPhasesAndSets = async () => {
      try {
        // Fetch phases of the event excluding the first phase
        const { data: eventData } = await client.query({
          query: GET_PHASE_QUERY,
          variables: { eventId: selectedEventId },
        });
        const phases = eventData.event.phases.slice(1); // Exclude the first phase

        for (const phase of phases) {
          const { data: phaseData } = await client.query({
            query: GET_SETS_BY_PHASE_QUERY,
            variables: { phaseId: phase.id },
          });

          // Append sets data with phase information
          const setsWithPhaseInfo = phaseData.phase.sets.nodes.map((set) => ({
            ...set,
            phaseName: phaseData.phase.name, // Example of incorporating phase info
          }));

          setPhaseSets((prev) => [...prev, ...setsWithPhaseInfo]);
        }
      } catch (error) {
        console.error("Failed to fetch phases and sets:", error);
      }
    };

    fetchPhasesAndSets();
  }, [selectedEventId, client]);

  const handleEventSelection = (eventId) => {
    setSelectedEventId(eventId);
    setPhaseSets([]); // Clear previous sets
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
      <div className="sets-grid">
        {phaseSets.map((set, index) => (
          <div key={set.id} className="set-box">
            <h4>
              Set {index + 1} - Phase: {set.phaseName}
            </h4>
            <p>
              Entrants and Placement:{" "}
              {set.slots.map((slot, slotIndex) => (
                <React.Fragment key={slotIndex}>
                  {slotIndex > 0 ? " vs " : ""}
                  {slot.entrant ? slot.entrant.name : "Unknown"}
                  {slot.standing && slot.standing.placement
                    ? ` (Placement: ${slot.standing.placement})`
                    : ""}
                </React.Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentInfo;
