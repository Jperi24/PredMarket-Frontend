import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import predMarketArtifact from "../../predMarket.json"; // Assuming correct path to the ABI and Bytecode

import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";
import Header from "../../components/Header";
import { getContractDetails, getContracts } from "../../data/contractStore";

const MarketInteractionPage = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [betsOnPotsAB, setBetsOnPots] = useState("");
  const [contractInstance, setContractInstance] = useState(null);

  const [reduction, setReduction] = useState("");
  const [bettor, setBettor] = useState(null);
  const router = useRouter();
  const [ABDraw, setABDraw] = useState(null);
  const [owner, setOwner] = useState(null);
  const [gasInContract, setGasIn] = useState("");
  const { contractAddress } = router.query;
  const [betA, setBetA] = useState("");
  const [betB, setBetB] = useState("");

  const [calculatedRewardRiskA, setCalculatedRewardRiskA] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
  });
  const [calculatedRewardRiskB, setCalculatedRewardRiskB] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
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
        const tempProvider = new ethers.providers.JsonRpcProvider(
          "http://localhost:8545"
        );
        await window.ethereum.request({ method: "eth_requestAccounts" });

        // Create a provider that wraps around MetaMask's provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        // Get the signer corresponding to the currently selected account in MetaMask
        const signer2 = provider.getSigner();
        setProvider(provider);
        // const tempSigner = tempProvider.getSigner();
        setSigner(signer2);

        const tempContractInstance = new ethers.Contract(
          contractAddress,
          predMarketArtifact.abi,
          signer2
        );
        setContractInstance(tempContractInstance);
      }
    };

    if (contractAddress) {
      deployContract();
    }
  }, [contractAddress]);

  useEffect(() => {
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
        if (bettor?.betterA?.amount != null || betA > 0) {
          const betamountA = ethers.utils.parseEther(betA || "0");
          const contractFunctionA = contractInstance.winLossBetA;
          const [potentialReward, reward, risk] = await contractFunctionA(
            betamountA
          );
          setCalculatedRewardRiskA({
            potentialReward: potentialReward.toString(),
            reward: reward.toString(),
            risk: risk.toString(),
          });
        }
        if (bettor?.betterB?.amount != null || betB > 0) {
          const betAmountB = ethers.utils.parseEther(betB || "0");
          const contractFunctionB = contractInstance.winLossBetB;
          const [potentialReward, reward, risk] = await contractFunctionB(
            betAmountB
          );
          setCalculatedRewardRiskB({
            potentialReward: potentialReward.toString(),
            reward: reward.toString(),
            risk: risk.toString(),
          });
          console.log(calculatedRewardRiskB);
        }
      } catch (error) {
        console.error("Error calculating reward and risk:", error);
        setCalculatedRewardRiskA({
          potentialReward: null,
          reward: null,
          risk: null,
        });
        setCalculatedRewardRiskB({
          potentialReward: null,
          reward: null,
          risk: null,
        });
      }
    } else {
      setCalculatedRewardRiskA({
        potentialReward: null,
        reward: null,
        risk: null,
      });
      setCalculatedRewardRiskB({
        potentialReward: null,
        reward: null,
        risk: null,
      });
    }
  };

  useEffect(() => {
    calculateRewardRisk();
  }, [betA, betB, contractInstance]);

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
        console.log(`Bet withdraw on ${withdrawBet}`);
      } catch (error) {
        console.error(`Error withdraw bet on ${withdrawBet}:`, error);
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
      <Header getContracts={getContracts} />
      <main className="contract-container">
        {/* Display the profile image */}
        <div className="profile-image-container2">
          <img
            src="http://localhost:3000/SMASHULT.png"
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
          </div>
        </section>

        {/* Display the profile image */}
        <div className="profile-image-container">
          <img
            src={
              contract.imageUrl
                ? contract.imageUrl
                : "http://localhost:3000/SSBUltimate.jpg"
            }
            alt="Contract Profile"
            className="contract-profile-image"
          />
        </div>

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
                </div>
              )}
            </div>
          </section>
        )}

        <button onClick={() => betOnOption()}>Place Bet</button>

        {/* Bet Reduction Section */}
        {bettor && (bettor.betterA.amount > 0 || bettor.betterB.amount > 0) && (
          <section>
            <h3>Reduce Your Bet</h3>
            <input
              value={reduction}
              onChange={(e) => setReduction(e.target.value)}
              placeholder="Reduce Amount"
            />
            {bettor.betterA.amount > 0 && (
              <button onClick={() => reduceBet("BetA")}>Reduce on A</button>
            )}
            {bettor.betterB.amount > 0 && (
              <button onClick={() => reduceBet("BetB")}>Reduce on B</button>
            )}
          </section>
        )}

        {bettor && statusOfMarket === 3 && (
          <section>
            {bettor.betterA.amount > 0 && (
              <button onClick={() => withdraw("A")}>Withdraw All on A</button>
            )}
            {bettor.betterB.amount > 0 && (
              <button onClick={() => withdraw("B")}>Withdraw All on B</button>
            )}
          </section>
        )}

        <section>
          {bettor ? (
            <>
              {bettor.betterA.amount > 0 && (
                <>
                  <div>Bettor A: {bettor.betterA.bettor.toString()}</div>
                  <div>Bet Amount A: {bettor.betterA.amount.toString()}</div>
                  <div>
                    Odds A: {bettor.betterA.odds[0].toString()} /{" "}
                    {bettor.betterA.odds[1].toString()}
                  </div>
                </>
              )}
              {bettor.betterB.amount > 0 && (
                <>
                  <div>Bettor B: {bettor.betterB.bettor.toString()}</div>
                  <div>Bet Amount B: {bettor.betterB.amount.toString()}</div>
                  <div>
                    Odds B: {bettor.betterB.odds[0].toString()} /{" "}
                    {bettor.betterB.odds[1].toString()}
                  </div>
                </>
              )}
              {!bettor.betterA && !bettor.betterB && <p>No information</p>}
            </>
          ) : (
            <p>No bettor information available</p>
          )}
        </section>

        {owner && statusOfMarket === 0 && (
          <section>
            <div>After Betting Period Has Ended Select</div>
            <button onClick={() => endBet(0)}>Set Winner A</button>
            <button onClick={() => endBet(1)}>Set Winner B</button>
            <button onClick={() => endBet(2)}>Set Draw/Cancel</button>
          </section>
        )}

        <aside>
          <div>Gas: {gasInContract.toString()}</div>
        </aside>

        {betsOnPotsAB && (
          <aside>
            <h1>Pots A : {weiToEther(betsOnPotsAB.BetA)}</h1>
            <h1>Pots B : {weiToEther(betsOnPotsAB.BetB)}</h1>
          </aside>
        )}
      </main>
    </>
  );
};

export default MarketInteractionPage;
