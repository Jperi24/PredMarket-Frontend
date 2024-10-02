import React, { useState } from "react";
import { deployPredMarket } from "./DeployPredMarketV2"; // Adjust path as necessary
import { ethers } from "ethers";
import { useSigner } from "@thirdweb-dev/react"; // Import wallet hooks
import Modal from "./Modal"; // Assuming you have a Modal component for displaying messages

const CustomTournamentForm = ({ onSubmit }) => {
  const [customTournamentData, setCustomTournamentData] = useState({
    name: "",
    videogame: "",
    phase: "",
    startAt: "",
    endAt: "",
    participants: ["", ""], // Initialize with empty participants
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const signer = useSigner();
  const [isCustomVideogame, setIsCustomVideogame] = useState(false);

  const handleCustomInputChange = (e) => {
    const { name, value } = e.target;
    setCustomTournamentData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleVideogameChange = (e) => {
    const { value } = e.target;
    if (value === "Other") {
      setIsCustomVideogame(true);
      setCustomTournamentData((prevData) => ({ ...prevData, videogame: "" }));
    } else {
      setIsCustomVideogame(false);
      setCustomTournamentData((prevData) => ({
        ...prevData,
        videogame: value,
      }));
    }
  };

  const handleParticipantChange = (index, value) => {
    setCustomTournamentData((prevData) => {
      const updatedParticipants = [...prevData.participants];
      updatedParticipants[index] = value;
      return { ...prevData, participants: updatedParticipants };
    });
  };

  const validateForm = () => {
    const { name, videogame, phase, startAt, endAt, participants } =
      customTournamentData;

    // Check if all fields are filled
    if (!name) {
      alert("Please fill in the 'Name' field.");
      return false;
    }
    if (!videogame) {
      alert("Please fill in the 'Videogame' field.");
      return false;
    }
    if (!phase) {
      alert("Please fill in the 'Phase' field.");
      return false;
    }
    if (!startAt) {
      alert("Please fill in the 'Start At' field.");
      return false;
    }
    if (!endAt) {
      alert("Please fill in the 'End At' field.");
      return false;
    }
    if (participants.some((p) => !p)) {
      alert("Please fill in all 'Participants' fields.");
      return false;
    }

    // Check if 'startAt' is a future date

    // Check if 'endAt' is after 'startAt'
    if (endAt < startAt) {
      alert("End date must be after or equal to the start date.");
      return false;
    }

    return true;
  };

  const deployContractForSet = async (tournamentData) => {
    if (!validateForm()) {
      return; // Stop execution if the form is not valid
    }

    setIsDeploying(true);
    console.log("Deploying contract for set...");

    try {
      if (!signer) {
        alert("Wallet is not connected.");
        setIsDeploying(false);
        return;
      }

      const eventA = tournamentData.participants[0];
      const eventB = tournamentData.participants[1];
      const NameofMarket = `${tournamentData.name} - ${tournamentData.videogame} - ${tournamentData.phase}`;
      const fullName = `${eventA} vs ${eventB} - ${tournamentData.name} - ${tournamentData.videogame} - ${tournamentData.phase}`;

      const tags = `${tournamentData.videogame},${tournamentData.name},${tournamentData.phase},${eventA},${eventB}`;
      const encodedTags = encodeURIComponent(tags);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/check-set-deployment/${encodedTags}`
      );

      const { isDeployed } = await response.json();

      const now = Math.floor(Date.now() / 1000);
      const twelveHoursInSeconds = 12 * 60 * 60;
      const timeDifference = tournamentData.endAt
        ? tournamentData.endAt - now
        : null;

      const endsAt =
        !tournamentData.endAt ||
        (timeDifference && timeDifference < twelveHoursInSeconds)
          ? now + 43200
          : tournamentData.endAt;

      const chainId = signer?.provider?.network?.chainId;

      if (!isDeployed && chainId) {
        console.log("Setting modal content and action");
        setModalContent(
          `<p>You are about to deploy a Bet that involves <strong>${eventA}</strong> and <strong>${eventB}</strong> on chain: <strong>${signer.provider.network.name}</strong>.</p>`
        );
        setModalAction(() =>
          handleDeployContract(
            eventA,
            eventB,
            tags,
            NameofMarket,
            fullName,
            endsAt
          )
        );
        console.log("Showing modal...");
        setShowModal(true);
      } else {
        alert("Contract Already Deployed Or Wallet Not Connected");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeployContract =
    (eventA, eventB, tags, NameofMarket, fullName, endsAt) => async () => {
      setModalContent(
        `<p>Before deploying a set, you are required to lock up a specified number of tokens from your current chain. Please enter the number of tokens you wish to lock up:</p>
      <input type="number" id="tokenAmountInput" placeholder="0" />`
      );

      setModalAction(() => async () => {
        const tokenAmount = document.getElementById("tokenAmountInput").value;
        const tokenAmountNumber = parseFloat(tokenAmount);
        if (!isNaN(tokenAmountNumber) && tokenAmountNumber > 0) {
          const tokenAmountInWei = ethers.utils.parseEther(
            tokenAmount.toString()
          );
          try {
            const contractAddress = await deployPredMarket(
              eventA,
              eventB,
              tags,
              NameofMarket,
              signer,
              fullName,
              endsAt,
              tokenAmountInWei
            );
            alert(`Contract deployed at ${contractAddress}`);
          } catch (deployError) {
            console.error("Failed to deploy contract:", deployError);
            alert("Failed to complete the transaction. Please try again.");
          }
        } else {
          alert("Invalid token amount entered.");
        }
        setShowModal(false);
      });

      setShowModal(true);
    };

  const handleFormSubmit = () => {
    deployContractForSet(customTournamentData);
  };

  return (
    <div
      style={{
        cursor: "pointer",
        padding: "10px",
        border: "1px solid #ccc",
      }}
    >
      {false ? (
        <h4>Connect Wallet</h4>
      ) : (
        <>
          {showModal && (
            <Modal
              show={showModal}
              handleClose={() => setShowModal(false)}
              handleConfirm={modalAction}
              content={modalContent}
            />
          )}

          <h3>Create Custom Tournament</h3>
          <input
            type="text"
            name="name"
            placeholder="Tournament Name"
            maxLength={100}
            value={customTournamentData.name}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          {/* Dropdown for selecting the videogame */}
          <select
            name="videogame"
            value={isCustomVideogame ? "Other" : customTournamentData.videogame}
            onChange={handleVideogameChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          >
            <option value="">Select Videogame</option>
            <option value="Other">Other</option>
            <option value="Super Smash Bros. Melee">
              Super Smash Bros. Melee
            </option>
            <option value="Super Smash Bros. Ultimate">
              Super Smash Bros. Ultimate
            </option>
            <option value="TEKKEN 8">TEKKEN 8</option>
            <option value="Street Fighter 6">Street Fighter 6</option>
            <option value="Guilty Gear: Strive">Guilty Gear: Strive</option>
            <option value="Brawlhalla">Brawlhalla</option>
            <option value="Rocket League">Rocket League</option>
            <option value="Pokémon Unite">Pokémon Unite</option>
            <option value="Counter-Strike 2">Counter-Strike 2</option>
            <option value="Counter Strike: Global Offensive">
              Counter Strike: Global Offensive
            </option>
            <option value="Mortal Kombat 1">Mortal Kombat 1</option>
            <option value="League of Legends">League of Legends</option>
            <option value="Fortnite">Fortnite</option>
            <option value="Overwatch 2">Overwatch 2</option>
          </select>

          {/* Conditional input field for "Other" option */}
          {isCustomVideogame && (
            <input
              type="text"
              name="videogame"
              placeholder="Enter custom videogame"
              maxLength={100}
              value={customTournamentData.videogame}
              onChange={handleCustomInputChange}
              style={{ margin: "10px 0", padding: "5px", width: "100%" }}
            />
          )}
          {/* Input fields for two participants */}
          <input
            type="text"
            name="participant1"
            placeholder="Enter Participant 1"
            maxLength={100}
            value={customTournamentData.participants[0]}
            onChange={(e) => handleParticipantChange(0, e.target.value)}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          <input
            type="text"
            name="participant2"
            placeholder="Enter Participant 2"
            maxLength={100}
            value={customTournamentData.participants[1]}
            onChange={(e) => handleParticipantChange(1, e.target.value)}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          {/* Container for calendar inputs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "10px 0",
            }}
          >
            {/* Calendar input for start date */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginRight: "10px",
              }}
            >
              <label
                htmlFor="startAt"
                style={{ marginBottom: "4px", fontSize: "12px" }}
              >
                Start Date:
              </label>
              <input
                type="date"
                id="startAt"
                name="startAt"
                value={
                  customTournamentData.startAt
                    ? new Date(customTournamentData.startAt * 1000)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const timestamp = new Date(e.target.value).getTime() / 1000; // Convert to seconds since the epoch
                  handleCustomInputChange({
                    target: { name: "startAt", value: timestamp },
                  });
                }}
                style={{ padding: "3px", width: "120px" }} // Adjusted width for compact size
              />
            </div>

            {/* Calendar input for end date */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <label
                htmlFor="endAt"
                style={{ marginBottom: "4px", fontSize: "12px" }}
              >
                End Date:
              </label>
              <input
                type="date"
                id="endAt"
                name="endAt"
                value={
                  customTournamentData.endAt
                    ? new Date(customTournamentData.endAt * 1000)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const timestamp = new Date(e.target.value).getTime() / 1000; // Convert to seconds since the epoch
                  handleCustomInputChange({
                    target: { name: "endAt", value: timestamp },
                  });
                }}
                style={{ padding: "3px", width: "120px" }} // Adjusted width for compact size
              />
            </div>
          </div>

          {/* Container for phase and Winners/Losers inputs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "10px 0",
            }}
          >
            {/* Input for selecting Winners/Losers */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginRight: "10px",
              }}
            >
              <label
                htmlFor="phaseType"
                style={{ marginBottom: "4px", fontSize: "12px" }}
              >
                Phase Type:
              </label>
              <select
                name="phaseType"
                id="phaseType"
                value={customTournamentData.phaseType || ""}
                onChange={(e) =>
                  handleCustomInputChange({
                    target: { name: "phaseType", value: e.target.value },
                  })
                }
                style={{ padding: "3px", width: "140px" }} // Adjusted width for compact size
              >
                <option value="" disabled>
                  Select Winners or Losers
                </option>
                <option value="Winners">Winners</option>
                <option value="Losers">Losers</option>
              </select>
            </div>

            {/* Input for selecting or entering Phase */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <label
                htmlFor="phase"
                style={{ marginBottom: "4px", fontSize: "12px" }}
              >
                Phase:
              </label>
              <input
                type="text"
                name="phase"
                id="phase"
                placeholder="Enter Phase"
                maxLength={100}
                value={customTournamentData.phase || ""}
                onChange={handleCustomInputChange}
                list="phases"
                style={{ padding: "3px", width: "140px" }} // Adjusted width for compact size
              />
              <datalist id="phases">
                <option value="Pools" />
                <option value="Top 128" />
                <option value="Top 64" />
                <option value="Top 32" />
                <option value="Top 16" />
                <option value="Top 8" />
                {/* Users can still enter a custom phase if needed */}
              </datalist>
            </div>
          </div>

          {!isDeploying ? (
            <button
              onClick={handleFormSubmit}
              style={{ marginTop: "10px", padding: "10px", width: "100%" }}
              disabled={isDeploying}
            >
              Deploy Custom Set
            </button>
          ) : (
            <div>Deploying Set...</div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomTournamentForm;
