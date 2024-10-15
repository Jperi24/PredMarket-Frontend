import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Header from "../components/Header";
import predMarketArtifact from "../predMarketV2.json";
import { useSigner } from "@thirdweb-dev/react";
import { motion } from "framer-motion";
import { FaEthereum, FaGamepad, FaTrophy } from "react-icons/fa";

export default function MyAccount() {
  const [contracts, setContracts] = useState({
    ongoing: [],
    completed: [],
    deployed: [],
  });
  const [contractsBalances, setContractsBalances] = useState({});
  const [contractInstances, setContractInstances] = useState({});
  const [activeCategory, setActiveCategory] = useState("ongoing"); // New state to handle active category
  const signer = useSigner();
  const router = useRouter();

  const fetchContracts = async () => {
    if (!signer) return;

    try {
      const userAddress = await signer.getAddress();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/getUserContracts/${userAddress}`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const contractsData = await response.json();
      categorizeContracts(contractsData);
      console.log("Contract Data", contractsData);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [signer]);

  const navigateToMarket = (contractAddress) => {
    router.push(`/market/${contractAddress}`);
  };

  const categorizeContracts = async (contractsData) => {
    try {
      const contractInstancesTemp = {};

      // Initialize arrays for different categories
      const categorizedContracts = {
        ongoing: [],
        completed: [],
        deployed: [],
      };

      // Create contract instances and categorize contracts
      for (const contract of contractsData) {
        // Check if contract address is valid and defined before proceeding
        if (!contract.address) {
          console.warn("Skipping contract with undefined address", contract);
          continue;
        }

        try {
          // Create a new contract instance using ethers.js
          const contractInstance = new ethers.Contract(
            contract.address,
            predMarketArtifact.abi,
            signer
          );

          // Store the contract instance for later use
          contractInstancesTemp[contract.address] = contractInstance;

          // Check if the contract is completed by calling the 'winner' method
          const winner = await contractInstance.winner();
          const isCompleted = winner.toString() !== "0";

          // Check the role(s) of the user in this contract
          const userRoles = contract.role || [];

          // Add the contract to the deployed category if the user is a deployer
          if (userRoles.includes("deployer")) {
            categorizedContracts.deployed.push({ ...contract, userRoles });
          }

          // If the user is both a deployer and a better, add to multiple categories
          if (userRoles.includes("better")) {
            if (isCompleted) {
              categorizedContracts.completed.push({ ...contract, userRoles });
            } else {
              categorizedContracts.ongoing.push({ ...contract, userRoles });
            }
          }
        } catch (innerError) {
          console.error(
            `Error processing contract ${contract.address}:`,
            innerError
          );
        }
      }

      // Update the state with the categorized contracts and contract instances
      setContracts(categorizedContracts);
      setContractInstances(contractInstancesTemp);

      // Initialize contract balances after categorizing
      await initializeContractsBalances(
        categorizedContracts,
        contractInstancesTemp
      );
    } catch (error) {
      console.error("Error categorizing contracts:", error);
    }
  };

  const initializeContractsBalances = async (
    categorizedContracts,
    contractInstancesTemp
  ) => {
    const newContractsBalances = {};
    const allContracts = [
      ...categorizedContracts.ongoing,
      ...categorizedContracts.completed,
    ];

    for (const contract of allContracts) {
      const contractInstance = contractInstancesTemp[contract.address];

      try {
        const betsBalance = await contractInstance.allBets_Balance();
        const betterBalanceNew = ethers.utils.formatEther(betsBalance[5]);

        if (parseFloat(betterBalanceNew) > 0) {
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

    setContractsBalances(newContractsBalances);
  };

  const handleWithdraw = async (contractAddress) => {
    try {
      const contractInstance = contractInstances[contractAddress];
      if (!contractInstance) throw new Error("Contract instance not found");
      const tx = await contractInstance.withdraw();
      await tx.wait();
      fetchContracts();
    } catch (error) {
      console.error("Withdraw failed:", error);
    }
  };

  const handleTransferOwnerAmount = async (contractAddress) => {
    try {
      const contractInstance = contractInstances[contractAddress];
      if (!contractInstance) throw new Error("Contract instance not found");
      const tx = await contractInstance.transferOwnerAmount();
      await tx.wait();
      fetchContracts();
    } catch (error) {
      console.error("Transfer owner amount failed:", error);
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
      <motion.div
        className="page-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header />
        <div className="connect-wallet-message">
          <FaGamepad size={50} className="pulse-icon" />
          <h2>Please connect your wallet to view your account.</h2>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header />
      <h1 className="page-title">My Gaming Bets Dashboard</h1>

      <div className="bets-toggle">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={activeCategory === "ongoing" ? "active" : ""}
          onClick={() => setActiveCategory("ongoing")}
        >
          <FaGamepad /> Ongoing Bets
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={activeCategory === "completed" ? "active" : ""}
          onClick={() => setActiveCategory("completed")}
        >
          <FaTrophy /> Completed Bets
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={activeCategory === "deployed" ? "active" : ""}
          onClick={() => setActiveCategory("deployed")}
        >
          <FaTrophy /> Deployed Sets
        </motion.button>
      </div>

      <div className="grid-container">
        <BetSection
          title={
            activeCategory === "completed"
              ? "Completed Bets"
              : activeCategory === "deployed"
              ? "Deployed Sets"
              : "Ongoing Bets"
          }
          bets={contracts[activeCategory]}
          contractInstances={contractInstances}
          contractsBalances={contractsBalances}
          onWithdraw={handleWithdraw}
          onTransferOwnerAmount={handleTransferOwnerAmount}
          getImageForTag={getImageForTag}
          navigateToMarket={navigateToMarket}
        />
      </div>
    </motion.div>
  );
}

function BetSection({
  title,
  bets,
  contractInstances,
  contractsBalances,
  onWithdraw,
  onTransferOwnerAmount,
  getImageForTag,
  navigateToMarket,
}) {
  return (
    <motion.div
      className="grid-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="section-title">{title}</h2>
      <div className="grid-container-inner">
        {bets && bets.length > 0 ? (
          bets.map((contract) => (
            <motion.div
              key={contract.address}
              className="contract-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{
                border: "1px solid #ccc", // Add a border
                borderRadius: "8px", // Rounded corners
                padding: "16px", // Padding inside the card
                margin: "10px 0", // Margin between cards
                backgroundColor: "#f9f9f9", // Light background color
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
              }}
              onClick={() => navigateToMarket(contract.address)}
            >
              <img
                src={getImageForTag(contract.tags)}
                alt="Game Image"
                className="contract-image"
              />
              <h3 className="market-name">
                {contract.NameofMarket || "No Market Name"}
              </h3>
              <div className="event-names">
                <span>{contract.eventA}</span>
                <FaGamepad className="vs-icon" />
                <span>{contract.eventB}</span>
              </div>
              {contractInstances[contract.address] && (
                <>
                  {contract.userRoles.includes("better") && (
                    <WithdrawInfo
                      contractInstance={contractInstances[contract.address]}
                      onWithdraw={() => onWithdraw(contract.address)}
                    />
                  )}
                  {contract.userRoles.includes("deployer") && (
                    <CreatorLockedInfo
                      contractInstance={contractInstances[contract.address]}
                      onTransferOwnerAmount={() =>
                        onTransferOwnerAmount(contract.address)
                      }
                    />
                  )}
                </>
              )}
            </motion.div>
          ))
        ) : (
          <p className="no-bets-message">
            No bets in this category yet. Time to place some!
          </p>
        )}
      </div>
    </motion.div>
  );
}

function WithdrawInfo({ contractInstance, onWithdraw }) {
  const [withdrawableAmount, setWithdrawableAmount] = useState("0");
  const [canWithdraw, setCanWithdraw] = useState(false);

  useEffect(() => {
    async function fetchWithdrawableAmount() {
      try {
        const betsBalance = await contractInstance.allBets_Balance();
        const betterBalanceNew = ethers.utils.formatEther(betsBalance[5]);
        setWithdrawableAmount(betterBalanceNew);

        const raffleState = await contractInstance.s_raffleState();
        const endOfVoting = await contractInstance.endOfVoting();
        const currentTime = Math.floor(Date.now() / 1000);

        setCanWithdraw(
          (raffleState === 3 || // SETTLED
            (raffleState === 1 && currentTime > endOfVoting.toNumber())) && // VOTING and voting ended
            parseFloat(betterBalanceNew) > 0
        );
      } catch (error) {
        console.error("Error fetching withdrawable amount:", error);
      }
    }

    fetchWithdrawableAmount();
  }, [contractInstance]);

  return (
    <div className="withdraw-info">
      <p>
        Available to withdraw:{" "}
        <span className="amount">
          {withdrawableAmount} <FaEthereum />
        </span>
      </p>
      {canWithdraw && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onWithdraw();
          }}
        >
          Withdraw {withdrawableAmount} <FaEthereum />
        </motion.button>
      )}
    </div>
  );
}

function CreatorLockedInfo({ contractInstance, onTransferOwnerAmount }) {
  const [creatorLocked, setCreatorLocked] = useState("0");
  const [canTransfer, setCanTransfer] = useState(false);

  useEffect(() => {
    async function fetchCreatorLocked() {
      try {
        const raffleState = await contractInstance.s_raffleState();
        const endOfVoting = await contractInstance.endOfVoting();
        const currentTime = Math.floor(Date.now() / 1000);
        const winner = await contractInstance.winner();

        setCanTransfer(
          (raffleState === 1 &&
            currentTime > endOfVoting.toNumber() &&
            (winner === 1 || winner === 2)) ||
            raffleState === 3 // SETTLED
        );
      } catch (error) {
        console.error("Error fetching creator locked amount:", error);
      }
    }

    fetchCreatorLocked();
  }, [contractInstance]);

  return (
    <div className="creator-locked-info">
      {canTransfer && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onTransferOwnerAmount();
          }}
        >
          Transfer Owner Amount
        </motion.button>
      )}
    </div>
  );
}
