import React, { useState, useEffect, useCallback } from "react";

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

  const signer = useSigner();
  const [currentPhaseSets, setCurrentPhaseSets] = useState([]);
  const [videogame, setPhaseVideoGame] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [tournamentData, setTournamentData] = useState("");

  const debouncedSetSearchInput = useCallback(
    debounce((newSearchInput) => {
      setSearchInput(newSearchInput);
    }, 300),
    [] // This ensures the debounced function is created only once
  );

  // Handle search input changes
  const handleSearchInputChange = (e) => {
    debouncedSetSearchInput(e.target.value); // Use the debounced function
  };

  useEffect(() => {
    async function fetchTournamentData() {
      if (slug) {
        console.log(slug, "Fetching data for slug");
        try {
          const url = `http://localhost:3001/api/tournament/${encodeURIComponent(
            slug
          )}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Failed to fetch tournament data");
          }
          const json = await response.json();
          setTournamentData(json);
          console.log(json, "this is the tourney check this out");
          setPhases(json.events[0]?.phases || []);
          setSelectedEventId(json.events[0]?.id || "");
        } catch (error) {
          console.error("Error fetching tournament data:", error);
          setTournamentData(null);
        }
      } else {
        console.log("slug not found");
      }
    }

    fetchTournamentData();
  }, [slug]);

  useEffect(() => {
    if (tournamentData && selectedEventId) {
      const selectedEvent = tournamentData.events.find(
        (e) => e.id === selectedEventId
      );

      setPhases(selectedEvent?.phases || []);
      console.log(phases, "phases");

      setSelectedPhaseId(selectedEvent?.phases?.[0]?.id || "");

      if (selectedEvent?.videogame?.name) {
        setPhaseVideoGame(selectedEvent.videogame.name);
      }
    }
  }, [selectedEventId, tournamentData]); // Use tournamentData as a dependency

  const deployContractForSet = async (set, tournamentName) => {
    // Example of getting signer, ensure you have configured your Ethereum provider
    setIsDeploying(true);

    // Ensure that tournamentData.events is an array and not undefined
    if (!Array.isArray(tournamentData.events)) {
      console.error("Expected tournamentData.events to be an array");
      return;
    }

    // Find the selected event using selectedEventId
    const selectedEvent = tournamentData.events.find(
      (event) => event.id === selectedEventId
    );

    // Check if the selected event is found
    if (!selectedEvent) {
      console.error(
        "No event found with the selectedEventId:",
        selectedEventId
      );
      return;
    }

    // Now find the phase within the selected event
    const currentPhaseObj = selectedEvent.phases.find(
      (phase) => phase.id === selectedPhaseId
    ).name;

    // Check if the phase was found
    if (!currentPhaseObj) {
      console.error("No phase found with the phaseId:", selectedPhaseId);
      return;
    }

    // Log or use the phase name
    console.log("Selected Event:", selectedEvent);
    console.log("Current Phase Object:", currentPhaseObj);

    try {
      // Example parameters, adjust as necessary for your contract
      const eventA = set.slots[0].entrant.name;
      const eventB = set.slots[1].entrant.name;
      const NameofMarket = `${tournamentData.name} - ${videogame}- ${currentPhaseObj}`;
      const fullName = set.fullRoundText;

      const tags = `${videogame},${tournamentData.name},${currentPhaseObj.name},${set.slots[0].entrant.name},${set.slots[1].entrant.name},${fullName}`;

      const encodedTags = encodeURIComponent(tags);

      const response = await fetch(
        `http://localhost:3001/check-set-deployment/${encodedTags}`
      );

      const { isDeployed } = await response.json();
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const twelveHoursInSeconds = 12 * 60 * 60; // 12 hours in seconds

      // Check if tournamentData.endAt exists and calculate the difference
      const timeDifference = tournamentData.endAt
        ? tournamentData.endAt - now
        : null;

      // Conditionally set endsAt
      const endsAt =
        !tournamentData.endAt ||
        (timeDifference && timeDifference < twelveHoursInSeconds)
          ? 43200
          : tournamentData.endAt;

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

  // useEffect(() => {
  //   if (selectedEventName) fetchPhases(selectedEventId);
  // }, [selectedEventId]); // Add debounced search

  useEffect(() => {
    if (selectedPhaseId) {
      setCurrentPhaseSets([]);
      fetchSetsForSelectedPhase(selectedPhaseId);
    }
  }, [selectedPhaseId, debouncedSetSearchInput]); // Add debounced search

  const fetchSetsForSelectedPhase = async (phaseId) => {
    setIsLoadingSets(true);
    console.log(`Fetching sets for phaseId: ${phaseId}`); // Confirm what's being sent
    try {
      const response = await fetch(
        `http://localhost:3001/api/phase-sets/${phaseId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error, status = ${response.status}`);
      }
      const json = await response.json();

      setCurrentPhaseSets(json);
    } catch (error) {
      console.error("Failed to fetch sets for phase:", error);
      alert("Failed to load sets: " + error.message);
    } finally {
      setIsLoadingSets(false);
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
  if (!tournamentData) {
    return <div>Loading tournament data...</div>;
  }

  if (!tournamentData.events || tournamentData.events.length === 0) {
    return <div>No events found for this tournament.</div>;
  }

  return (
    <div className="tournament-info">
      <div className="controls">
        <h2 style={{ color: "#0056b3" /* White text for high contrast */ }}>
          Tournament: {tournamentData?.name}
        </h2>
        <select
          onChange={(e) => setSelectedEventId(e.target.value)}
          value={selectedEventId}
        >
          <option value="">Select an event</option>
          {tournamentData.events.map((event) => (
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
