import React, { useState, useEffect } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} from "../queries";

import { deployPredMarket } from "./DeployPredMarketV2"; // Adjust path as necessary
import { ethers } from "ethers";
import { useSigner } from "@thirdweb-dev/react";

const TournamentInfo = ({ slug }) => {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [phases, setPhases] = useState([]);
  const apolloClient = useApolloClient();
  const signer = useSigner();
  const [currentPhaseSets, setCurrentPhaseSets] = useState([]);
  const [videogame, setPhaseVideoGame] = useState("");

  const {
    loading: tournamentLoading,
    error: tournamentError,
    data: tournamentData,
  } = useQuery(GET_TOURNAMENT_QUERY, { variables: { slug } });

  const deployContractForSet = async (set, tournamentName) => {
    // Example of getting signer, ensure you have configured your Ethereum provider

    const currentPhaseObj = phases.find(
      (phase) => phase.id.toString() === selectedPhaseId
    )?.name;

    console.log(videogame, "name of videogame");

    // Ensure currentPhaseObj is not undefined before accessing .name

    try {
      // Example parameters, adjust as necessary for your contract
      const eventA = set.slots[0].entrant.name;
      const eventB = set.slots[1].entrant.name;
      const NameofMarket = `${tournamentName} - ${currentPhaseObj}`;
      const fullName = set.fullRoundText;
      const tags = `${videogame},${tournamentName},${currentPhaseObj},${set.slots[0].entrant.name},${set.slots[1].entrant.name},${fullName}`;

      const encodedTags = encodeURIComponent(tags);

      const response = await fetch(
        `http://localhost:3001/check-set-deployment/${encodedTags}`
      );

      const { isDeployed } = await response.json();
      const endsAt = tournamentData.tournament.endAt
        ? tournamentData.tournament.endAt
        : 86400;

      if (!isDeployed) {
        const contractAddress = await deployPredMarket(
          eventA,
          eventB,
          tags,
          NameofMarket,
          signer,
          fullName,
          endsAt
        );
      } else {
        alert("Contract Already Deployed");
      }

      // Here, you could update your local state to include the contractAddress for this set
      // And also send this information to your backend for persistence
    } catch (error) {
      console.error("Failed to deploy contract:", error);
    }
  };

  useEffect(() => {
    if (selectedEventId) fetchPhases(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedPhaseId) {
      // Clear existing sets before fetching new ones
      setCurrentPhaseSets([]);
      fetchSetsForSelectedPhase(selectedPhaseId);
    }
  }, [selectedPhaseId]);

  const fetchPhases = async (eventId) => {
    try {
      const { data: eventData } = await apolloClient.query({
        query: GET_PHASE_QUERY,
        variables: { eventId },
      });
      setPhases(eventData.event.phases);
      setPhaseVideoGame(eventData.event.videogame.name);
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

      setCurrentPhaseSets(allSets); // Set current sets for the phase
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
      <div className="controls">
        <h2 style={{ color: "#0056b3" /* White text for high contrast */ }}>
          Tournament: {tournamentData?.tournament?.name}
        </h2>
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
          <option value="">Select a Phase</option>
          {phases.map(
            (phase, index) =>
              index >= 0 && ( // Only render options for index greater than 0
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              )
          )}
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
    console.log(currentPhaseSets);
    return (
      <div className="phase">
        <div className="grid-container">
          {currentPhaseSets
            .filter((set) =>
              set.slots.some((slot) =>
                slot.entrant?.name.toLowerCase().includes(searchInput)
              )
            )
            .map((set, setIndex) => (
              <SetBox
                key={`${set.id}-${setIndex}`}
                set={set}
                setIndex={setIndex}
                deployContractForSet={deployContractForSet}
                tournamentName={tournamentData?.tournament?.name}
                phaseName={phases.find((p) => p.id === selectedPhaseId)?.name}
                name={set.fullRoundText}
              />
            ))}
        </div>
      </div>
    );
  }
};

const SetBox = ({
  set,
  setIndex,
  deployContractForSet,
  tournamentName,
  phaseName,
  name,
}) => {
  const inGame = set.slots.every((slot) => slot.standing?.placement === 2);
  const hasWinner = set.slots.some((slot) => slot.standing?.placement === 1);
  const winningSlot = set.slots.find((slot) => slot.standing?.placement === 1);
  const winnerName = winningSlot ? winningSlot.entrant.name : "Unknown";
  const hasUnknownEntrant = set.slots.some(
    (slot) => !slot.entrant || slot.entrant.name === "Unknown"
  );
  const handleDeploy = () => {
    deployContractForSet(set, tournamentName, phaseName);
  };

  return (
    <div className="set-box">
      <h4>{name}</h4>
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

      <button onClick={handleDeploy}>Deploy Contract</button>
    </div>
  );
};

export default TournamentInfo;
