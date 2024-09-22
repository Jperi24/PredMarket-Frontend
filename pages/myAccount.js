import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";

import Header from "../components/Header";
import predMarketArtifact from "../predMarketV2.json"; // Path to ABI
import { useSigner } from "@thirdweb-dev/react";

export default function MyAccount() {
  const [allContracts, setAllContracts] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [deployedContracts, setDeployedContracts] = useState([]);
  const [contractsBalances, setContractsBalances] = useState({});
  const [contractInstances, setContractInstances] = useState({});
  const signer = useSigner();
  const router = useRouter();

  useEffect(() => {
    async function fetchContracts() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/getContracts`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const contracts = await response.json();
      setAllContracts(contracts);

      // Filter the contracts to separate user bets and deployed contracts
      const userPlacedBets = contracts.filter(
        (contract) =>
          contract.betters && contract.betters.includes(signer._address)
      );
      const deployedByUser = contracts.filter(
        (contract) => contract.deployerAddress === signer._address
      );

      setUserBets(userPlacedBets);
      setDeployedContracts(deployedByUser);

      // Initialize contracts and fetch balances
      initializeContracts(userPlacedBets, deployedByUser);
    }

    if (signer) {
      fetchContracts();
    }
  }, [signer]);
  const bigNumberToNumber = (bigNumber) => {
    return parseInt(bigNumber._hex, 16);
  };

  const initializeContracts = async (userBets, deployedContracts) => {
    const allContracts = [...userBets, ...deployedContracts];
    const newContractsBalances = {};
    const newContractInstances = {};

    for (const contract of allContracts) {
      const contractInstance = new ethers.Contract(
        contract.address,
        predMarketArtifact.abi,
        signer
      );

      // Store the contract instance for later use
      newContractInstances[contract.address] = contractInstance;

      try {
        // Fetch balance for the user
        const betsBalance = await contractInstance.allBets_Balance();

        // const betterBalanceNew = ethers.utils.formatEther(betsBalance[7]);
        const betterBalanceNew = ethers.utils.formatEther(betsBalance[5]);
        console.log(betsBalance, "winner");

        // Store balance if greater than zero
        if (
          parseFloat(betterBalanceNew) > 0 &&
          bigNumberToNumber(betsBalance[2]) != 0
        ) {
          newContractsBalances[contract.address] = betterBalanceNew;
        }
      } catch (error) {
        console.error(
          "Error fetching balance for contract",
          contract.address,
          error
        );
      }
    }

    setContractInstances(newContractInstances);
    setContractsBalances(newContractsBalances);
  };
  const navigateToMarket = (contractAddress) => {
    window.open(`/market/${contractAddress}`, "_blank");
  };

  const handleWithdraw = async (contractAddress) => {
    try {
      const contractInstance = contractInstances[contractAddress];
      if (contractInstance) {
        const tx = await contractInstance.withdraw();
        await tx.wait(); // Wait for the transaction to be confirmed
        console.log(`Withdraw successful from contract: ${contractAddress}`);
      } else {
        console.error("Contract instance not found for withdraw.");
      }
    } catch (error) {
      console.error("Withdraw failed:", error);
    }
  };

  const getImageForTag = (tags) => {
    const tagMap = {
      "Super Smash Bros. Melee": "Melee.jpg",
      "Super Smash Bros. Ultimate": "SSBUltimate.jpg",
      "TEKKEN 8": "tekken8.jpg",
      "Street Fighter 6": "streetfighter6.png",
      "Guilty Gear: Strive": "guiltygearstrive.jpg",
      Brawlhalla: "brawlhalla.jpg",
      "Rocket League": "rocketleague.jpg",
      "Pokémon Unite": "pokemonunite.jpg",
      "Counter-Strike 2": "csgo2.jpg",
      "Counter Strike: Global Offensive": "CSGO-Symbol.jpg",
      "Mortal Kombat 1": "mortalKombat1.jpg",
      "League of Legends": "League.jpg",
      Fortnite: "FortniteImg.jpg",
      "Overwatch 2": "overwatch2.jpg",
    };

    const defaultImage = "noPhotoAvail.jpg";
    const foundTag = tags.split(",").find((tag) => tagMap[tag.trim()]);
    return `${process.env.NEXT_PUBLIC_BASE_URL2}/${
      tagMap[foundTag] || defaultImage
    }`;
  };

  if (!signer) {
    return (
      <div className="page-container">
        <Header />
        <h2>Please connect your wallet to view your account.</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <h2>My Account</h2>

      <div className="grid-container">
        <div className="grid-item">
          <h3>Bets I Have Placed</h3>
          <div className="grid-container-inner">
            {userBets.length > 0 ? (
              userBets.map((contract) => (
                <div
                  key={contract.address}
                  className="contract-card"
                  onClick={() => navigateToMarket(contract.address)}
                >
                  <img
                    src={getImageForTag(contract.tags)}
                    alt="Game Image"
                    className="contract-image"
                  />
                  <p>{contract.NameofMarket || "No Market Name"}</p>
                  <div>
                    {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
                    {contract.eventB}
                  </div>
                  {contractsBalances[contract.address] && (
                    <div>
                      <p>Balance: {contractsBalances[contract.address]} ETH</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the parent onClick from firing
                          handleWithdraw(contract.address);
                        }}
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No bets placed yet.</p>
            )}
          </div>
        </div>

        <div className="grid-item">
          <h3>Bets I Have Deployed</h3>
          <div className="grid-container-inner">
            {deployedContracts.length > 0 ? (
              deployedContracts.map((contract) => (
                <div
                  key={contract.address}
                  className="contract-card"
                  onClick={() => navigateToMarket(contract.address)}
                >
                  <img
                    src={getImageForTag(contract.tags)}
                    alt="Game Image"
                    className="contract-image"
                  />
                  <p>{contract.NameofMarket || "No Market Name"}</p>
                  <div>
                    {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
                    {contract.eventB}
                  </div>
                  {contractsBalances[contract.address] && (
                    <div>
                      <p>Balance: {contractsBalances[contract.address]} ETH</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the parent onClick from firing
                          handleWithdraw(contract.address);
                        }}
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No contracts deployed yet.</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          padding: 20px;
        }

        .grid-container {
          display: flex;
          justify-content: space-between;
        }

        .grid-item {
          flex: 1;
          margin: 0 20px;
        }

        .grid-container-inner {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .contract-card {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .contract-card:hover {
          background-color: #d3d3d3; /* Light grey color on hover */
          cursor: pointer; /* Optional: Adds a pointer cursor */
        }
        /* Add this CSS to your stylesheet or style block */
        .contract-card button {
          transition: all 0.3s ease; /* Smooth transition */
          padding: 10px 15px; /* Default size */
          font-size: 16px; /* Default font size */
        }

        .contract-card button:hover {
          padding: 12px 18px; /* Larger padding when hovered */
          font-size: 18px; /* Larger font size when hovered */
          transform: scale(1.1); /* Slightly enlarge the button */
          background-color: #ffcc00; /* Optional: Change background color on hover */
          cursor: pointer; /* Show pointer cursor */
        }

        .contract-image {
          max-width: 100px;
          max-height: 100px;
          margin-bottom: 10px;
        }

        button {
          padding: 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .grid-container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
