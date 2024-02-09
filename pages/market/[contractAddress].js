import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import predMarketArtifact from "../../predMarket.json"; // Assuming correct path to the ABI and Bytecode

import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";
import Header from "../../components/Header";
import { getContractDetails, getContracts } from "../../data/contractStore";
import { useSigner } from "@thirdweb-dev/react";
import styles from "../../styles/[contractAddress].module.css";

const MarketInteractionPage = () => {
  // const [provider, setProvider] = useState(null);
  // const [signer, setSigner] = useState(null);

  const [contract, setContract] = useState(null);
  const [betsOnPotsAB, setBetsOnPots] = useState("");
  const [contractInstance, setContractInstance] = useState(null);

  const [reduction, setReduction] = useState("");
  const [bettor, setBettor] = useState(null);
  const router = useRouter();
  const [ABDraw, setABDraw] = useState(null);
  const [owner, setOwner] = useState(null);
  const { contractAddress } = router.query;
  const [betA, setBetA] = useState("");
  const [betB, setBetB] = useState("");
  const signer = useSigner();

  const [calculatedRewardRiskA, setCalculatedRewardRiskA] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
  });
  const [calculatedRewardRiskB, setCalculatedRewardRiskB] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
  });
  const [statusOfMarket, setStatusOfMarket] = useState(null);

  const fetchContractDetails = async (address) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/contracts/${address}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching contract details:", error);
      return null;
    }
  };

  useEffect(() => {
    const getDetails = async () => {
      if (contractAddress) {
        const contractData = await fetchContractDetails(contractAddress);
        setContract(contractData);
      }
    };
    getDetails();
  }, [contractAddress]);

  useEffect(() => {
    const deployContract = async () => {
      if (typeof window.ethereum !== "undefined") {
        // await window.ethereum.request({ method: "eth_requestAccounts" });
        // const tempProvider = new ethers.providers.JsonRpcProvider(
        //   "http://localhost:8545"
        // );
        // await window.ethereum.request({ method: "eth_requestAccounts" });

        // // Create a provider that wraps around MetaMask's provider
        // const provider = new ethers.providers.Web3Provider(window.ethereum);

        // // Get the signer corresponding to the currently selected account in MetaMask
        // const signer2 = provider.getSigner();
        // setProvider(provider);
        // // const tempSigner = tempProvider.getSigner();
        // setSigner(signer2);

        const tempContractInstance = new ethers.Contract(
          contractAddress,
          predMarketArtifact.abi,
          signer
        );
        setContractInstance(tempContractInstance);
      }
    };

    if (contractAddress) {
      deployContract();
    }
  }, [contractAddress, signer]);

  const findBettor = async () => {
    if (contractInstance) {
      try {
        const bettorStatus = await contractInstance.betterInfo();
        // Assuming bettorStatus returns a tuple of two 'better' objects
        const formattedBettorStatus = {
          betterA: bettorStatus[0],
          betterB: bettorStatus[1],
        };
        setBettor(formattedBettorStatus);
        const betsOnPots = await contractInstance.viewPots();
        const formattedBets = {
          BetA: betsOnPots[0],
          BetB: betsOnPots[1],
        };
        setBetsOnPots(formattedBets);
        const sstatusOfMarket = await contractInstance.getRaffleState();
        setStatusOfMarket(sstatusOfMarket);
        console.log(sstatusOfMarket);
      } catch (error) {
        console.error("Error finding bettor:", error);
      }
    }
  };

  useEffect(() => {
    findBettor();
    // Function to handle account changes
    const handleAccountsChanged = (accounts) => {
      // You can add additional logic here if needed
      findBettor();
      setIfOwner();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    findBettor();
    setIfOwner();

    // Clean up function
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
          setIfOwner()
        );
      }
    };
  }, [contractInstance]); // Effect runs on component mount and when contractInstance changes

  const calculateRewardRisk = async () => {
    if (contractInstance) {
      try {
        if (bettor?.betterA?.amount != null || betA > 0 || reduction > 0) {
          const betamountA = ethers.utils.parseEther(betA || "0");
          const contractFunctionA = contractInstance.winLossBetA;
          let potentialReward, reward, risk, totalBet;

          if (reduction > 0) {
            [potentialReward, reward, risk, totalBet] = await contractFunctionA(
              ethers.utils.parseEther(reduction),
              false
            );
          } else {
            [potentialReward, reward, risk, totalBet] = await contractFunctionA(
              betamountA,
              true
            );
          }
          console.log("potentialReward", potentialReward);
          console.log("reward", reward);
          console.log("risk", risk);
          console.log("totalBet ", totalBet.toString());
          setCalculatedRewardRiskA({
            potentialReward: potentialReward.toString(),
            reward: reward.toString(),
            risk: risk.toString(),
            totalBet: totalBet.toString(),
          });
        }
        if (bettor?.betterB?.amount != null || betB > 0 || reduction > 0) {
          const betAmountB = ethers.utils.parseEther(betB || "0");
          const contractFunctionB = contractInstance.winLossBetB;
          let potentialReward, reward, risk, totalBet;

          if (reduction > 0) {
            [potentialReward, reward, risk, totalBet] = await contractFunctionB(
              ethers.utils.parseEther(reduction),
              false
            );
          } else {
            [potentialReward, reward, risk, totalBet] = await contractFunctionB(
              betAmountB,
              true
            );
          }
          console.log("potentialReward", potentialReward);
          console.log("reward", reward);
          console.log("risk", risk);

          setCalculatedRewardRiskB({
            potentialReward: potentialReward.toString(),
            reward: reward.toString(),
            risk: risk.toString(),
            totalBet: totalBet.toString(),
          });
        }
      } catch (error) {
        console.error("Error calculating reward and risk:", error);
        setCalculatedRewardRiskA({
          potentialReward: null,
          reward: null,
          risk: null,
          totalBet: null,
        });
        setCalculatedRewardRiskB({
          potentialReward: null,
          reward: null,
          risk: null,
          totalBet: null,
        });
      }
    } else {
      setCalculatedRewardRiskA({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
      });
      setCalculatedRewardRiskB({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
      });
    }
  };

  useEffect(() => {
    calculateRewardRisk();
  }, [betA, betB, contractInstance, reduction, bettor]);

  const setIfOwner = async () => {
    if (contractInstance) {
      try {
        const ownerCheck = await contractInstance.isOwner();
        setOwner(ownerCheck);
      } catch (error) {
        console.log("couldnt find owner", error);
      }
    }
  };

  const updateBetterMongoDB = async (address, signer) => {
    try {
      // Correctly construct the URL using template literals
      const signerAddress = signer.getAddress
        ? await signer.getAddress()
        : signer;
      const url = `http://localhost:3001/api/updateBetterMongoDB`;

      // Make the POST request
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress: address,
          better: signerAddress,
        }), // Assuming you're sending the vote time in the request body
      });
    } catch (error) {
      console.error("Error updating MongoDB:", error);
    }
  };

  const betOnOption = async () => {
    if (reduction > 0) {
      alert("Please clear the reduction amount before placing a bet.");
      return;
    }
    if (contractInstance && (betA || betB)) {
      try {
        if (betA && !betB) {
          const tx = await contractInstance.betOnBetA({
            value: ethers.utils.parseEther(betA),
          });
          await tx.wait();
          updateBetterMongoDB(contractAddress, signer);
        } else if (betB && !betA) {
          const tx = await contractInstance.betOnBetB({
            value: ethers.utils.parseEther(betB),
          });
          await tx.wait();
          updateBetterMongoDB(contractAddress, signer);
        } else {
          alert("invalid bet configuration");
        }

        console.log(`Bet placed }`);
      } catch (error) {
        console.error(`Error placing bet on:`, error);
      }
    }
  };
  const reduceBet = async (reductionBet) => {
    if (betA > 0 || betB > 0) {
      alert("Please clear bet amounts before reducing a bet.");
      return;
    }
    if (contractInstance && reductionBet) {
      try {
        const tx = await contractInstance[`reduce${reductionBet}`](
          ethers.utils.parseEther(reduction)
        );
        await tx.wait();
        console.log(`Bet reduced on ${reductionBet}`);
      } catch (error) {
        console.error(`Error reducing bet on ${reductionBet}:`, error);
      }
    }
  };

  const updateMongoDB = async (address, voteTime) => {
    try {
      // Correctly construct the URL using template literals
      const url = `http://localhost:3001/api/updateMongoDB`;

      // Make the POST request
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractAddress: address, voteTime: voteTime }), // Assuming you're sending the vote time in the request body
      });
    } catch (error) {
      console.error("Error updating MongoDB:", error);
    }
  };

  const endBet = async (winnerPot) => {
    if (contractInstance && winnerPot) {
      try {
        const tx = await contractInstance.endBet(winnerPot);
        await tx.wait();
        console.log(`Bet ended on ${winnerPot}`);

        // Update MongoDB after the smart contract interaction
        // Assuming you want to record the current date and time as the "vote time"

        const endTime = Math.floor(Date.now() / 1000) + 86400;
        await updateMongoDB(contractAddress, endTime);
      } catch (error) {
        console.error(`Error ending bet on ${winnerPot}:`, error);
      }
    }
  };

  const withdraw = async (withdrawBet) => {
    if (contractInstance && withdrawBet) {
      try {
        const tx = await contractInstance[`withdraw${withdrawBet}`]();
        await tx.wait();
        console.log(`Bet withdrawn on ${withdrawBet}`);

        // Refresh bettor information after withdrawal
        findBettor();

        const signerAddress = await signer.getAddress();
        console.log("signer Address is : " + signerAddress);

        // Check if the bettor has a non-zero amount in only one of the bets
        const shouldRemoveBettor =
          (withdrawBet === "A" &&
            (!bettor?.betterB || bettor?.betterB.amount.isZero())) ||
          (withdrawBet === "B" &&
            (!bettor?.betterA || bettor?.betterA.amount.isZero()));

        if (shouldRemoveBettor) {
          // Make API call to remove bettor from MongoDB
          const response = await fetch("http://localhost:3001/removeBetter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ address: signerAddress }),
          });

          if (!response.ok) {
            throw new Error("Failed to remove bettor from database");
          }

          console.log("Bettor removed from database");
        } else {
          console.log("Bettor still has active bets on the other option");
        }
      } catch (error) {
        console.error(`Error withdrawing bet on ${withdrawBet}:`, error);
      }
    }
  };

  if (!contract) {
    return <div className="loading">Loading...</div>;
  }
  const weiToEther = (weiValue) => {
    return ethers.utils.formatEther(weiValue);
  };

  return (
    <>
      <Header />
      <main className="contract-container">
        {/* Display the profile image */}

        <div className="profile-image-container2">
          <img
            src={
              contract.tags[0] === "SSBMelee"
                ? "http://localhost:3000/MeleeBubble.png"
                : contract.tags[0] === "SSBUltimate"
                ? "http://localhost:3000/SMASHULT.png"
                : contract.tags[0] === "LeagueOfLegends"
                ? "http://localhost:3000/LeagueBubble.png"
                : contract.tags[0] === "CSGO"
                ? "http://localhost:3000/CSGOBubble.png"
                : contract.tags[0] === "Fortnite"
                ? "http://localhost:3000/FortniteBubble.png"
                : "http://localhost:3000/noPhotoAvail.jpg" // default image if none of the tags match
            }
            alt="Contract Profile"
            className="contract-profile-image"
          />
        </div>
        <section className="contract-section">
          <h1 className="contract-title">{contract.name}</h1>
          <div className="contract-grid">
            <div className="contract-detail-item">
              <strong>Address of Contract:</strong> {contractAddress}
            </div>
            <div className="contract-detail-item">
              <strong>Contract Name:</strong> {contract.NameOfMarket}
            </div>
            <div className="contract-detail-item">
              <strong>Contract Condition:</strong> {contract.ConditionOfMarket}
            </div>
            <div className="contract-detail-item">
              <strong>Contract Odds:</strong> {contract.odds1} /{" "}
              {contract.odds2}
            </div>
            {betsOnPotsAB && (
              <aside
                className="contract-section"
                style={{ textAlign: "center" }}
              >
                <h1>Pots A : {weiToEther(betsOnPotsAB.BetA)}</h1>
                <h1>Pots B : {weiToEther(betsOnPotsAB.BetB)}</h1>
                <div className="contract-timer">
                  <h4>Time left to bet:</h4>
                  <CountdownTimer
                    endTime={contract.endTime}
                    className="countdown-timer"
                  />
                </div>
                {contract &&
                  contract.voteTime &&
                  Date.now() < contract.voteTime * 1000 && (
                    <div className="contract-vote-time">
                      <h4>Vote time:</h4>
                      <CountdownTimer
                        endTime={contract.voteTime}
                        className="countdown-timer"
                      />
                    </div>
                  )}
              </aside>
            )}
            <div class="betting-container">
              {statusOfMarket === 0 && (
                <section
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    maxWidth: "600px",
                    margin: "auto",
                  }}
                >
                  <div style={{ width: "50%" }}>
                    <input
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                      value={betA}
                      onChange={(e) => setBetA(e.target.value)}
                      placeholder="Bet Amount A"
                    />
                    {(bettor?.betterA || betA) && (
                      <div
                        style={{
                          textAlign: "center",
                          marginTop: "10px",
                          fontSize: "14px",
                        }}
                      >
                        <p>
                          Potential Reward A:{" "}
                          {calculatedRewardRiskA.potentialReward
                            ? weiToEther(calculatedRewardRiskA.potentialReward)
                            : "N/A"}
                        </p>
                        <p>
                          Current Reward A:{" "}
                          {calculatedRewardRiskA.reward
                            ? weiToEther(calculatedRewardRiskA.reward)
                            : "N/A"}
                        </p>
                        <p>
                          Calculated Risk A:{" "}
                          {calculatedRewardRiskA.risk
                            ? weiToEther(calculatedRewardRiskA.risk)
                            : "N/A"}
                        </p>
                        <p>
                          Total Amount Bet:{" "}
                          {calculatedRewardRiskA.totalBet
                            ? weiToEther(calculatedRewardRiskA.totalBet)
                            : 0}
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ width: "50%" }}>
                    <input
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                      value={betB}
                      onChange={(e) => setBetB(e.target.value)}
                      placeholder="Bet Amount B"
                    />
                    {(bettor?.betterB || betB) && (
                      <div
                        style={{
                          textAlign: "center",
                          marginTop: "10px",
                          fontSize: "14px",
                        }}
                      >
                        <p>
                          Potential Reward B:{" "}
                          {calculatedRewardRiskB.potentialReward
                            ? weiToEther(calculatedRewardRiskB.potentialReward)
                            : "N/A"}
                        </p>
                        <p>
                          Current Reward B:{" "}
                          {calculatedRewardRiskB.reward
                            ? weiToEther(calculatedRewardRiskB.reward)
                            : "N/A"}
                        </p>
                        <p>
                          Calculated Risk B:{" "}
                          {calculatedRewardRiskB.risk
                            ? weiToEther(calculatedRewardRiskB.risk)
                            : "N/A"}
                        </p>

                        <p>
                          Total Amount Bet:{" "}
                          {calculatedRewardRiskB.totalBet
                            ? weiToEther(calculatedRewardRiskB.totalBet)
                            : 0}
                        </p>
                      </div>
                    )}
                    <button onClick={() => betOnOption()}>Place Bet</button>
                  </div>
                </section>
              )}

              <section className="contract-section">
                {/* Check if bettor has placed a bet and market status is either for reducing bet (0) or withdrawing (3) */}
                {bettor &&
                  (bettor.betterA.amount > 0 || bettor.betterB.amount > 0) &&
                  (statusOfMarket === 0 || statusOfMarket === 3) && (
                    <>
                      {statusOfMarket === 0 && (
                        <>
                          <h3 className="contract-title">Reduce Your Bet</h3>
                          <input
                            className="search-input"
                            value={reduction}
                            onChange={(e) => setReduction(e.target.value)}
                            placeholder="Reduce Amount"
                          />
                          <div className="button-container">
                            {bettor.betterA.amount > 0 && (
                              <button
                                className="button"
                                onClick={() => reduceBet("BetA")}
                              >
                                Reduce on A
                              </button>
                            )}
                            {bettor.betterB.amount > 0 && (
                              <button
                                className="button"
                                onClick={() => reduceBet("BetB")}
                              >
                                Reduce on B
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      {statusOfMarket === 3 && (
                        <div className="button-container">
                          <h3 className="contract-title">Withdraw Your Bet</h3>
                          {bettor.betterA.amount > 0 && (
                            <button
                              className="button"
                              onClick={() => withdraw("A")}
                            >
                              Withdraw All on A
                            </button>
                          )}
                          {bettor.betterB.amount > 0 && (
                            <button
                              className="button"
                              onClick={() => withdraw("B")}
                            >
                              Withdraw All on B
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
              </section>
            </div>
          </div>
        </section>

        {/* Display the profile image */}
        <div className="profile-image-container">
          <img
            src={
              contract.tags[0] === "SSBMelee"
                ? "http://localhost:3000/Melee.jpg"
                : contract.tags[0] === "SSBUltimate"
                ? "http://localhost:3000/SSBUltimate.jpg"
                : contract.tags[0] === "LeagueOfLegends"
                ? "http://localhost:3000/LeagueL.jpg"
                : contract.tags[0] === "CSGO"
                ? "http://localhost:3000/CSGO-Symbol.jpg"
                : contract.tags[0] === "Fortnite"
                ? "http://localhost:3000/FortniteImg.jpg"
                : "http://localhost:3000/noPhotoAvail.jpg" // default image if none of the tags match
            }
            alt="Contract Profile"
            className="contract-profile-image"
          />
        </div>

        {/* Exclusive Owner Actions */}
        {owner && statusOfMarket === 0 && (
          <div className="button-container">
            <p>After Betting Period Has Ended Select</p>
            <button className="button" onClick={() => endBet(0)}>
              Set Winner A
            </button>
            <button className="button" onClick={() => endBet(1)}>
              Set Winner B
            </button>
            <button className="button" onClick={() => endBet(2)}>
              Set Draw/Cancel
            </button>
          </div>
        )}
      </main>
    </>
  );
};

export default MarketInteractionPage;
