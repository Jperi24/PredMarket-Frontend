import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_PHASE_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} from "../queries";

import { deployPredMarket } from "./DeployPredMarketV2"; // Adjust path as necessary
import { ethers } from "ethers";
import { useSigner } from "@thirdweb-dev/react";
import { debounce } from "lodash"; // Import debounce from lodash

const TournamentInfo = ({ slug }) => {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [phases, setPhases] = useState([]);
  const apolloClient = useApolloClient();
  const signer = useSigner();
  const [currentPhaseSets, setCurrentPhaseSets] = useState([]);
  const [videogame, setPhaseVideoGame] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  const {
    loading: tournamentLoading,
    error: tournamentError,
    data: tournamentData,
  } = useQuery(GET_TOURNAMENT_QUERY, { variables: { slug } });

  const debouncedSearch = useCallback(
    debounce((newSearchInput) => {
      setSearchInput(newSearchInput);
    }, 300),
    []
  ); // 300ms delay

  const deployContractForSet = async (set, tournamentName) => {
    // Example of getting signer, ensure you have configured your Ethereum provider
    setIsDeploying(true);

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
    } finally {
      setIsDeploying(false); // Re-enable the button
    }
  };

  useEffect(() => {
    if (selectedEventId) fetchPhases(selectedEventId);
  }, [selectedEventId, debouncedSearch]); // Add debounced search

  useEffect(() => {
    if (selectedPhaseId) {
      setCurrentPhaseSets([]);
      fetchSetsForSelectedPhase(selectedPhaseId);
    }
  }, [selectedPhaseId, debouncedSearch]); // Add debounced search

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
    setIsLoadingSets(true); // Start loading
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

      setCurrentPhaseSets(allSets.sort((a, b) => sortSets(a, b)));
    } catch (error) {
      console.error("Failed to fetch sets for phase:", error);
    } finally {
      setIsLoadingSets(false); // End loading
    }
  };

  const getStatus = (set) => {
    const inGame = set.slots.every((slot) => slot.standing?.placement === 2);
    const hasWinner = set.slots.some((slot) => slot.standing?.placement === 1);
    const hasUnknownEntrant = set.slots.some(
      (slot) => !slot.entrant || slot.entrant.name === "Unknown"
    );

    if (inGame && !hasWinner) return "In Game";
    if (!inGame && !hasWinner && !hasUnknownEntrant) return "Pending";
    return "Other";
  };
  const sortSets = (a, b) => {
    const getStatusPriority = (status) => {
      switch (status) {
        case "Pending":
          return 1; // Highest priority
        case "In Game":
          return 2; // Second highest priority
        default:
          return 3; // Lowest priority for all other statuses
      }
    };

    const priorityA = getStatusPriority(getStatus(a));
    const priorityB = getStatusPriority(getStatus(b));

    return priorityA - priorityB; // Sorts by priority, ascending
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value.toLowerCase();
    debouncedSearch(value); // Use debounced function
  };

  function renderPhaseSets() {
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
                isDeploying={isDeploying}
              />
            ))}
        </div>
      </div>
    );
  }

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
      {isLoadingSets ? (
        <div className="spinner"></div> // Show spinner when loading sets
      ) : (
        <div className="grid-container">{renderPhaseSets()}</div>
      )}
    </div>
  );
};

const SetBox = ({
  set,
  setIndex,
  deployContractForSet,
  tournamentName,
  phaseName,
  name,
  isDeploying,
}) => {
  // Enhanced status determination logic
  const getStatus = (set) => {
    const inGame = set.slots.every((slot) => slot.standing?.placement === 2);
    const hasWinner = set.slots.some((slot) => slot.standing?.placement === 1);
    const hasUnknownEntrant = set.slots.some(
      (slot) => !slot.entrant || slot.entrant.name === "Unknown"
    );
    const winnerName =
      set.slots.find((slot) => slot.standing?.placement === 1)?.entrant.name ||
      "Unknown";

    if (inGame && !hasWinner) return "In Game";
    if (!inGame && !hasWinner && !hasUnknownEntrant) return "Pending";
    if (hasWinner) return `${winnerName} Has Won`;
    return "Other"; // Covers other statuses, such as "Waiting For Opponent"
  };

  const status = getStatus(set);
  const isPendingOrInGame = status === "Pending" || status === "In Game";

  // Styling based on status
  const setStyle = {
    border: isPendingOrInGame ? "1px solid green" : "1px solid blue",
    padding: "10px",
    marginBottom: "10px",
  };

  return (
    <div className="set-box" style={setStyle}>
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
      <p>Status: {status}</p>
      {isPendingOrInGame && (
        <button
          onClick={() => deployContractForSet(set, tournamentName, phaseName)}
          disabled={isDeploying} // Button is disabled when isDeploying is true
        >
          {isDeploying ? "Deploying..." : "Deploy Contract"}
        </button>
      )}
    </div>
  );
};

export default TournamentInfo;
