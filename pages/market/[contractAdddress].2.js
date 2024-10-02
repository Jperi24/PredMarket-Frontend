import { ethers } from "ethers";
import predMarketArtifact from "../../predMarketV2.json"; // path to the ABI and Bytecode
import Modal from "../../components/Modal";
import { useSigner } from "@thirdweb-dev/react";
import Header from "../../components/Header";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";
import { resultKeyNameFromField } from "@apollo/client/utilities";
// import dotenv from "dotenv";
// dotenv.config();

export default function PredMarketPageV2() {
  const [contractInstance, setContractInstance] = useState(null);
  const signer = useSigner();
  const commonChains = {
    56: {
      chainName: "Binance Smart Chain",
      rpcUrl: "https://bsc-dataseed.binance.org/",
      nativeCurrency: {
        name: "Binance Coin",
        symbol: "BNB",
        decimals: 18,
      },
      blockExplorerUrls: ["https://bscscan.com"],
    },
    137: {
      chainName: "Polygon Mainnet",
      rpcUrl: "https://polygon-rpc.com/",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      blockExplorerUrls: ["https://polygonscan.com"],
    },
    43114: {
      chainName: "Avalanche C-Chain",
      rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
      nativeCurrency: {
        name: "Avalanche",
        symbol: "AVAX",
        decimals: 18,
      },
      blockExplorerUrls: ["https://snowtrace.io"],
    },
    250: {
      chainName: "Fantom Opera",
      rpcUrl: "https://rpc.ftm.tools/",
      nativeCurrency: {
        name: "Fantom",
        symbol: "FTM",
        decimals: 18,
      },
      blockExplorerUrls: ["https://ftmscan.com"],
    },
    31337: {
      chainName: "Hardhat Localhost",
      rpcUrl: "http://127.0.0.1:8545/",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      blockExplorerUrls: [],
    },
  };

  const [myLocked, setmyLocked] = useState(null);
  const [buyInIChoose, setbuyInIChoose] = useState(null);
  const [condition, setCondition] = useState(null);
  const [showInputs, setShowInputs] = useState(false);
  const [contract, setContract] = useState(null);
  const router = useRouter();

  const [signerAddress, setSignerAddress] = useState(null);
  const [newPrice, setnewPrice] = useState(null);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);
  const { contractAddress } = router.query;
  const [selectedBets, setSelectedBets] = useState([]);
  const [betPrices, setBetPrices] = useState({});
  const [chain, setChain] = useState(null);
  const [netWorkMismatch, setNetworkMismatch] = useState(true);
  const [disagreeText, setDisagreeText] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [winnerOfSet, setWinnerOfSet] = useState("0");
  const [selectedOutcome2, setSelectedOutcome2] = useState("0");
  const [deployerLocked, setDeployerLocked] = useState("");
  const [isBettingOpen, setIsBettingOpen] = useState("");
  const [isVotingTime, setIsVotingTime] = useState("");
  const [isBettingClosed, setIsBettingClosed] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalAction, setModalAction] = useState(null);
  const [isDisagreementState, setIsDisagreementState] = useState("");
  const [contractBalance, setContractBalance] = useState("");
  const [newDeployedPrices, setNewDeployedPrices] = useState({});
  const [newAskingPrices, setNewAskingPrices] = useState({});

  const [bets_balance, setbetsbalance] = useState({
    allbets: [],
    endTime: 0,
    winner: 0,
    state: 0,
    endOfVoting: 0,
    winnings: 0,
  });
  const [filter, setFilter] = useState("forSale");
  const betsContainerRef = useRef(null);

  useEffect(() => {
    if (betsContainerRef.current) {
      betsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filter]);

  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = Math.floor(Date.now() / 1000);
      console.log(newTime, "new time"); // Log the converted timestamp
      setCurrentTime(newTime);
      console.log(
        isBettingOpen,
        isVotingTime,
        "-< Is voting time",
        isBettingClosed,
        isDisagreementState,
        bets_balance.voteTime
      );
    }, 10000);

    return () => clearInterval(interval); // Clean up the interval
  }, []);

  useEffect(() => {
    const updateStates = () => {
      console.log(bets_balance.state);
      setIsBettingOpen(
        bets_balance.state === 0 && currentTime < bets_balance.endTime
      );
      setIsVotingTime(
        (bets_balance.state === 1 && currentTime < contract.voteTime) ||
          (bets_balance.state === 0 && currentTime > bets_balance.endTime)
      );
      setIsBettingClosed(
        bets_balance.state === 0 && currentTime > bets_balance.endTime
      );
      setIsDisagreementState(bets_balance.state === 2);
    };

    updateStates();
  }, [bets_balance, currentTime, contract]);

  useEffect(() => {
    const deployContract = async () => {
      if (
        signer &&
        contract &&
        contractAddress &&
        typeof window.ethereum !== "undefined"
      ) {
        const tempContractInstance = new ethers.Contract(
          contractAddress,
          predMarketArtifact.abi,
          signer
        );

        if (signer) {
          const saddress = await signer.getAddress();
          setSignerAddress(saddress);

          const network = await signer.provider.getNetwork();
          console.log("This is the network", network);

          if (contract && contract.chain && contract.chain.chainId) {
            const expectedChainId = contract.chain.chainId;

            if (network.chainId !== expectedChainId) {
              setNetworkMismatch(true);
            } else {
              setNetworkMismatch(false);
              console.log("Live on chain: ", network.chainId);
              setContractInstance(tempContractInstance);
              const deployerLockedStatus =
                await tempContractInstance.creatorLocked();
              setDeployerLocked(
                ethers.utils.formatEther(deployerLockedStatus.toString())
              );
              displayAllBets();

              setChain(commonChains[network.chainId]);

              const balance = await signer.provider.getBalance(contractAddress);

              // ethers.js uses BigNumber to handle large numbers; convert the balance from Wei to Ether
              const balanceInEther = ethers.utils.formatEther(balance);
              setContractBalance(balanceInEther);
            }
          } else {
            console.error("Contract or contract.chain.chainId is not defined");
          }
        }
      }
    };

    if (contractAddress) {
      deployContract();
    }
  }, [contractAddress, signer, contract]);

  const updateBetterMongoDB = async (address, signerAddress) => {
    try {
      // Correctly construct the URL using template literals

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateBetterMongoDB`;

      // Make the POST request
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress: address,
          better: signerAddress,
        }),
      });
    } catch (error) {
      console.error("Error updating MongoDB:", error);
    }
  };

  const handleConfirm = async () => {
    setShowModal(false);
    if (modalAction) {
      await modalAction();
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const bigNumberToString = (bigNumber) =>
    parseInt(bigNumber._hex, 16).toString();

  const sellANewBet = async (myBet, buyIn, selectedOutcome) => {
    console.log(myBet);
    console.log(buyIn);
    console.log(selectedOutcome);
    if (contractInstance) {
      try {
        const total = parseFloat(myBet) + parseFloat(buyIn);
        const reverseSelected = selectedOutcome === "1" ? "2" : "1";
        const selectedName =
          selectedOutcome === "1" ? contract.eventA : contract.eventB;
        const valueInWei = ethers.utils.parseEther(myBet.toString());
        const valueInWeiBuyIn = ethers.utils.parseEther(buyIn.toString());

        setModalContent(
          `<p>You are depositing <strong>${myBet} ETH</strong>. If <strong>${selectedName}</strong> wins and another user buys this bet for <strong>${buyIn} ETH</strong>, you will be rewarded <strong>${total} ETH</strong>. If another user does not buy in by the time the deployer of the bet declares a winner, you will be refunded <strong>${myBet} ETH</strong>. You are eligible to unlist this bet at any time. Do you accept the terms?</p>`
        );
        setModalAction(() => async () => {
          try {
            // Attempt to execute the smart contract function
            const tx = await contractInstance.sellANewBet(
              valueInWeiBuyIn,
              reverseSelected,
              {
                value: valueInWei,
              }
            );
            await tx.wait(); // Wait for the transaction to be mined

            // Update the database after the transaction is successful
            await updateBetterMongoDB(contractAddress, signerAddress);
          } catch (error) {
            // Log the error or handle it as needed
            console.error("Error occurred:", error);
            alert("Failed to complete the transaction. Please try again.");
          }
        });

        setShowModal(true);
      } catch (error) {
        console.log("Can't send new bet, this whyyyy");
        console.log(error);
      }
    } else {
      alert("Please Connect Wallet");
    }
  };

  const unlistBet = async (positionsArray) => {
    try {
      const positions = Array.isArray(positionsArray)
        ? positionsArray
        : [positionsArray];

      const tx = await contractInstance.unlistBets(positions);
      await tx.wait();
      setSelectedBets([]);
    } catch (error) {
      console.log("Can't unlist bet, this is why:");
      console.log(error);
    }
  };

  const buyBet = async (positionInArray, purchasePrice) => {
    try {
      const selectedName =
        bets_balance.allbets[positionInArray].conditionForBuyerToWin === 1
          ? contract.eventA
          : contract.eventB;

      const buyerPrice =
        bets_balance.allbets[positionInArray].amountBuyerLocked > 0
          ? bets_balance.allbets[positionInArray].amountBuyerLocked
          : bets_balance.allbets[positionInArray].amountToBuyFor;

      // Assuming you already have a web3 instance initialized
      const buyerPriceEth = ethers.utils.formatEther(buyerPrice, "ether");

      const winnings =
        parseFloat(
          ethers.utils.formatEther(
            bets_balance.allbets[positionInArray].amountDeployerLocked
          )
        ) + parseFloat(ethers.utils.formatEther(buyerPrice));

      const purchasePriceString = ethers.utils.formatEther(purchasePrice);

      setModalContent(
        `<p>You are spending <strong>${purchasePriceString} ${chain.nativeCurrency.symbol}</strong> to buy into a bet that states: if <strong>${selectedName}</strong> wins, you will be rewarded <strong>${winnings} ${chain.nativeCurrency.symbol}</strong>. If the set is a tie or DQ you will be refunded <strong>${buyerPriceEth} ${chain.nativeCurrency.symbol}</strong></p>`
      );
      setModalAction(() => async () => {
        try {
          const tx = await contractInstance.buyABet(positionInArray, {
            value: purchasePrice,
          });
          await tx.wait();
          updateBetterMongoDB(contractAddress, signerAddress);
        } catch (error) {
          // Log the error or handle it as needed
          console.error("Error occurred:", error);
          alert("Failed to complete the transaction. Please try again.");
        }
      });
      setShowModal(true);
    } catch (error) {
      console.log(error);
    }
  };

  const listBetForSale = async (positionInArray, askingPrice) => {
    try {
      const valueInWei = ethers.utils.parseEther(askingPrice.toString());

      setModalContent(
        `<p>You are selling this bet for <strong>${askingPrice} ETH</strong> and will no longer be participating. Do you agree?</p>`
      );
      setModalAction(() => async () => {
        try {
          const tx = await contractInstance.sellAnExistingBet(
            positionInArray,
            valueInWei
          );
          await tx.wait();
        } catch (error) {
          // Log the error or handle it as needed
          console.error("Error occurred:", error);
          alert("Failed to complete the transaction. Please try again.");
        }
      });
      setShowModal(true);
    } catch (error) {
      console.log("Can't sell bet, this whyyyy");
      console.log(error);
    }
  };

  const editADeployedBet = async (
    positionInArray,
    newDeployedPriceInEth, // Expecting input in ETH
    newAskingPriceInEth // Expecting input in ETH
  ) => {
    try {
      // Convert new prices to Wei (smallest unit of Ether)
      const newDeployedPrice = ethers.utils.parseEther(
        newDeployedPriceInEth.toString()
      );
      const newAskingPrice = ethers.utils.parseEther(
        newAskingPriceInEth.toString()
      );

      // Fetch the current bet details
      const currentBet = await contractInstance.arrayOfBets(positionInArray);
      console.log("Current Bet:", currentBet);

      // Calculate the difference needed to cover the new deploy price
      const currentLockedAmount = ethers.BigNumber.from(
        currentBet.amountDeployerLocked.toString()
      );
      let valueInWei = ethers.BigNumber.from("0"); // Default to 0 if no additional value is needed

      if (currentLockedAmount.lt(newDeployedPrice)) {
        valueInWei = newDeployedPrice.sub(currentLockedAmount); // Difference needed in Wei
      }

      console.log("Additional Value in Wei:", valueInWei.toString());

      // Prepare modal content for user confirmation
      setModalContent(
        `<p>The new amount that you will have locked up is <strong>${newDeployedPriceInEth} ETH</strong> and the new purchase price for this bet is <strong>${newAskingPriceInEth} ETH</strong>. Do you agree?</p>`
      );

      // Define action for the modal confirmation
      setModalAction(() => async () => {
        try {
          // Call the smart contract function
          const tx = await contractInstance.editADeployedBet(
            positionInArray,
            newDeployedPrice,
            newAskingPrice,
            {
              value: valueInWei.toString(), // Pass additional value in Wei
            }
          );
          await tx.wait(); // Wait for transaction to be mined
          alert("Bet updated successfully!");
        } catch (error) {
          console.error("Transaction Error:", error);
          alert("Failed to complete the transaction. Please try again.");
        }
      });

      // Show the modal for user confirmation
      setShowModal(true);
    } catch (error) {
      console.error("Error while editing bet:", error);
    }
  };

  // const editADeployedBet = async (
  //   positionInArray,
  //   newDeployedPrice,
  //   newAskingPrice
  // ) => {
  //   try {
  //     const currentBet = await contractInstance.arrayOfBets(positionInArray);
  //     console.log(currentBet);
  //     let valueInWei = 0;

  //     if (currentBet.amountDeployerLocked < newDeployedPrice) {
  //       valueInWei = newDeployedPrice - currentBet.amountDeployerLocked;
  //     }
  //     console.log(valueInWei);

  //     setModalContent(
  //       `<p>The new amount that you will have locked up is <strong>${ethers.utils.formatEther(
  //         newDeployedPrice
  //       )} ETH</strong> and the new purchase price for this bet is <strong>${ethers.utils.formatEther(
  //         newAskingPrice
  //       )} ETH</strong>. Do you agree?</p>`
  //     );

  //     setModalAction(() => async () => {
  //       try {
  //         const tx = await contractInstance.editADeployedBet(
  //           positionInArray,
  //           newDeployedPrice,
  //           newAskingPrice,
  //           {
  //             value: valueInWei.toString(),
  //           }
  //         );
  //         await tx.wait();
  //         alert("Bet updated successfully!");
  //       } catch (error) {
  //         console.error("Error occurred:", error);
  //         alert("Failed to complete the transaction. Please try again.");
  //       }
  //     });

  //     setShowModal(true);
  //   } catch (error) {
  //     console.error("Can't edit bet:", error);
  //   }
  // };

  const withdrawBet = async () => {
    try {
      const tx = await contractInstance.withdraw();
      await tx.wait;
    } catch (error) {
      console.log(error);
    }
  };

  const ownerWithdraw = async () => {
    try {
      const tx = await contractInstance.transferOwnerAmount();
      await tx.wait;
    } catch (error) {
      console.log(error);
    }
  };

  function handleChangePrice(value, index) {
    setBetPrices((prevPrices) => ({
      ...prevPrices,
      [index]: value,
    }));
  }

  const BigNumber = require("bignumber.js");

  const transferStaffAmount = async () => {
    try {
      const tx = await contractInstance.transferStaffAmount();
      await tx.wait;
    } catch (error) {
      console.log(error);
    }
  };

  const calculateTotalWinnings = (allbets) => {
    if (!Array.isArray(allbets)) {
      return "0";
    }

    const totalWinnings = allbets
      .filter((bet) => {
        if (bet.deployer !== bet.owner) {
          return true;
        } else if (bet.deployer === bet.owner && bet.amountBuyerLocked > 0) {
          return true;
        }
        return false;
      })
      .filter(
        (bet) => bet.deployer === signerAddress || bet.owner === signerAddress
      )
      .reduce((total, bet) => {
        const amountDeployerLocked = parseFloat(
          ethers.utils.formatEther(bet.amountDeployerLocked)
        );
        const amountBuyerLocked = parseFloat(
          ethers.utils.formatEther(
            bet.amountBuyerLocked > 0 ? bet.amountBuyerLocked : 0
          )
        );

        if (isNaN(amountDeployerLocked) || isNaN(amountBuyerLocked)) {
          console.error("Invalid BigNumber conversion encountered.");
          return total;
        }

        return total + amountDeployerLocked + amountBuyerLocked;
      }, 0);

    console.log(`Total Winnings: ${totalWinnings}`);
    return totalWinnings.toString();
  };

  const bigNumberToNumber = (bigNumber) => {
    return parseInt(bigNumber._hex, 16);
  };

  const displayAllBets = async () => {
    if (contractInstance) {
      try {
        let allbets, endTime, winner, state, endOfVoting, winnings;
        [allbets, endTime, winner, state, endOfVoting, winnings] =
          await contractInstance.allBets_Balance();

        setbetsbalance({
          allbets: allbets,
          endTime: bigNumberToNumber(endTime),
          winner: winner,
          state: state,
          endOfVoting: bigNumberToNumber(endOfVoting),
          winnings: ethers.utils.formatEther(winnings),
        });

        const totalWinnings = calculateTotalWinnings(allbets);

        setTotalWinnings(totalWinnings);
      } catch (error) {
        console.log(error);
      }
    }
  };
  const isAuthorizedUser =
    signerAddress &&
    contract?.deployerAddress &&
    (signerAddress === contract.deployerAddress ||
      signerAddress === "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

  // const declareWinner = async (winner, isDeclaredCorrect) => {
  //   if (contractInstance) {
  //     try {
  //       const voteTime = Math.floor(Date.now() / 1000) + 7200;
  //       console.log(voteTime);
  //       const tx = await contractInstance.declareWinner(
  //         winner,
  //         isDeclaredCorrect
  //       );
  //       await tx.wait();

  //       const response = await fetch(
  //         `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateMongoDB`,
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json",
  //           },
  //           body: JSON.stringify({ contractAddress, voteTime }),
  //         }
  //       );
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // };

  // const voteDisagree = async (reason) => {
  //   if (contractInstance && disagreeText) {
  //     try {
  //       const value = await contractInstance.creatorLocked();

  //       const tx = await contractInstance.disagreeWithOwner({
  //         value: value,
  //       });
  //       await tx.wait();
  //       const response = await fetch(
  //         `${process.env.NEXT_PUBLIC_API_BASE_URL}/moveToDisagreements`,
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json",
  //           },
  //           body: JSON.stringify({ contractAddress, reason }),
  //         }
  //       );
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // };

  const declareWinner = async (winner, isDeclaredCorrect) => {
    if (contractInstance) {
      try {
        const voteTime = Math.floor(Date.now() / 1000) + 7200;
        console.log(voteTime);
        const winnerName =
          winner === 1
            ? contract.eventA
            : winner === 2
            ? contract.eventB
            : winner === 3
            ? "As A Tie/No Contest and Refund?"
            : "";

        // Prepare modal content for user confirmation
        setModalContent(
          `<p>Are you sure you want to declare <strong>${winnerName}</strong> as the winner? This action cannot be undone.</p>`
        );

        // Define action for the modal confirmation
        setModalAction(() => async () => {
          try {
            const tx = await contractInstance.declareWinner(
              winner,
              isDeclaredCorrect
            );
            await tx.wait();

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateMongoDB`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ contractAddress, voteTime }),
              }
            );
            alert("Winner declared successfully!");
          } catch (error) {
            console.error("Transaction Error:", error);
            alert("Failed to declare the winner. Please try again.");
          }
        });

        // Show the modal for user confirmation
        setShowModal(true);
      } catch (error) {
        console.error("Error while declaring winner:", error);
      }
    }
  };

  const voteDisagree = async (reason) => {
    if (contractInstance && disagreeText) {
      try {
        const value = await contractInstance.creatorLocked();
        const valueString = ethers.utils.formatEther(value);

        // Prepare modal content for user confirmation
        setModalContent(
          `<p>Are you sure you want to disagree with the owner for the following reason: <strong>${reason}</strong>? This will lock ${valueString} ETH. You will recieve this and the amount the creator has locked if the deployer of the set has made an incorrect decision and you are correct with your disagreement reason.</p>`
        );

        // Define action for the modal confirmation
        setModalAction(() => async () => {
          try {
            const tx = await contractInstance.disagreeWithOwner({
              value: value,
            });
            await tx.wait();

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/moveToDisagreements`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ contractAddress, reason }),
              }
            );
            alert("Disagreement vote submitted successfully!");
          } catch (error) {
            console.error("Transaction Error:", error);
            alert("Failed to submit the disagreement vote. Please try again.");
          }
        });

        // Show the modal for user confirmation
        setShowModal(true);
      } catch (error) {
        console.error("Error while voting to disagree:", error);
      }
    }
  };

  const fetchContractDetails = async (address) => {
    try {
      console.log(`${process.env.NEXT_PUBLIC_API_BASE_URL}`, "logged .env");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/contracts/${address}`
      );
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching contract details:", error);
    }
  };

  useEffect(() => {
    if (contractAddress) {
      console.log(`Fetching details for contract: ${contractAddress}`);
      fetchContractDetails(contractAddress)
        .then((data) => {
          if (data) {
            setContract(data);
          } else {
            console.log("Contract data not found or error occurred");
          }
        })
        .catch((error) =>
          console.error("Fetching contract details failed", error)
        );
    } else {
      console.log("contractAddress is undefined, waiting for it to be set");
    }
  }, [contractAddress, signer]);

  // const switchNetwork = async (targetChainId) => {
  //   const chainHex = `0x${targetChainId.toString(16)}`;

  //   try {
  //     await window.ethereum.request({
  //       method: "wallet_switchEthereumChain",
  //       params: [{ chainId: chainHex }],
  //     });
  //   } catch (switchError) {
  //     if (switchError.code === 4902) {
  //       try {
  //         const chainDetails = commonChains[targetChainId];
  //         if (chainDetails) {
  //           await window.ethereum.request({
  //             method: "wallet_addEthereumChain",
  //             params: [
  //               {
  //                 chainId: chainHex,
  //                 chainName: chainDetails.chainName,
  //                 nativeCurrency: chainDetails.nativeCurrency,
  //                 rpcUrls: [chainDetails.rpcUrl],
  //                 blockExplorerUrls: chainDetails.blockExplorerUrls,
  //               },
  //             ],
  //           });
  //           window.location.reload();
  //         } else {
  //           console.error(
  //             `No RPC URL available for chain ID: ${targetChainId}. Please add the network manually.`
  //           );
  //           alert(
  //             `Please add the network with chain ID ${targetChainId} manually, as no RPC URL is available.`
  //           );
  //         }
  //       } catch (addError) {
  //         console.error("Failed to add the network:", addError);
  //       }
  //     } else {
  //       console.error("Failed to switch the network:", switchError);
  //     }
  //   }
  // };

  const switchNetwork = async (targetChainId) => {
    const chainHex = `0x${targetChainId.toString(16)}`;

    try {
      // Attempt to switch to the target network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch (switchError) {
      // If the target network is not added, add it
      if (switchError.code === 4902) {
        try {
          const chainDetails = commonChains[targetChainId];
          if (chainDetails) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: chainHex,
                  chainName: chainDetails.chainName,
                  nativeCurrency: chainDetails.nativeCurrency,
                  rpcUrls: [chainDetails.rpcUrl],
                  blockExplorerUrls: chainDetails.blockExplorerUrls,
                },
              ],
            });
            // Reload the page to reflect the new network
            window.location.reload();
          } else {
            console.error(
              `No RPC URL available for chain ID: ${targetChainId}. Please add the network manually.`
            );
            alert(
              `Please add the network with chain ID ${targetChainId} manually, as no RPC URL is available.`
            );
          }
        } catch (addError) {
          console.error("Failed to add the network:", addError);
          alert(
            "Failed to add the network. Please try again or add it manually."
          );
        }
      } else {
        console.error("Failed to switch the network:", switchError);
        alert("Failed to switch the network. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (contractInstance && signer) {
      const eventNames = [
        "userCreatedABet",
        "BetUnlisted",
        "userBoughtBet",
        "userReListedBet",
        "winnerDeclaredVoting",
        "userVoted",
        "userWithdrew",
      ];

      eventNames.forEach((eventName) => {
        contractInstance.on(eventName, displayAllBets);
      });

      return () => {
        eventNames.forEach((eventName) => {
          contractInstance.off(eventName, displayAllBets);
        });
      };
    }
  }, [contractInstance, signer]);

  const handleSelectBet = (position) => {
    setSelectedBets((prevSelectedBets) =>
      prevSelectedBets.includes(position)
        ? prevSelectedBets.filter((pos) => pos !== position)
        : [...prevSelectedBets, position]
    );
  };

  const handleEndBet = () => {
    const outcomeValue = parseInt(winnerOfSet, 10);
    const outcomeValue2 = parseInt(selectedOutcome2, 10);
    console.log("outcome Val1", outcomeValue);
    console.log("outcome Val2", outcomeValue2);

    declareWinner(outcomeValue, outcomeValue2);
  };

  return (
    <>
      <main className="contract-container">
        <Header />
        {netWorkMismatch ? (
          <div className="network-switch-modal">
            <p>
              You are on the wrong network. This set is deployed on chain:{" "}
              {contract?.chain?.name}. Please switch to the correct one.
            </p>
            <button onClick={() => switchNetwork(contract.chain.chainId)}>
              Switch Network
            </button>
          </div>
        ) : (
          <div>
            <div className="contract-container">
              <div className="contract-details-grid">
                <div className="contract-detail-item">
                  <h4>
                    <h4>
                      <span style={{ color: "red" }}>
                        {deployerLocked} {""} {chain?.nativeCurrency?.symbol}
                      </span>{" "}
                      {""} Is the amount the creator of the set has locked up to
                      ensure Integrity
                    </h4>
                    <h4>{contractBalance} The Amount of Eth In contract</h4>
                    <h4>{contract.NameofMarket}</h4>
                    <h4>{contract.fullName}</h4>
                    <div>
                      {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
                      {contract.eventB}
                    </div>
                    {bets_balance.state === 0 ? (
                      <>
                        <p>
                          Total Potential Winnings: {totalWinnings}{" "}
                          {chain?.nativeCurrency?.symbol}
                        </p>
                      </>
                    ) : (
                      <h4>
                        <div>
                          Winner:{" "}
                          {bets_balance.winner.toString() === "1"
                            ? contract.eventA
                            : bets_balance.winner.toString() === "2"
                            ? contract.eventB
                            : "Draw/Cancel All Bets Refunded"}
                        </div>
                      </h4>
                    )}
                  </h4>
                </div>
                <Modal
                  show={showModal}
                  handleClose={handleClose}
                  handleConfirm={handleConfirm}
                  content={modalContent}
                />

                <div className="input-container">
                  <div>
                    {bets_balance.state === 0 && (
                      <div className="countdown-container">
                        <h4 className="countdown-heading">Time left to bet:</h4>
                        <CountdownTimer
                          endTime={contract.endsAt}
                          className="countdown-time"
                        />
                      </div>
                    )}

                    <div className="createBetContainer">
                      {isBettingOpen ? (
                        <>
                          <button
                            className="toggle-inputs-btn"
                            onClick={() => setShowInputs(!showInputs)}
                          >
                            {showInputs ? "Hide Details" : "Deploy A Bet"}
                          </button>
                          {showInputs && (
                            <>
                              <input
                                className="input-field"
                                value={myLocked}
                                onChange={(e) => setmyLocked(e.target.value)}
                                placeholder={`My Bet In ${chain?.nativeCurrency?.symbol}`}
                                maxLength={20}
                              />
                              <input
                                className="input-field"
                                value={buyInIChoose}
                                onChange={(e) =>
                                  setbuyInIChoose(e.target.value)
                                }
                                placeholder={`Opponent's Bet In ${chain?.nativeCurrency?.symbol}`}
                                maxLength={20}
                              />
                              <select
                                className="dropdown"
                                value={selectedOutcome}
                                onChange={(e) =>
                                  setSelectedOutcome(e.target.value)
                                }
                              >
                                <option value="" disabled>
                                  Select an outcome...
                                </option>
                                <option value="1">{contract.eventA}</option>
                                <option value="2">{contract.eventB}</option>
                              </select>
                              <button
                                onClick={() =>
                                  sellANewBet(
                                    myLocked,
                                    buyInIChoose,
                                    selectedOutcome
                                  )
                                }
                              >
                                Submit Bet
                              </button>
                            </>
                          )}
                        </>
                      ) : isVotingTime ? (
                        <>
                          <p>
                            The betting is closed you may file a disagreement if
                            you believe their is a mistake.
                          </p>
                          <input
                            className="input-field"
                            value={disagreeText}
                            onChange={(e) => setDisagreeText(e.target.value)}
                            placeholder={`Disagreement Reason`}
                            maxLength={1000}
                          />
                          <p>
                            <CountdownTimer
                              endTime={contract.voteTime}
                              className="countdown-time"
                            />
                          </p>
                          <button onClick={() => voteDisagree(disagreeText)}>
                            Disagree
                          </button>
                        </>
                      ) : isDisagreementState ? (
                        <>
                          <h4>
                            A User has disagreed with the deployer of the bet
                            with reasoning:
                          </h4>
                          <h4>{contract.disagreementText}</h4>
                          <h4>
                            The Team is looking into it and we will resolve this
                            issue immediately
                          </h4>
                        </>
                      ) : (
                        <>
                          {" "}
                          <div className="contract-detail-item">
                            {" "}
                            The winner has been finalized, you may withdraw your
                            balance of:
                          </div>
                          <h4>
                            {bets_balance.winnings}{" "}
                            {chain?.nativeCurrency?.symbol}{" "}
                          </h4>
                          <button onClick={() => withdrawBet()}>
                            Withdraw Balance
                          </button>
                          {contract && contractInstance && isAuthorizedUser && (
                            <>
                              <button onClick={() => ownerWithdraw()}>
                                Owner Withdraw Collected Comission & Locked
                                Amounts
                              </button>

                              <button onClick={() => transferStaffAmount()}>
                                Staff Withdrawl
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="vertical-button-group">
                  <button onClick={() => setFilter("all")}>All Bets</button>
                  <button onClick={() => setFilter("forSale")}>
                    Bets For Sale
                  </button>
                  <button onClick={() => setFilter("deployedByMe")}>
                    My Deployed Bets
                  </button>
                  <button onClick={() => setFilter("ownedByMe")}>
                    Bets I Own
                  </button>
                </div>
              </div>
            </div>

            <div>
              <ul>
                <div ref={betsContainerRef} className="bets-container">
                  {selectedBets.length > 0 && (
                    <button onClick={() => unlistBet(selectedBets)}>
                      Unlist All Selected
                    </button>
                  )}
                  {bets_balance.allbets &&
                  Array.isArray(bets_balance.allbets) ? (
                    bets_balance.allbets.length > 0 ? (
                      bets_balance.allbets
                        .filter((bet) => {
                          switch (filter) {
                            case "forSale":
                              return bet.selling;
                            case "deployedByMe":
                              return bet.deployer === signerAddress;
                            case "ownedByMe":
                              return bet.owner === signerAddress;
                            case "all":
                            default:
                              return true;
                          }
                        })
                        .map((bet, index) => {
                          return (
                            <div key={index} className="bet">
                              <h3>Bet {index + 1}</h3>
                              <div className="bet-info">
                                Amount To Win:{" "}
                                {ethers.utils.formatEther(
                                  ethers.BigNumber.from(
                                    bet.amountDeployerLocked
                                  ).add(
                                    ethers.BigNumber.from(
                                      bet.amountBuyerLocked > 0
                                        ? bet.amountBuyerLocked
                                        : bet.amountToBuyFor
                                    )
                                  )
                                )}{" "}
                                {chain?.nativeCurrency?.symbol}
                              </div>
                              {bet.selling && (
                                <div className="bet-info">
                                  Cost To Purchase:{" "}
                                  {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                                  {chain?.nativeCurrency?.symbol}
                                </div>
                              )}
                              <div className="bet-info">
                                Owner Of Bet Wins If:{" "}
                                {bet.conditionForBuyerToWin === 1
                                  ? contract.eventA
                                  : contract.eventB}{" "}
                                Wins
                              </div>
                              {bet.selling ? (
                                bet.owner === signerAddress ? (
                                  <div className="bet-selection">
                                    <input
                                      type="checkbox"
                                      value={bet.positionInArray}
                                      onChange={(e) =>
                                        handleSelectBet(e.target.value)
                                      }
                                    />
                                    Select To Unlist
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      buyBet(
                                        bet.positionInArray,
                                        bet.amountToBuyFor
                                      )
                                    }
                                  >
                                    Buy Bet
                                  </button>
                                )
                              ) : !bet.selling &&
                                bet.owner === signerAddress &&
                                bet.deployer != signerAddress ? (
                                <>
                                  <input
                                    style={{
                                      width: "50%",
                                      padding: "6px 10px",
                                      border: "1px solid #ccc",
                                      borderRadius: "4px",
                                      textAlign: "center",
                                      fontSize: "14px",
                                    }}
                                    value={betPrices[index] || ""}
                                    onChange={(e) =>
                                      handleChangePrice(e.target.value, index)
                                    }
                                    placeholder={`ReSell Price In ${chain?.nativeCurrency?.symbol}`}
                                    maxLength={100}
                                  />
                                  <button
                                    onClick={() =>
                                      listBetForSale(
                                        bet.positionInArray,
                                        betPrices[index] || ""
                                      )
                                    }
                                  >
                                    Re-List Bet
                                  </button>
                                </>
                              ) : null}

                              {bet.deployer === signerAddress &&
                                bet.owner === signerAddress && (
                                  <div className="edit-bet-section">
                                    <h4>Edit Your Deployed Bet</h4>
                                    <div className="current-values">
                                      <p>
                                        <strong>Current Deployed Price:</strong>{" "}
                                        {ethers.utils.formatEther(
                                          bet.amountDeployerLocked
                                        )}{" "}
                                        {chain?.nativeCurrency?.symbol}
                                      </p>
                                      <p>
                                        <strong>Current Asking Price:</strong>{" "}
                                        {ethers.utils.formatEther(
                                          bet.amountToBuyFor
                                        )}{" "}
                                        {chain?.nativeCurrency?.symbol}
                                      </p>
                                    </div>
                                    <div className="edit-inputs">
                                      <label>
                                        Amount You Locked Up{" "}
                                        <input
                                          style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #ccc",
                                            borderRadius: "4px",
                                            textAlign: "center",
                                            fontSize: "14px",
                                            marginTop: "5px",
                                          }}
                                          value={
                                            newDeployedPrices[
                                              bet.positionInArray
                                            ] || ""
                                          } // Use specific bet's value
                                          onChange={(e) =>
                                            setNewDeployedPrices({
                                              ...newDeployedPrices,
                                              [bet.positionInArray]:
                                                e.target.value, // Update only this bet's value
                                            })
                                          }
                                          placeholder={`Enter new price in ${chain?.nativeCurrency?.symbol}`}
                                        />
                                      </label>
                                      <label>
                                        New Buying Price
                                        <input
                                          style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #ccc",
                                            borderRadius: "4px",
                                            textAlign: "center",
                                            fontSize: "14px",
                                            marginTop: "5px",
                                          }}
                                          value={
                                            newAskingPrices[
                                              bet.positionInArray
                                            ] || ""
                                          } // Use specific bet's value
                                          onChange={(e) =>
                                            setNewAskingPrices({
                                              ...newAskingPrices,
                                              [bet.positionInArray]:
                                                e.target.value, // Update only this bet's value
                                            })
                                          }
                                          placeholder={`Enter new price in ${chain?.nativeCurrency?.symbol}`}
                                          maxLength={100}
                                        />
                                      </label>
                                    </div>
                                    <button
                                      style={{
                                        marginTop: "10px",
                                        padding: "10px 15px",
                                        backgroundColor: "#007bff",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        editADeployedBet(
                                          bet.positionInArray,
                                          newDeployedPrices[
                                            bet.positionInArray
                                          ] || bet.amountDeployerLocked,
                                          newAskingPrices[
                                            bet.positionInArray
                                          ] ||
                                            ethers.utils.formatEther(
                                              bet.amountToBuyFor
                                            )
                                        )
                                      }
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                )}
                            </div>
                          );
                        })
                    ) : (
                      <div>No Bets Available</div>
                    )
                  ) : (
                    <div>No Bets Available</div>
                  )}
                </div>
              </ul>
            </div>

            {contract &&
              contractInstance &&
              isAuthorizedUser &&
              bets_balance.state < 4 && (
                <div>
                  <select
                    id="outcomeSelect"
                    className="dropdown"
                    value={winnerOfSet}
                    onChange={(e) => setWinnerOfSet(e.target.value)}
                  >
                    <option value="0">Set Winner As ...</option>
                    <option value="1">Set Winner As {contract.eventA}</option>
                    <option value="2">Set Winner As {contract.eventB}</option>
                    <option value="3">Cancel Refund</option>
                  </select>

                  {bets_balance.state === 2 && (
                    <select
                      id="outcomeSelect2"
                      className="dropdown"
                      value={selectedOutcome2}
                      onChange={(e) => setSelectedOutcome2(e.target.value)}
                    >
                      <option value="1">
                        The User That Disagreed Was Correct And Owner Was Wrong
                      </option>
                      <option value="2">
                        The User That Disagreed Was Not Correct And Owner Was
                        Right
                      </option>
                      <option value="3">
                        The User That Disagreed Was Not Correct And Owner Was
                        Not Correct
                      </option>
                    </select>
                  )}

                  <button onClick={handleEndBet}>End Bet</button>
                </div>
              )}
          </div>
        )}
      </main>
      // ... (previous code remains unchanged)
      <style jsx>{`
        /* Global styles */
        :root {
          --primary-color: #6200ee;
          --secondary-color: #03dac6;
          --background-color: #121212;
          --surface-color: #1e1e1e;
          --on-surface-color: #ffffff;
          --error-color: #cf6679;
        }

        /* Desktop styles */
        .contract-container {
          display: flex;
          flex-direction: column;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          background-color: var(--background-color);
          color: var(--on-surface-color);
          font-family: "Roboto", sans-serif;
        }

        .network-switch-modal,
        .contract-details-grid,
        .input-container,
        .vertical-button-group,
        .bets-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: var(--surface-color);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .contract-details-grid {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
          width: 100%;
        }

        .contract-detail-item {
          text-align: center;
          margin-bottom: 15px;
          flex: 1;
          padding: 15px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          transition: transform 0.3s ease;
        }

        .contract-detail-item:hover {
          transform: translateY(-5px);
        }

        .input-container {
          width: 50%;
          padding: 20px;
          box-sizing: border-box;
        }

        .countdown-container {
          margin-bottom: 20px;
          text-align: center;
        }

        .countdown-heading {
          font-size: 1.4rem;
          margin-bottom: 10px;
          color: var(--secondary-color);
        }

        .createBetContainer {
          width: 100%;
          max-width: 400px;
        }

        .input-field,
        .dropdown {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          font-size: 1rem;
          background-color: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: var(--on-surface-color);
        }

        .toggle-inputs-btn {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          font-size: 1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .toggle-inputs-btn:hover {
          background-color: #7c4dff;
        }

        .bet {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
          box-sizing: border-box;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .bet:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }

        .bet-info {
          margin-bottom: 10px;
          font-size: 1.1rem;
        }

        .bet-selection {
          margin-top: 15px;
        }

        .vertical-button-group {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 200px;
        }

        .vertical-button-group button {
          margin-bottom: 10px;
          padding: 12px;
          font-size: 1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .vertical-button-group button:hover {
          background-color: #7c4dff;
        }

        .bets-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          width: 100%;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .contract-container {
            padding: 10px;
            width: 100%;
          }

          .contract-details-grid {
            flex-direction: column;
          }

          .input-container {
            width: 100%;
            padding: 10px;
          }

          .vertical-button-group {
            width: 100%;
            max-width: 400px;
          }

          .vertical-button-group button {
            margin-bottom: 10px;
            padding: 10px;
            font-size: 0.9rem;
          }

          .bet {
            width: 100%;
          }

          .createBetContainer {
            max-width: 100%;
          }
        }
      `}</style>
      // ... (rest of the code remains unchanged)
    </>
  );
}
