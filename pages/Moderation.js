import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Header from "../components/Header";
import predMarketArtifact from "../predMarketV2.json";
import { useSigner } from "@thirdweb-dev/react";

export default function Moderation() {
  const [moderatableContracts, setModeratableContracts] = useState([]);
  const [contractInstances, setContractInstances] = useState({});
  const signer = useSigner();

  useEffect(() => {
    if (signer) {
      fetchModeratableContracts();
    }
  }, [signer]);

  const fetchModeratableContracts = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/getContracts`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const contracts = await response.json();
      filterModeratableContracts(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const filterModeratableContracts = async (contracts) => {
    const moderatable = [];
    const instances = {};

    for (const contract of contracts) {
      const contractInstance = new ethers.Contract(
        contract.address,
        predMarketArtifact.abi,
        signer
      );
      instances[contract.address] = contractInstance;

      try {
        const raffleState = await contractInstance.s_raffleState();
        const endOfVoting = await contractInstance.endOfVoting();
        const winner = await contractInstance.winner();
        const endTime = await contractInstance.endTime();
        const currentTime = Math.floor(Date.now() / 1000);
        console.log(winner.toNumer());

        if (
          (raffleState === 1 && currentTime > endTime.toNumber()) ||
          (winner.toNumber() > 0 && currentTime < endOfVoting.toNumber())
        ) {
          moderatable.push(contract);
        }
      } catch (error) {
        console.error("Error checking contract state:", error);
      }
    }

    setModeratableContracts(moderatable);
    setContractInstances(instances);
  };

  const handleDisagree = async (contractAddress) => {
    try {
      const contractInstance = contractInstances[contractAddress];
      const creatorLocked = await contractInstance.creatorLocked();
      const tx = await contractInstance.disagreeWithOwner({
        value: creatorLocked,
      });
      await tx.wait();
      console.log("Successfully disagreed with owner");
      // Refresh the list of moderatable contracts
      fetchModeratableContracts();
    } catch (error) {
      console.error("Error disagreeing with owner:", error);
    }
  };

  return (
    <div className="page-container">
      <Header />
      <h2>Moderation Page</h2>
      <div className="contracts-list">
        {moderatableContracts.length > 0 ? (
          moderatableContracts.map((contract) => (
            <div key={contract.address} className="contract-card">
              <h3>{contract.NameofMarket || "Unnamed Market"}</h3>
              <p>
                {contract.eventA} VS {contract.eventB}
              </p>
              <p>Deployer: {contract.deployerAddress}</p>
              <button onClick={() => handleDisagree(contract.address)}>
                Disagree with Owner
              </button>
            </div>
          ))
        ) : (
          <p>No contracts available for moderation at this time.</p>
        )}
      </div>
      <style jsx>{`
        .page-container {
          padding: 20px;
        }
        .contracts-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        .contract-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
        }
        button {
          background-color: #f44336;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 5px;
          cursor: pointer;
        }
        button:hover {
          background-color: #d32f2f;
        }
      `}</style>
    </div>
  );
}
