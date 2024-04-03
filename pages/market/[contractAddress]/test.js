import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import predMarketArtifact from "../../../predMarket.json"; // Assuming correct path to the ABI and Bytecode

import CountdownTimer, { timeLeft } from "../../../components/CountDownTimer";
import Header from "../../../components/Header";
import { getContractDetails, getContracts } from "../../../data/contractStore";
import { useSigner } from "@thirdweb-dev/react";
import styles from "../../../styles/[contractAddress].module.css";

import { convertWeiToUsd } from "../../../components/currencyConversionUtils";

const MarketInteractionPage = () => {
  // const [provider, setProvider] = useState(null);
  // const [signer, setSigner] = useState(null);

  const [contract, setContract] = useState(null);

  const [contractInstance, setContractInstance] = useState(null);

  const [reductionA, setReductionA] = useState("");
  const [reductionB, setReductionB] = useState("");
  const [bettor, setBettor] = useState(null);
  const router = useRouter();
  const [ABDraw, setABDraw] = useState(null);
  const [owner, setOwner] = useState(null);
  const { contractAddress } = router.query;
  const [betA, setBetA] = useState("");
  const [betB, setBetB] = useState("");
  const [boughtIn, setBoughtIn] = useState("");
  const [buyInUSD, setBuyIn] = useState("");
  const [events, setEvents] = useState([]);
  const signer = useSigner();

  const [calculatedRewardRiskA, setCalculatedRewardRiskA] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
    potB: null,
  });
  const [calculatedRewardRiskB, setCalculatedRewardRiskB] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
    potA: null,
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

        const sstatusOfMarket = await contractInstance.getRaffleState();
        setStatusOfMarket(sstatusOfMarket);
        console.log(sstatusOfMarket);
      } catch (error) {
        console.error("Error finding bettor:", error);
      }
    }
  };

  const ifBoughtIn = async () => {
    if (contractInstance && signer) {
      try {
        const signerAddress = await signer.getAddress();
        const ifSignerBoughtIn = await contractInstance.boughtIn(signerAddress);
        setBoughtIn(ifSignerBoughtIn);
      } catch (error) {
        console.log("error with boughtIn");
      }
    }
  };

  const setBuyInUSD = async () => {
    if (contractInstance && contract) {
      try {
        const buyIninUSD = await convertWeiToUsd(contract.buyIn);
        // Round to two decimal places and convert back to a number
        const roundedBuyInUSD = Number(buyIninUSD.toFixed(2));
        setBuyIn(roundedBuyInUSD);
      } catch (error) {
        console.log("error setting buyIninUSD");
      }
    }
  };

  const getEvents = async () => {
    if (contractInstance) {
      try {
        const fetchedEvents = await contractInstance.queryFilter({});
        setEvents(fetchedEvents);
      } catch (error) {
        console.log(error, "event error");
      }
    }
  };

  useEffect(() => {
    // Function to initialize or update component state based on the current account
    const initializeOrRefreshState = async () => {
      try {
        await findBettor();
        await setIfOwner();
        await ifBoughtIn();
        await setBuyInUSD();
        await getEvents();
      } catch (error) {
        console.error("Error initializing or refreshing state:", error);
      }
    };

    // Call once on mount to initialize state
    initializeOrRefreshState();

    // Function to handle account changes
    const handleAccountsChanged = (accounts) => {
      // Re-initialize or refresh component state based on the new account
      initializeOrRefreshState();
    };

    // Setup event listener for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    if (contractInstance && signer) {
      const userBoughtInListener = () => {
        console.log("userBoughtIn event detected");
        initializeOrRefreshState();
        getEvents();
      };

      // Attach the event listener for "userBoughtIn"
      contractInstance.on("userBoughtIn", userBoughtInListener);

      // Cleanup function to remove the event listener
      return () => {
        contractInstance.off("userBoughtIn", userBoughtInListener);
      };
    } else {
      console.log("Signer not available, skipping event listener setup.");
    }

    // Cleanup function to remove the event listener
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [contractInstance]); // Depend on contractInstance to re-run effect if it changes

  // useEffect(() => {
  //   findBettor();
  //   ifBoughtIn();
  //   // Function to handle account changes
  //   const handleAccountsChanged = (accounts) => {
  //     // You can add additional logic here if needed
  //     findBettor();
  //     setIfOwner();
  //     ifBoughtIn();
  //   };

  //   if (window.ethereum) {
  //     window.ethereum.on("accountsChanged", handleAccountsChanged);
  //   }

  //   findBettor();
  //   setIfOwner();

  //   // Clean up function
  //   return () => {
  //     if (window.ethereum) {
  //       window.ethereum.removeListener(
  //         "accountsChanged",
  //         handleAccountsChanged,
  //         setIfOwner()
  //       );
  //     }
  //   };
  // }, [contractInstance]); // Effect runs on component mount and when contractInstance changes

  const calculateRewardRisk = async () => {
    if (contractInstance) {
      try {
        if (bettor?.betterA?.amount != null || betA > 0 || reductionA > 0) {
          const betamountA = ethers.utils.parseEther(betA || "0");
          const contractFunctionA = contractInstance.winLossBetA;
          let potentialReward, reward, risk, totalBet, potB;

          if (reductionA > 0) {
            [potentialReward, reward, risk, totalBet, potB] =
              await contractFunctionA(
                ethers.utils.parseEther(reductionA),
                false
              );
          } else {
            [potentialReward, reward, risk, totalBet, potB] =
              await contractFunctionA(betamountA, true);
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
            potB: potB.toString(),
          });
        }
        if (bettor?.betterB?.amount != null || betB > 0 || reductionB > 0) {
          const betAmountB = ethers.utils.parseEther(betB || "0");
          const contractFunctionB = contractInstance.winLossBetB;
          let potentialReward, reward, risk, totalBet, potA;

          if (reductionB > 0) {
            [potentialReward, reward, risk, totalBet, potA] =
              await contractFunctionB(
                ethers.utils.parseEther(reductionB),
                false
              );
          } else {
            [potentialReward, reward, risk, totalBet, potA] =
              await contractFunctionB(betAmountB, true);
          }
          console.log("potentialReward", potentialReward);
          console.log("reward", reward);
          console.log("risk", risk);

          setCalculatedRewardRiskB({
            potentialReward: potentialReward.toString(),
            reward: reward.toString(),
            risk: risk.toString(),
            totalBet: totalBet.toString(),
            potA: potA.toString(),
          });
        }
      } catch (error) {
        console.error("Error calculating reward and risk:", error);
        setCalculatedRewardRiskA({
          potentialReward: null,
          reward: null,
          risk: null,
          totalBet: null,
          potB: null,
        });
        setCalculatedRewardRiskB({
          potentialReward: null,
          reward: null,
          risk: null,
          totalBet: null,
          potA: null,
        });
      }
    } else {
      setCalculatedRewardRiskA({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
        potB: null,
      });
      setCalculatedRewardRiskB({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
        potA: null,
      });
    }
  };

  useEffect(() => {
    calculateRewardRisk();
    if (contractInstance && signer) {
      const userPlacedBetListener = () => {
        console.log("userPlacedBet event detected");
        calculateRewardRisk();
        getEvents();
      };
      const userReducedBetListener = () => {
        console.log("userPlacedBet event detected");
        calculateRewardRisk();
        getEvents();
      };

      const userWithdrewBetListener = () => {
        console.log("userPlacedBet event detected");
        getEvents();
      };

      // Attach the event listener for "userBoughtIn"
      contractInstance.on("userPlacedBet", userPlacedBetListener);
      contractInstance.on("userReducedBet", userReducedBetListener);
      contractInstance.on("userWithdrewBet", userWithdrewBetListener);

      // Cleanup function to remove the event listener
      return () => {
        contractInstance.off("userPlacedBet", userPlacedBetListener);
        contractInstance.off("userReducedBet", userReducedBetListener);
        contractInstance.off("userWithdrewBet", userWithdrewBetListener);
      };
    } else {
      console.log("Signer not available, skipping event listener setup.");
    }
  }, [contractInstance, bettor, betA, betB, reductionA, reductionB]);

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
    if (!boughtIn) {
      alert("Please Buy Into Bet First");
      return;
    }
    if (reductionA > 0 || reductionB > 0) {
      alert("Please clear the reduction amount before placing a bet.");
      return;
    }
    if (betA > 0 && betB > 0) {
      alert("Please Only Place 1 Bet At A Time");
      return;
    }
    if (betA <= 0 && betB <= 0) {
      alert("Please Enter A Bet");
      return;
    }
    if (contractInstance && (betA || betB)) {
      try {
        if (betA && !betB) {
          const tx = await contractInstance.betOnBetA({
            value: ethers.utils.parseEther(betA),
          });
          updateBetterMongoDB(contractAddress, signer);
          await tx.wait();
        } else if (betB && !betA) {
          const tx = await contractInstance.betOnBetB({
            value: ethers.utils.parseEther(betB),
          });
          updateBetterMongoDB(contractAddress, signer);
          await tx.wait();
        } else {
          alert("invalid bet configuration");
        }

        console.log(`Bet placed }`);
      } catch (error) {
        console.error(`Error placing bet on:`, error);
      }
    }
  };
  const buyInBet = async () => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.payBuyIn({
          value: contract.buyIn,
        });

        await tx.wait();
        // updateBetterMongoDB(contractAddress, signer);
      } catch (error) {
        console.error(`Error buyingIn:`, error);
      }
    }
  };
  // const reduceBet = async (reductionBet) => {
  //   if (betA > 0 || betB > 0) {
  //     alert("Please clear bet amounts before reducing a bet.");
  //     return;
  //   }

  //   if (contractInstance ) {
  //     try {
  //       if (reductionA > 0 && reductionB <= 0) {
  //         reduceBet("BetA");
  //       } else if (reductionA <= 0 && reductionB > 0) {
  //         reduceBet("BetB"); // Assuming you meant to reduce BetB here, adjust as necessary
  //       } else {
  //         // Assuming you want to show a popup or handle the "cannot reduce" case differently
  //         // For a popup, you might need to set state that triggers a modal or use alert for simplicity
  //         alert("Cannot reduce 2 or no bets"); // Or handle this case in a more sophisticated way
  //       }
  //     }
  //       const tx = await contractInstance[`reduce${reductionBet}`](
  //         ethers.utils.parseEther(reduction)
  //       );
  //       await tx.wait();
  //       console.log(`Bet reduced on ${reductionBet}`);
  //     } catch (error) {
  //       console.error(`Error reducing bet on ${reductionBet}:`, error);
  //     }
  //   }
  // };

  const reduceBet = async () => {
    // This checks seem unnecessary based on the task description and have been removed:
    // if (betA > 0 || betB > 0) { ... }

    if (!contractInstance) {
      console.error("Contract instance not available.");
      return;
    }

    let betType;
    let reduction;
    if (reductionA > 0 && reductionB <= 0) {
      betType = "BetA";
      reduction = reductionA;
    } else if (reductionA <= 0 && reductionB > 0) {
      betType = "BetB";
      reduction = reductionB;
    } else {
      alert("Cannot reduce 2 or no bets");
      return; // Exit the function if neither condition is met
    }

    try {
      // Assuming `reduction` is a predefined value that you want to reduce the bet by.
      // You'll need to adjust this part to match the parameters expected by your contract method.
      const tx = await contractInstance[`reduce${betType}`](
        ethers.utils.parseEther(reduction)
      );

      await tx.wait();
      console.log(`Bet reduced on ${betType}`);
    } catch (error) {
      console.error(`Error reducing bet on ${betType}:`, error);
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

  const withdraw = async () => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.withdraw();
        await tx.wait();

        // Refresh bettor information after withdrawal
        findBettor();

        const signerAddress = await signer.getAddress();
        console.log("signer Address is : " + signerAddress);

        // Check if the bettor has a non-zero amount in only one of the bets

        // Make API call to remove bettor from MongoDB
        const response = await fetch("http://localhost:3001/removeBettor", {
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
      } catch (error) {
        console.error(`Error withdrawing bet}:`, error);
      }
    }
  };

  if (!contract) {
    return <div className="loading">Loading...</div>;
  }
  const weiToEther = (weiValue) => {
    if (weiValue === undefined || weiValue === null) {
      console.error("Invalid weiValue:", weiValue);
      return "0"; // Return a default value or handle the error as appropriate
    }
    try {
      return ethers.utils.formatEther(weiValue);
    } catch (error) {
      console.error("Error formatting wei to ether:", error);
      return "Error"; // Return an error indication or handle it as needed
    }
  };

  return (
    <>
      <main className="contract-container">
        <Header />
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
              <strong>Address of Contract:</strong> {contract.address}
              <span className="custom-tooltip">{contract.address}</span>
            </div>

            <div className="contract-detail-item">
              <strong>Contract Name:</strong> {contract.NameofMaket}
              <span className="custom-tooltip">{contract.NameofMaket}</span>
            </div>

            {statusOfMarket === 0 && (
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

                <input
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontSize: "14px",
                  }}
                  value={reductionA}
                  onChange={(e) => setReductionA(e.target.value)}
                  placeholder="Reduce Amount A"
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
                      <span className="tooltip">
                        <span className="help-icon">
                          Current Reward A:{" "}
                          {calculatedRewardRiskA.reward
                            ? weiToEther(calculatedRewardRiskA.reward)
                            : "N/A"}
                        </span>
                        <span
                          className="tooltiptext"
                          style={{ marginLeft: "-55px" }}
                        >
                          Thhis means if the bet ended now, based on the bets on
                          Event A and B, you would Win:{" "}
                          {weiToEther(calculatedRewardRiskA.reward)}{" "}
                        </span>
                      </span>
                    </p>
                    <p>
                      <span className="tooltip">
                        <span className="help-icon">
                          Current Risk A:{" "}
                          {calculatedRewardRiskA.risk
                            ? weiToEther(calculatedRewardRiskA.risk)
                            : "N/A"}
                        </span>
                        <span
                          className="tooltiptext"
                          style={{ marginLeft: "-55px" }}
                        >
                          This means if the bet ended now, based on the bets on
                          Event A and B, you would lose:{" "}
                          {weiToEther(calculatedRewardRiskA.risk)}{" "}
                        </span>
                      </span>
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
            )}

            {calculatedRewardRiskB && calculatedRewardRiskA && (
              <aside
                className="contract-section"
                style={{ textAlign: "center" }}
              >
                <div className="pots-container">
                  <div className="pot">
                    <h1>Pots A : {weiToEther(calculatedRewardRiskB.potA)}</h1>
                  </div>
                  <div className="pot">
                    <h1>Pots B : {weiToEther(calculatedRewardRiskA.potB)}</h1>
                  </div>
                </div>
                {statusOfMarket === 0 ? (
                  <div className="contract-timer">
                    <h4>Time left to bet:</h4>
                    <CountdownTimer
                      endTime={contract.endTime}
                      className="countdown-timer"
                    />
                  </div>
                ) : statusOfMarket === 1 ? (
                  Date.now() < contract.voteTime * 1000 && (
                    <div className="contract-vote-time">
                      <h4>Vote time:</h4>
                      <CountdownTimer
                        endTime={contract.voteTime}
                        className="countdown-timer"
                      />
                    </div>
                  )
                ) : (
                  <h4>Contract Has Ended, Please Withdraw</h4>
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
                      value={betB}
                      onChange={(e) => setBetB(e.target.value)}
                      placeholder="Bet Amount B"
                    />
                    <input
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                      value={reductionB}
                      onChange={(e) => setReductionB(e.target.value)}
                      placeholder="Reduce Amount B"
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
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Reward B:{" "}
                              {calculatedRewardRiskB.reward
                                ? weiToEther(calculatedRewardRiskB.reward)
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              This means if the bet ended now, based on the bets
                              on Event A and B, you would Win:{" "}
                              {weiToEther(calculatedRewardRiskB.reward)}{" "}
                            </span>
                          </span>
                        </p>
                        <p>
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Risk B:{" "}
                              {calculatedRewardRiskB.risk
                                ? weiToEther(calculatedRewardRiskB.risk)
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              This means if the bet ended now, based on the bets
                              on Event A and B, you would lose{" "}
                              {weiToEther(calculatedRewardRiskB.risk)}{" "}
                            </span>
                          </span>
                        </p>

                        <p>
                          Total Amount Bet:{" "}
                          {calculatedRewardRiskB.totalBet
                            ? weiToEther(calculatedRewardRiskB.totalBet)
                            : 0}
                        </p>
                      </div>
                    )}
                    <ul class="horizontal-list">
                      <span className="tooltip">
                        <span className="help-icon">All Details</span>
                        <span
                          className="tooltiptext"
                          style={{ marginLeft: "15px" }}
                        >
                          <ul>
                            <li>
                              Bet A Details:{" "}
                              {contract.ConditionOfMarket.betADetails}
                            </li>
                            <li>
                              Bet B Details:{" "}
                              {contract.ConditionOfMarket.betBDetails}
                            </li>
                            <li>
                              Event Timing:{" "}
                              {contract.ConditionOfMarket.eventTiming}
                            </li>
                            <li>
                              Information Sources/ Irrufutable Source Of Truth:{" "}
                              {contract.ConditionOfMarket.informationSources}
                            </li>
                            <li>
                              {" "}
                              The total amount that you will withdraw if you win
                              is what you are Rewarded + Total Amount Bet (
                              {weiToEther(calculatedRewardRiskA.reward)} +{" "}
                              {weiToEther(calculatedRewardRiskA.totalBet)} ={" "}
                              {weiToEther(
                                calculatedRewardRiskA.reward +
                                  calculatedRewardRiskA.totalBet
                              )}
                              )
                            </li>
                          </ul>
                        </span>
                      </span>
                      <span className="tooltip">
                        <span className="help-icon">
                          <button onClick={() => betOnOption()}>
                            Place Bet
                          </button>
                        </span>
                        <span className="tooltiptext">
                          {" "}
                          The total amount that you will withdraw if you win is
                          what you are Rewarded + Total Amount Bet (
                          {weiToEther(calculatedRewardRiskA.reward)} +{" "}
                          {weiToEther(calculatedRewardRiskA.totalBet)} ={" "}
                          {weiToEther(
                            calculatedRewardRiskA.reward +
                              calculatedRewardRiskA.totalBet
                          )}
                          )
                        </span>
                      </span>
                      <div className="button-container">
                        {boughtIn && (
                          <button
                            className="button"
                            onClick={() => reduceBet()}
                          >
                            Reduce Bet
                          </button>
                        )}
                      </div>
                      {!boughtIn && (
                        <button onClick={() => buyInBet()}>
                          Buy In, {buyInUSD}
                        </button>
                      )}
                    </ul>
                  </div>
                </section>
              )}

              {/* /* Check if bettor has placed a bet and market status is either for reducing bet (0) or withdrawing (3)
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
                      )} */}

              {statusOfMarket === 3 && (
                <section className="contract-section">
                  <>
                    <div className="button-container">
                      <h3 className="contract-title">Withdraw Your Bet</h3>
                      {(bettor.betterA.amount > 0 ||
                        bettor.betterB.amount > 0) && (
                        <button className="button" onClick={() => withdraw()}>
                          Withdraw All
                        </button>
                      )}
                    </div>
                  </>
                </section>
              )}
            </div>
          </div>
          <span className="tooltip">
            <span className="help-icon">
              <h3>All Emitted Events</h3>
            </span>
            <span className="tooltiptext">
              {" "}
              <div className="events-container">
                <h1 className="title">Smart Contract Events</h1>
                <div className="events-grid">
                  {events.map((event, index) => (
                    <div className="event-card" key={index}>
                      <h2 className="event-name">{event.event}</h2>
                      <div className="event-details">
                        <p>
                          <strong>Block Number:</strong> {event.blockNumber}
                        </p>
                        <p>
                          <strong>Transaction Hash:</strong>{" "}
                          {event.transactionHash}
                        </p>
                        <p>
                          <strong>Arguments:</strong> {event.args.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </span>
          </span>
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
