import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import predMarketArtifact from "../../predMarket.json"; // Assuming correct path to the ABI and Bytecode

import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";
import Header from "../../components/Header";
import { getContractDetails, getContracts } from "../../data/contractStore";
import { useSigner } from "@thirdweb-dev/react";
import styles from "../../styles/[contractAddress].module.css";

import {
  convertWeiToUsd,
  convertUsdToWei,
} from "../../components/currencyConversionUtils";

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
  const [amountWon, setAmountWon] = useState("");

  const [calculatedRewardRiskA, setCalculatedRewardRiskA] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
    potB: null,
    bettersOnA: null,
  });
  const [calculatedRewardRiskB, setCalculatedRewardRiskB] = useState({
    potentialReward: null,
    reward: null,
    risk: null,
    totalBet: null,
    potA: null,
    bettersOnB: null,
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
        const amountWon = await contractInstance.getUserAmount();
        const amountWonUSD = await convertWeiToUsd(amountWon);
        setAmountWon(amountWonUSD);
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
        // Assuming each event object has an `event` property indicating the event's name
        const specificEvents = fetchedEvents.filter((evt) =>
          [
            "contractDeployed",
            "winnerDeclaredVoting" /* other event names here */,
            "underReview",
            "winnerFinalized",
          ].includes(evt.event)
        );
        setEvents(specificEvents); // Update state with filtered events
      } catch (error) {
        console.log(error, "event error");
      }
    }
  };

  const getLength = async () => {
    if (contractInstance) {
      try {
        const lengthA = await contractInstance.arrayOfBettersA();
        const lengthB = await contractInstance.arrayOfBettersB();
        setLengthOfArrays({ lengthA: lengthA.length, lengthB: lengthB.length });
        console.log(lengthA, "array log");
      } catch (error) {
        console.log("Error setting Array Lengths");
      }
    }
  };

  useEffect(() => {
    // Function to initialize or update component state based on the current account
    const initializeOrRefreshState = async () => {
      try {
        await findBettor();
        await getLength();
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

  useEffect(() => {
    findBettor();
    ifBoughtIn();
    // Function to handle account changes
    const handleAccountsChanged = (accounts) => {
      // You can add additional logic here if needed
      findBettor();
      setIfOwner();
      ifBoughtIn();
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

  // const calculateRewardRisk = async () => {
  //   if (contractInstance) {
  //     try {
  //       if (bettor?.betterA?.amount != null || betA > 0 || reductionA > 0) {
  //         const betamountA = ethers.utils.parseEther(betA || "0");
  //         const contractFunctionA = contractInstance.winLossBetA;
  //         let potentialReward, reward, risk, totalBet, potB;

  //         if (reductionA > 0) {
  //           [potentialReward, reward, risk, totalBet, potB] =
  //             await contractFunctionA(
  //               ethers.utils.parseEther(reductionA),
  //               false
  //             );
  //         } else {
  //           [potentialReward, reward, risk, totalBet, potB] =
  //             await contractFunctionA(betamountA, true);
  //         }
  //         console.log("potentialReward", potentialReward);
  //         console.log("reward", reward);
  //         console.log("risk", risk);
  //         console.log("totalBet ", totalBet.toString());
  //         setCalculatedRewardRiskA({
  //           potentialReward: potentialReward.toString(),
  //           reward: reward.toString(),
  //           risk: risk.toString(),
  //           totalBet: totalBet.toString(),
  //           potB: potB.toString(),
  //         });
  //       }
  //       if (bettor?.betterB?.amount != null || betB > 0 || reductionB > 0) {
  //         const betAmountB = ethers.utils.parseEther(betB || "0");
  //         const contractFunctionB = contractInstance.winLossBetB;
  //         let potentialReward, reward, risk, totalBet, potA;

  //         if (reductionB > 0) {
  //           [potentialReward, reward, risk, totalBet, potA] =
  //             await contractFunctionB(
  //               ethers.utils.parseEther(reductionB),
  //               false
  //             );
  //         } else {
  //           [potentialReward, reward, risk, totalBet, potA] =
  //             await contractFunctionB(betAmountB, true);
  //         }
  //         console.log("potentialReward", potentialReward);
  //         console.log("reward", reward);
  //         console.log("risk", risk);

  //         setCalculatedRewardRiskB({
  //           potentialReward: potentialReward.toString(),
  //           reward: reward.toString(),
  //           risk: risk.toString(),
  //           totalBet: totalBet.toString(),
  //           potA: potA.toString(),
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error calculating reward and risk:", error);
  //       setCalculatedRewardRiskA({
  //         potentialReward: null,
  //         reward: null,
  //         risk: null,
  //         totalBet: null,
  //         potB: null,
  //       });
  //       setCalculatedRewardRiskB({
  //         potentialReward: null,
  //         reward: null,
  //         risk: null,
  //         totalBet: null,
  //         potA: null,
  //       });
  //     }
  //   } else {
  //     setCalculatedRewardRiskA({
  //       potentialReward: null,
  //       reward: null,
  //       risk: null,
  //       totalBet: null,
  //       potB: null,
  //     });
  //     setCalculatedRewardRiskB({
  //       potentialReward: null,
  //       reward: null,
  //       risk: null,
  //       totalBet: null,
  //       potA: null,
  //     });
  //   }
  // };
  const calculateRewardRisk = async () => {
    if (contractInstance) {
      try {
        if (bettor?.betterA?.amount != null || betA > 0 || reductionA > 0) {
          const betamountA = await convertUsdToWei(betA || "0");
          const reductionAA = await convertUsdToWei(reductionA || "0");
          const contractFunctionA = contractInstance.winLossBetA;
          let potentialReward, reward, risk, totalBet, potB, bettersOnA;

          if (reductionA > 0) {
            [potentialReward, reward, risk, totalBet, potB, bettersOnA] =
              await contractFunctionA(reductionAA, false);
          } else {
            [potentialReward, reward, risk, totalBet, potB, bettersOnA] =
              await contractFunctionA(betamountA, true);
          }
          console.log("potentialReward", potentialReward);
          console.log("reward", reward);
          console.log("risk", risk);
          console.log("totalBet ", totalBet.toString());
          const potentialRewardUSD = await convertWeiToUsd(potentialReward);
          const rewardUSD = await convertWeiToUsd(reward);
          const riskUSD = await convertWeiToUsd(risk);
          const totalBetUSD = await convertWeiToUsd(totalBet);
          const potBUSD = await convertWeiToUsd(potB);

          setCalculatedRewardRiskA({
            potentialReward: potentialRewardUSD.toFixed(2).toString(),
            reward: rewardUSD.toFixed(2).toString(),
            risk: riskUSD.toFixed(2).toString(),
            totalBet: totalBetUSD.toFixed(2).toString(),
            potB: potBUSD.toFixed(2).toString(),
            bettersOnA: bettersOnA.toString(),
          });
        }
        if (bettor?.betterB?.amount != null || betB > 0 || reductionB > 0) {
          const betAmountB = await convertUsdToWei(betB || "0");
          const reductionBB = await convertUsdToWei(reductionB || "0");
          const contractFunctionB = contractInstance.winLossBetB;
          let potentialReward, reward, risk, totalBet, potA, bettersOnB;

          if (reductionB > 0) {
            [potentialReward, reward, risk, totalBet, potA, bettersOnB] =
              await contractFunctionB(reductionBB, false);
          } else {
            [potentialReward, reward, risk, totalBet, potA, bettersOnB] =
              await contractFunctionB(betAmountB, true);
          }
          console.log("potentialReward", potentialReward);
          console.log("reward", reward);
          console.log("risk", risk);
          const potentialRewardUSD = await convertWeiToUsd(potentialReward);
          const rewardUSD = await convertWeiToUsd(reward);
          const riskUSD = await convertWeiToUsd(risk);
          const totalBetUSD = await convertWeiToUsd(totalBet);
          const potAUSD = await convertWeiToUsd(potA);

          setCalculatedRewardRiskB({
            potentialReward: potentialRewardUSD.toFixed(2).toString(),
            reward: rewardUSD.toFixed(2).toString(),
            risk: riskUSD.toFixed(2).toString(),
            totalBet: totalBetUSD.toFixed(2).toString(),
            potA: potAUSD.toFixed(2).toString(),
            bettersOnB: bettersOnB.toString(),
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
          bettersOnA: null,
        });
        setCalculatedRewardRiskB({
          potentialReward: null,
          reward: null,
          risk: null,
          totalBet: null,
          potA: null,
          bettersOnB: null,
        });
      }
    } else {
      setCalculatedRewardRiskA({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
        potB: null,
        bettersOnA: null,
      });
      setCalculatedRewardRiskB({
        potentialReward: null,
        reward: null,
        risk: null,
        totalBet: null,
        potA: null,
        bettersOnB: null,
      });
    }
  };

  // Assuming import of the conversion utility functions

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
        // Convert USD input to wei for the contract
        const betAmountInWei = await convertUsdToWei(betA ? betA : betB);

        if (betA && !betB) {
          const tx = await contractInstance.betOnBetA({
            value: betAmountInWei,
          });

          await tx.wait();
        } else if (betB && !betA) {
          const tx = await contractInstance.betOnBetB({
            value: betAmountInWei,
          });

          await tx.wait();
        } else {
          alert("Invalid bet configuration");
        }

        console.log("Bet placed");
      } catch (error) {
        console.error("Error placing bet on:", error);
      }
    }
  };
  // const betOnOption = async () => {
  //   if (!boughtIn) {
  //     alert("Please Buy Into Bet First");
  //     return;
  //   }
  //   if (reductionA > 0 || reductionB > 0) {
  //     alert("Please clear the reduction amount before placing a bet.");
  //     return;
  //   }
  //   if (betA > 0 && betB > 0) {
  //     alert("Please Only Place 1 Bet At A Time");
  //     return;
  //   }
  //   if (betA <= 0 && betB <= 0) {
  //     alert("Please Enter A Bet");
  //     return;
  //   }
  //   if (contractInstance && (betA || betB)) {
  //     try {
  //       if (betA && !betB) {
  //         const tx = await contractInstance.betOnBetA({
  //           value: ethers.utils.parseEther(betA),
  //         });
  //         updateBetterMongoDB(contractAddress, signer);
  //         await tx.wait();
  //       } else if (betB && !betA) {
  //         const tx = await contractInstance.betOnBetB({
  //           value: ethers.utils.parseEther(betB),
  //         });
  //         updateBetterMongoDB(contractAddress, signer);
  //         await tx.wait();
  //       } else {
  //         alert("invalid bet configuration");
  //       }

  //       console.log(`Bet placed }`);
  //     } catch (error) {
  //       console.error(`Error placing bet on:`, error);
  //     }
  //   }
  // };
  const buyInBet = async () => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.payBuyIn({
          value: contract.buyIn,
        });

        await tx.wait();
        updateBetterMongoDB(contractAddress, signer);
      } catch (error) {
        console.error(`Error buyingIn:`, error);
      }
    }
  };
  const reduceBet = async () => {
    if (!contractInstance) {
      console.error("Contract instance not available.");
      return;
    }

    let betType;
    let reductionUsd; // Assume this is the amount the user wants to reduce, in USD
    if (reductionA > 0 && reductionB <= 0) {
      betType = "BetA";
      reductionUsd = reductionA; // Assuming reductionA is in USD
    } else if (reductionA <= 0 && reductionB > 0) {
      betType = "BetB";
      reductionUsd = reductionB; // Assuming reductionB is in USD
    } else {
      alert("Cannot reduce 2 or no bets");
      return; // Exit the function if neither condition is met
    }

    try {
      // Convert the USD reduction amount to wei
      const reductionWei = await convertUsdToWei(reductionUsd);

      // Adjust this part to match the parameters expected by your contract method for reduction
      const tx = await contractInstance[`reduce${betType}`](reductionWei);

      await tx.wait();
      console.log(`Bet reduced on ${betType}`);
    } catch (error) {
      console.error(`Error reducing bet on ${betType}:`, error);
    }
  };

  // const reduceBet = async () => {
  //   // This checks seem unnecessary based on the task description and have been removed:
  //   // if (betA > 0 || betB > 0) { ... }

  //   if (!contractInstance) {
  //     console.error("Contract instance not available.");
  //     return;
  //   }

  //   let betType;
  //   let reduction;
  //   if (reductionA > 0 && reductionB <= 0) {
  //     betType = "BetA";
  //     reduction = reductionA;
  //   } else if (reductionA <= 0 && reductionB > 0) {
  //     betType = "BetB";
  //     reduction = reductionB;
  //   } else {
  //     alert("Cannot reduce 2 or no bets");
  //     return; // Exit the function if neither condition is met
  //   }

  //   try {
  //     // Assuming `reduction` is a predefined value that you want to reduce the bet by.
  //     // You'll need to adjust this part to match the parameters expected by your contract method.
  //     const tx = await contractInstance[`reduce${betType}`](
  //       ethers.utils.parseEther(reduction)
  //     );

  //     await tx.wait();
  //     console.log(`Bet reduced on ${betType}`);
  //   } catch (error) {
  //     console.error(`Error reducing bet on ${betType}:`, error);
  //   }
  // };

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
    if (contractInstance) {
      console.log(winnerPot, "winner pot is");
      try {
        const tx = await contractInstance.endBetOwner(winnerPot);
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
  const endBetStaff = async (
    winnerPot,
    disagreedUserCorrect,
    isOwnerCorrect
  ) => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.endBetStaff(
          winnerPot,
          disagreedUserCorrect,
          isOwnerCorrect
        );
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
  const sendMoney = async () => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.assignEveryoneAmount();
        await tx.wait();
        console.log("Can Withdraw");
      } catch (error) {
        console.log("error assigning amounts");
      }
    }
  };
  const disagreeVote = async (disagreementText) => {
    if (contractAddress) {
      try {
        const tx = await contractInstance.voteDisagree({
          value: ethers.utils.parseEther("0.05"),
        });
        await tx.wait();
        console.log("voted disagree");

        const address = contractAddress;

        // Now, include the disagreementText in the request to the server
        const response = await fetch(
          "http://localhost:3001/moveToDisagreements",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ address, disagreementText }), // Include disagreement text here
          }
        );

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Server responded with error: ${errorMessage}`);
        }

        console.log("Contract moved to Disagreements collection successfully");
      } catch (error) {
        console.log(error, "Couldn't vote or move contract");
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
        await setIfOwner();

        console.log("signer Address is : " + signerAddress);

        // Check if the bettor has a non-zero amount in only one of the bets

        // Make API call to remove bettor from MongoDB
        if (owner != true) {
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
        }
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
            {calculatedRewardRiskB && calculatedRewardRiskA && (
              <aside
                className="contract-section"
                style={{ textAlign: "center" }}
              >
                <div className="pots-container">
                  <div className="pot">
                    <h1>
                      {contract.eventA} : {calculatedRewardRiskB.potA}
                    </h1>
                    <h5>Betters: {calculatedRewardRiskA.bettersOnA}</h5>
                  </div>
                  <div className="pot">
                    <h1>
                      {contract.eventB} : {calculatedRewardRiskA.potB}
                      <h5>Betters: {calculatedRewardRiskB.bettersOnB}</h5>
                    </h1>
                  </div>
                </div>
                {statusOfMarket === 0 ? (
                  <div
                    style={{
                      background:
                        "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)", // Lively gradient background
                      padding: "10px",
                      borderRadius: "10px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Soft shadow for depth
                      color: "white", // White text color for better contrast
                    }}
                  >
                    <h4 style={{ fontWeight: "bold", textAlign: "center" }}>
                      Time left to bet:
                    </h4>
                    <CountdownTimer
                      endTime={contract.endTime}
                      style={{
                        fontSize: "20px", // Larger font size for the countdown
                        fontWeight: "bold",
                        textAlign: "center", // Center align text
                        color: "#ffeb3b", // Make the countdown numbers stand out
                      }}
                    />
                  </div>
                ) : statusOfMarket === 1 ? (
                  Date.now() < contract.voteTime * 1000 && (
                    <div
                      style={{
                        background:
                          "linear-gradient(to right, #ff512f 0%, #dd2476 100%)", // Another gradient background
                        padding: "10px",
                        borderRadius: "10px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Soft shadow for depth
                        color: "white", // White text color for better contrast
                      }}
                    >
                      <h4 style={{ fontWeight: "bold", textAlign: "center" }}>
                        Vote time:
                      </h4>
                      <CountdownTimer
                        endTime={contract.voteTime}
                        style={{
                          fontSize: "20px", // Larger font size for the countdown
                          fontWeight: "bold",
                          textAlign: "center", // Center align text
                          color: "#ffeb3b", // Make the countdown numbers stand out
                        }}
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
                            ? calculatedRewardRiskA.potentialReward
                            : "N/A"}
                        </p>
                        <p>
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Reward A:{" "}
                              {calculatedRewardRiskA.reward
                                ? calculatedRewardRiskA.reward
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              Thhis means if the bet ended now, based on the
                              bets on Event A and B, you would Win:{" "}
                              {calculatedRewardRiskA.reward}{" "}
                            </span>
                          </span>
                        </p>
                        <p>
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Risk A:{" "}
                              {calculatedRewardRiskA.risk
                                ? calculatedRewardRiskA.risk
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              This means if the bet ended now, based on the bets
                              on Event A and B, you would lose:{" "}
                              {calculatedRewardRiskA.risk}{" "}
                            </span>
                          </span>
                        </p>
                        <p>
                          Total Amount Bet:{" "}
                          {calculatedRewardRiskA.totalBet
                            ? calculatedRewardRiskA.totalBet
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
                            ? calculatedRewardRiskB.potentialReward
                            : "N/A"}
                        </p>
                        <p>
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Reward B:{" "}
                              {calculatedRewardRiskB.reward
                                ? calculatedRewardRiskB.reward
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              This means if the bet ended now, based on the bets
                              on Event A and B, you would Win:{" "}
                              {calculatedRewardRiskB.reward}{" "}
                            </span>
                          </span>
                        </p>
                        <p>
                          <span className="tooltip">
                            <span className="help-icon">
                              Current Risk B:{" "}
                              {calculatedRewardRiskB.risk
                                ? calculatedRewardRiskB.risk
                                : "N/A"}
                            </span>
                            <span
                              className="tooltiptext"
                              style={{ marginLeft: "-55px" }}
                            >
                              This means if the bet ended now, based on the bets
                              on Event A and B, you would lose{" "}
                              {calculatedRewardRiskB.risk}{" "}
                            </span>
                          </span>
                        </p>

                        <p>
                          Total Amount Bet:{" "}
                          {calculatedRewardRiskB.totalBet
                            ? calculatedRewardRiskB.totalBet
                            : 0}
                        </p>
                      </div>
                    )}
                    <ul class="horizontal-list">
                      {boughtIn && (
                        <span className="tooltip">
                          <span className="help-icon">
                            <button onClick={() => betOnOption()}>
                              Place Bet
                            </button>
                          </span>
                          <span className="tooltiptext">
                            {" "}
                            The total amount that you will withdraw if you win
                            is what you are Rewarded + Total Amount Bet (
                            {calculatedRewardRiskA.reward} +{" "}
                            {calculatedRewardRiskA.totalBet} ={" "}
                            {calculatedRewardRiskA.reward +
                              calculatedRewardRiskA.totalBet}
                            )
                          </span>
                        </span>
                      )}

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
                        <button
                          onClick={() => buyInBet()}
                          style={{
                            background:
                              "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)", // Lively gradient background
                            padding: "10px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Soft shadow for depth
                            color: "white", // White text color for better contrast
                          }}
                        >
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

              {statusOfMarket === 1 && (
                <>
                  <input
                    type="text"
                    id="disagreementText"
                    placeholder="Enter your disagreement reason here"
                  />

                  <button
                    onClick={() => {
                      const disagreementText =
                        document.getElementById("disagreementText").value;
                      disagreeVote(disagreementText);
                    }}
                  >
                    Disagree Button
                  </button>
                </>
              )}
              {statusOfMarket === 2 && (
                <section className="contract-section">
                  <>
                    <div>
                      A Disagreement Has Been Submitted, please wait for review.
                    </div>
                  </>
                </section>
              )}

              {statusOfMarket === 4 && (
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
                      <h3> Amount available to Withdraw {amountWon} </h3>
                    </div>
                  </>
                </section>
              )}
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

        {/* <section
          className="contract-section"
          style={{
            backgroundColor: "#f0f2f5", // Light grey background for the section
            padding: "20px", // Padding around the entire section
            borderRadius: "8px", // Rounded corners for the section
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
            margin: "20px 0", // Margin for spacing from other elements
          }}
        >
          <h2
            style={{
              color: "#333", // Dark grey color for headings
              borderBottom: "2px solid #007bff", // Blue bottom border for the h2
              paddingBottom: "10px", // Padding bottom to space out the text from the border
            }}
          >
            All Events
          </h2>
          <div style={{ marginTop: "15px" }}>
            {events.length > 0 ? (
              <div>
                {events.map((evt, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "10px",
                      margin: "10px 0",
                      backgroundColor: "#ffffff", // White background for each event item
                      borderRadius: "5px", // Rounded corners for event items
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Shadow for each event item
                    }}
                  >
                    {evt.event === "contractDeployed" && (
                      <p style={{ color: "#4CAF50" }}>
                        Contract Deployed Event:{" "}
                        {new Date(
                          evt.args.timeStamp.toNumber() * 1000
                        ).toLocaleString()}
                      </p>
                    )}
                    {evt.event === "winnerDeclaredVoting" && (
                      <p style={{ color: "#007bff" }}>
                        {evt.args.winnerIs === 0 && (
                          <span>Winner is: {contract.eventA}</span>
                        )}
                        {evt.args.winnerIs === 1 && (
                          <span>Winner is: {contract.eventB}</span>
                        )}
                        {evt.args.winnerIs === 2 && (
                          <span>Event cancelled or draw</span>
                        )}
                        {" You May Vote and Disagree Until: " +
                          new Date(
                            evt.args.votingTime.toNumber() * 1000
                          ).toLocaleString()}
                      </p>
                    )}
                    {evt.event === "underReview" && (
                      <p style={{ color: "orange" }}>
                        Disagrement Submitted: Under Review
                      </p>
                    )}
                    {evt.event === "winnerFinalized" && (
                      <p style={{ color: "green" }}>
                        {evt.args.winnerIs === 0 && (
                          <span>
                            Winner Finalized is: {contract.eventA} You May
                            Withdraw
                          </span>
                        )}
                        {evt.args.winnerIs === 1 && (
                          <span>
                            Winner Finalized is: {contract.eventB} You May
                            Withdraw
                          </span>
                        )}
                        {evt.args.winnerIs === 2 && (
                          <span>Event cancelled or draw You May Withdraw</span>
                        )}
                      </p>
                    )}
                    {/* Add additional event types here as needed */}
        {/* </div>
                ))}
              </div>
            ) : (
              <p>No specific events found.</p>
            )}
          </div>

          <h2
            style={{
              color: "#333",
              borderBottom: "2px solid #007bff",
              paddingBottom: "10px",
              marginTop: "20px", // Added spacing from the events to the details section
            }}
          >
            All Details
          </h2>
          <div className="detail" style={{ marginTop: "10px" }}>
            <input
              type="checkbox"
              id="betADetails"
              className="toggle-checkbox"
              style={{ marginRight: "5px" }} // Space between checkbox and label
            />
            <label
              htmlFor="betADetails"
              className="detail-label"
              style={{ fontWeight: "bold", cursor: "pointer" }}
            >
              Bet A Details
            </label>
            <div
              className="content"
              style={{
                marginTop: "5px",
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {contract.ConditionOfMarket.betADetails}
            </div>
          </div>

          <div className="detail">
            <input
              type="checkbox"
              id="betBDetails"
              className="toggle-checkbox"
            />
            <label htmlFor="betBDetails" className="detail-label">
              Bet B Details
            </label>
            <div className="content">
              {contract.ConditionOfMarket.betBDetails}
            </div>
          </div>

          <div className="detail">
            <input
              type="checkbox"
              id="eventTiming"
              className="toggle-checkbox"
            />
            <label htmlFor="eventTiming" className="detail-label">
              Event Timing
            </label>
            <div className="content">
              {contract.ConditionOfMarket.eventTiming}
            </div>
          </div>

          <div className="detail">
            <input
              type="checkbox"
              id="informationSources"
              className="toggle-checkbox"
            />
            <label htmlFor="informationSources" className="detail-label">
              Information Sources/ Irrefutable Source Of Truth
            </label>
            <div className="content">
              {contract.ConditionOfMarket.informationSources}
            </div>
          </div>

          <div className="detail">
            <input
              type="checkbox"
              id="totalReward"
              className="toggle-checkbox"
            />
            <label htmlFor="totalReward" className="detail-label">
              Total Reward Calculation
            </label>
            <div className="content">
              {`The total amount that you will withdraw if you win is what you are Rewarded + Total Amount Bet (${
                calculatedRewardRiskA.reward
              } + ${calculatedRewardRiskA.totalBet} = ${
                calculatedRewardRiskA.reward + calculatedRewardRiskA.totalBet
              })`}
            </div>
          </div>
        </section> */}

        <section
          className="contract-section"
          style={{
            backgroundColor: "#f0f2f5", // Light grey background for the section
            padding: "20px", // Padding around the entire section
            borderRadius: "8px", // Rounded corners for the section
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
            margin: "20px auto", // Center the section with auto margins on the sides
            maxWidth: "800px", // Max width for the content
            display: "block", // Use block display to utilize margin auto for centering
          }}
        >
          <h2
            style={{
              color: "#333", // Dark grey color for headings
              borderBottom: "2px solid #007bff", // Blue bottom border for the h2
              paddingBottom: "10px", // Padding bottom to space out the text from the border
            }}
          >
            All Events
          </h2>
          <div style={{ marginTop: "15px" }}>
            {events.length > 0 ? (
              events.map((evt, index) => (
                <div
                  key={index}
                  style={{
                    padding: "8px 10px", // Matching padding to detail sections for consistency
                    margin: "8px 0", // Reduced margin to match detail sections
                    backgroundColor: "#ffffff", // White background for each event item
                    borderRadius: "5px", // Rounded corners for a softer look
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)", // Lighter shadow for subtlety
                    transition: "all 0.3s ease", // Smooth transition for a consistent feel
                  }}
                >
                  {evt.event === "contractDeployed" && (
                    <p style={{ color: "#007bff" }}>
                      {" "}
                      {/* Light blue for consistency */}
                      Contract Deployed Event:{" "}
                      {new Date(
                        evt.args.timeStamp.toNumber() * 1000
                      ).toLocaleString()}
                    </p>
                  )}
                  {evt.event === "winnerDeclaredVoting" && (
                    <p style={{ color: "#007bff" }}>
                      {" "}
                      {/* Adjusted to light blue */}
                      {evt.args.winnerIs === 0 && (
                        <span>Winner is: {contract.eventA}</span>
                      )}
                      {evt.args.winnerIs === 1 && (
                        <span>Winner is: {contract.eventB}</span>
                      )}
                      {evt.args.winnerIs === 2 && (
                        <span>Event cancelled or draw</span>
                      )}
                      {" You May Vote and Disagree Until: " +
                        new Date(
                          evt.args.votingTime.toNumber() * 1000
                        ).toLocaleString()}
                    </p>
                  )}
                  {evt.event === "underReview" && (
                    <p style={{ color: "orange" }}>
                      Disagreement Submitted: Under Review
                    </p>
                  )}
                  {evt.event === "winnerFinalized" && (
                    <p style={{ color: "green" }}>
                      {evt.args.winnerIs === 0 && (
                        <span>
                          Winner Finalized is: {contract.eventA} You May
                          Withdraw
                        </span>
                      )}
                      {evt.args.winnerIs === 1 && (
                        <span>
                          Winner Finalized is: {contract.eventB} You May
                          Withdraw
                        </span>
                      )}
                      {evt.args.winnerIs === 2 && (
                        <span>Event cancelled or draw You May Withdraw</span>
                      )}
                    </p>
                  )}
                  {/* Additional event types here as needed */}
                </div>
              ))
            ) : (
              <p>No specific events found.</p>
            )}
          </div>

          <h2
            style={{
              color: "#333",
              borderBottom: "2px solid #007bff",
              paddingBottom: "10px",
              marginTop: "20px", // Added spacing from the events to the details section
            }}
          >
            All Details
          </h2>
          {/* Detail sections with updated labels */}
          {[
            "Bet A Details",
            "Bet B Details",
            "Event Timing Details",
            "Irrefutable Source Of Truth",
            "Payout Calculations",
          ].map((detailLabel, i) => (
            <div
              className="detail"
              key={i}
              style={{
                marginTop: "8px", // Reduced space between each detail for compactness
                marginBottom: "8px", // Consistent margin at the bottom
                backgroundColor: "#fff", // Background color for the detail section
                padding: "8px 10px", // Slightly reduced padding for content focus
                borderRadius: "5px", // Rounded corners for a softer look
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)", // Lighter shadow for subtlety
                transition: "all 0.3s ease", // Smooth transition for hover effects
              }}
            >
              <input
                type="checkbox"
                id={`detail-${i}`}
                className="toggle-checkbox"
                style={{ marginRight: "5px" }}
              />
              <label
                htmlFor={`detail-${i}`}
                className="detail-label"
                style={{
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "color 0.3s ease", // Smooth color transition on hover
                }}
              >
                {detailLabel}
              </label>
              <div
                className="content"
                style={{
                  marginTop: "5px",
                  transition: "opacity 0.3s ease", // Smooth transition for content appearance
                }}
              >
                {/* Dynamically rendering the content based on the index */}
                {i === 0 && contract.ConditionOfMarket.betADetails}
                {i === 1 && contract.ConditionOfMarket.betBDetails}
                {i === 2 && contract.ConditionOfMarket.eventTiming}
                {i === 3 && contract.ConditionOfMarket.informationSources}
                {i === 4 &&
                  `The total amount that you will withdraw if you win is what you are Rewarded + Total Amount Bet (${
                    calculatedRewardRiskA.reward
                  } + ${calculatedRewardRiskA.totalBet} = ${
                    calculatedRewardRiskA.reward +
                    calculatedRewardRiskA.totalBet
                  })`}
              </div>
            </div>
          ))}
        </section>

        {/* Exclusive Owner Actions */}
        {owner &&
          (statusOfMarket === 2 ? (
            <div className="button-container">
              <p>After the Betting Period Has Ended, Select the Outcome:</p>
              {/* Dropdown for selecting the outcome */}
              <select id="outcomeSelect" className="dropdown">
                <option value="0">Set Winner A</option>
                <option value="1">Set Winner B</option>
                <option value="2">Set Draw/Cancel</option>
              </select>

              <div>
                {/* Checkbox section for status */}
                <div>
                  <label>
                    <input type="checkbox" id="disagreementCheckbox" />
                    User Disagreement Correct
                  </label>
                </div>

                <div>
                  <label>
                    <input type="checkbox" id="ownerCheckbox" />
                    Owner Originally Correct
                  </label>
                </div>

                {/* Button to submit the user's choice */}
                <button
                  className="button"
                  onClick={() => {
                    // Retrieve the selected outcome from the dropdown
                    const selectedOutcome =
                      document.getElementById("outcomeSelect").value;

                    // Check the status of the disagreement checkbox
                    const disagreementStatus = document.getElementById(
                      "disagreementCheckbox"
                    ).checked;

                    // Check if the owner was originally correct
                    const ownerIsCorrect =
                      document.getElementById("ownerCheckbox").checked;

                    // Call the function to end the bet with the staff's decision
                    endBetStaff(
                      parseInt(selectedOutcome, 10),
                      disagreementStatus,
                      ownerIsCorrect
                    );
                  }}
                >
                  Submit Choice
                </button>
              </div>
              <button className="button" onClick={() => sendMoney()}>
                Send Amounts Back
              </button>
            </div>
          ) : (
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
              <button className="button" onClick={() => sendMoney()}>
                Send Amounts Back
              </button>
            </div>
          ))}
      </main>
    </>
  );
};

export default MarketInteractionPage;
