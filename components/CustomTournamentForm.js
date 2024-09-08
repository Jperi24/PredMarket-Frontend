// CustomTournamentForm.jsx

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
    participants: [],
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const signerResult = useSigner(); // Get the result from useSigner
  const signer = signerResult?.signer || null; // Safely access signer

  const handleCustomInputChange = (e) => {
    const { name, value } = e.target;
    setCustomTournamentData((prevData) => ({ ...prevData, [name]: value }));
  };

  const deployContractForSet = async (tournamentData) => {
    if (!signer) {
      alert("Wallet is not connected.");
      return;
    }

    setIsDeploying(true);

    try {
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
        setModalContent(
          `<p>You are about to deploy a Bet that involves <strong>${eventA}</strong> and <strong>${eventB}</strong> on chain: <strong>${signer.provider.network.name}</strong>.</p>`
        );
        setModalAction(() => async () => {
          setModalContent(
            `<p>Before deploying a set, you are required to lock up a specified number of tokens from your current chain. Please enter the number of tokens you wish to lock up:</p>
            <input type="number" id="tokenAmountInput" placeholder="0" />`
          );
          setModalAction(() => async () => {
            const tokenAmount =
              document.getElementById("tokenAmountInput").value;
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
        });
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

  const handleFormSubmit = () => {
    if (!signer) {
      alert("Please connect your wallet first.");
      return;
    }
    console.log("Custom Tournament Data:", customTournamentData);
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
      {!signer ? (
        <h4>Connect With MetaMask</h4>
      ) : (
        <>
          <h3>Create Custom Tournament</h3>
          <input
            type="text"
            name="name"
            placeholder="Tournament Name"
            value={customTournamentData.name}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          {/* Dropdown for selecting the videogame */}
          <select
            name="videogame"
            value={customTournamentData.videogame}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          >
            <option value="">Select Videogame</option>
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
          {/* Calendar input for start and end date */}
          <input
            type="datetime-local"
            name="startAt"
            placeholder="Start Date"
            value={customTournamentData.startAt}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          <input
            type="datetime-local"
            name="endAt"
            placeholder="End Date"
            value={customTournamentData.endAt}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          />
          {/* Dropdown for selecting the phase */}
          <select
            name="phase"
            value={customTournamentData.phase}
            onChange={handleCustomInputChange}
            style={{ margin: "10px 0", padding: "5px", width: "100%" }}
          >
            <option value="">Select Phase</option>
            <option value="Winners Top 16">Winners Top 16</option>
            <option value="Losers Top 32">Losers Top 32</option>
            {/* Add more phases as necessary */}
          </select>
          {/* Add more fields as needed */}
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
      {showModal && (
        <Modal
          content={modalContent}
          onClose={() => setShowModal(false)}
          action={modalAction}
        />
      )}
    </div>
  );
};

export default CustomTournamentForm;
