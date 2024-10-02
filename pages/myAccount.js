import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Header from "../components/Header";
import predMarketArtifact from "../predMarketV2.json";
import { useSigner } from "@thirdweb-dev/react";
import { motion } from "framer-motion";
import { FaEthereum, FaGamepad, FaTrophy } from "react-icons/fa";

export default function MyAccount() {
  const [currentUserBets, setCurrentUserBets] = useState([]);
  const [currentDeployedBets, setCurrentDeployedBets] = useState([]);
  const [completedUserBets, setCompletedUserBets] = useState([]);
  const [completedDeployedBets, setCompletedDeployedBets] = useState([]);
  const [contractsBalances, setContractsBalances] = useState({});
  const [contractInstances, setContractInstances] = useState({});
  const [showCompletedBets, setShowCompletedBets] = useState(false);
  const signer = useSigner();
  const router = useRouter();

  useEffect(() => {
    async function fetchContracts() {
      if (!signer) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/getContracts`
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const contracts = await response.json();
        categorizeContracts(contracts);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      }
    }

    fetchContracts();
  }, [signer]);

  const categorizeContracts = async (contracts) => {
    const current = { user: [], deployed: [] };
    const completed = { user: [], deployed: [] };

    for (const contract of contracts) {
      const contractInstance = new ethers.Contract(
        contract.address,
        predMarketArtifact.abi,
        signer
      );

      const winner = await contractInstance.winner();
      const isCompleted = winner !== 0;

      if (contract.betters && contract.betters.includes(signer._address)) {
        if (isCompleted) {
          completed.user.push(contract);
        } else {
          current.user.push(contract);
        }
      }

      if (contract.deployerAddress === signer._address) {
        if (isCompleted) {
          completed.deployed.push(contract);
        } else {
          current.deployed.push(contract);
        }
      }

      setContractInstances((prev) => ({
        ...prev,
        [contract.address]: contractInstance,
      }));
    }

    setCurrentUserBets(current.user);
    setCurrentDeployedBets(current.deployed);
    setCompletedUserBets(completed.user);
    setCompletedDeployedBets(completed.deployed);

    initializeContracts([
      ...current.user,
      ...current.deployed,
      ...completed.user,
      ...completed.deployed,
    ]);
  };

  const initializeContracts = async (allContracts) => {
    const newContractsBalances = {};

    for (const contract of allContracts) {
      const contractInstance = contractInstances[contract.address];

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
      console.log(`Withdraw successful from contract: ${contractAddress}`);
      initializeContracts([
        ...currentUserBets,
        ...currentDeployedBets,
        ...completedUserBets,
        ...completedDeployedBets,
      ]);
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
      console.log(`Owner amount transferred from contract: ${contractAddress}`);
      initializeContracts([
        ...currentUserBets,
        ...currentDeployedBets,
        ...completedUserBets,
        ...completedDeployedBets,
      ]);
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
          className={!showCompletedBets ? "active" : ""}
          onClick={() => setShowCompletedBets(false)}
        >
          <FaGamepad /> Ongoing Bets
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={showCompletedBets ? "active" : ""}
          onClick={() => setShowCompletedBets(true)}
        >
          <FaTrophy /> Completed Bets
        </motion.button>
      </div>

      <div className="grid-container">
        <BetSection
          title={
            showCompletedBets
              ? "Completed Bets I've Placed"
              : "Ongoing Bets I've Placed"
          }
          bets={showCompletedBets ? completedUserBets : currentUserBets}
          contractInstances={contractInstances}
          contractsBalances={contractsBalances}
          onWithdraw={handleWithdraw}
          onTransferOwnerAmount={handleTransferOwnerAmount}
          getImageForTag={getImageForTag}
          isUserBets={true}
        />
        <BetSection
          title={
            showCompletedBets
              ? "Completed Bets I've Deployed"
              : "Ongoing Bets I've Deployed"
          }
          bets={showCompletedBets ? completedDeployedBets : currentDeployedBets}
          contractInstances={contractInstances}
          contractsBalances={contractsBalances}
          onWithdraw={handleWithdraw}
          onTransferOwnerAmount={handleTransferOwnerAmount}
          getImageForTag={getImageForTag}
          isUserBets={false}
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
  isUserBets,
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
        {bets.length > 0 ? (
          bets.map((contract) => (
            <motion.div
              key={contract.address}
              className="contract-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
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
                  {isUserBets ? (
                    <WithdrawInfo
                      contractInstance={contractInstances[contract.address]}
                      onWithdraw={() => onWithdraw(contract.address)}
                    />
                  ) : (
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
        const locked = await contractInstance.creatorLocked();
        setCreatorLocked(ethers.utils.formatEther(locked));

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
      <p>
        Creator Locked:{" "}
        <span className="amount">
          {creatorLocked} <FaEthereum />
        </span>
      </p>
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
