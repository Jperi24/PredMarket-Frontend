import React, { useState, useEffect } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} from "../queries";

const TournamentInfo = ({ slug }) => {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [phaseSets, setPhaseSets] = useState([]);
  const [phases, setPhases] = useState([]);
  const apolloClient = useApolloClient();

  const {
    loading: tournamentLoading,
    error: tournamentError,
    data: tournamentData,
  } = useQuery(GET_TOURNAMENT_QUERY, { variables: { slug } });

  useEffect(() => {
    if (selectedEventId) fetchPhases(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedPhaseId) fetchSetsForSelectedPhase(selectedPhaseId);
  }, [selectedPhaseId]);

  const fetchPhases = async (eventId) => {
    try {
      const { data: eventData } = await apolloClient.query({
        query: GET_PHASE_QUERY,
        variables: { eventId },
      });
      setPhases(eventData.event.phases);
    } catch (error) {
      console.error("Failed to fetch phases:", error);
    }
  };

  const fetchSetsForSelectedPhase = async (phaseId) => {
    try {
      let allSets = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const { data: phaseData } = await apolloClient.query({
          query: GET_SETS_BY_PHASE_QUERY,
          variables: { phaseId, page, perPage },
        });
        allSets = [...allSets, ...phaseData.phase.sets.nodes];
        hasMore = phaseData.phase.sets.nodes.length === perPage;
        page += 1;
      }

      setPhaseSets([
        {
          phaseName: phases.find((phase) => phase.id === phaseId)?.name,
          sets: allSets,
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch sets for phase:", error);
    }
  };

  const handleSearchInputChange = (e) =>
    setSearchInput(e.target.value.toLowerCase());

  if (tournamentLoading) return <p>Loading...</p>;
  if (tournamentError) return <p>Error: {tournamentError.message}</p>;

  return (
    <div className="tournament-info">
      <h2>Tournament: {tournamentData?.tournament?.name}</h2>
      <div className="controls">
        <select
          onChange={(e) => setSelectedEventId(e.target.value)}
          value={selectedEventId}
        >
          <option value="">Select an event</option>
          {tournamentData.tournament.events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => setSelectedPhaseId(e.target.value)}
          value={selectedPhaseId}
        >
          <option value="">Select a phase</option>
          {phases.map((phase) => (
            <option key={phase.id} value={phase.id}>
              {phase.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Search by player name"
        />
      </div>
      <div className="grid-container">{renderPhaseSets()}</div>
    </div>
  );

  function renderPhaseSets() {
    return phaseSets.map((phase, phaseIndex) => (
      <div key={phaseIndex} className="phase">
        <h3>{phase.phaseName}</h3>
        {phase.sets
          .filter((set) =>
            set.slots.some((slot) =>
              slot.entrant?.name.toLowerCase().includes(searchInput)
            )
          )
          .map((set, setIndex) => (
            <SetBox key={set.id} set={set} setIndex={setIndex} />
          ))}
      </div>
    ));
  }
};

const SetBox = ({ set, setIndex }) => {
  const inGame = set.slots.every((slot) => slot.standing?.placement === 2);
  const hasWinner = set.slots.some((slot) => slot.standing?.placement === 1);
  const winningSlot = set.slots.find((slot) => slot.standing?.placement === 1);
  const winnerName = winningSlot ? winningSlot.entrant.name : "Unknown";
  const hasUnknownEntrant = set.slots.some(
    (slot) => !slot.entrant || slot.entrant.name === "Unknown"
  );

  return (
    <div className="set-box">
      <h4>Set {setIndex + 1}</h4>
      <p>
        Entrants:{" "}
        {set.slots
          .map(
            (slot, index) =>
              `${index > 0 ? " vs " : ""}${slot.entrant?.name || "Unknown"}`
          )
          .join("")}
      </p>
      <p>
        Status:{" "}
        {inGame && !hasWinner
          ? "In game"
          : hasWinner
          ? `${winnerName} Won`
          : hasUnknownEntrant
          ? "Waiting For Opponent"
          : "Pending"}
      </p>
    </div>
  );
};

export default TournamentInfo;
