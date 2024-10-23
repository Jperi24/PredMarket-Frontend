import { ethers } from "ethers";
import predMarketArtifact from "../../predMarketV2.json"; // path to the ABI and Bytecode
import Modal from "../../components/Modal";
import { useSigner } from "@thirdweb-dev/react";
import { ConnectWallet } from "@thirdweb-dev/react";
import Header from "../../components/Header";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useCallback } from "react";
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

  const [bets_balance, setBetsBalance] = useState({
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
        bets_balance.endOfVoting
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
        (bets_balance.state === 1 && currentTime < bets_balance.endOfVoting) ||
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
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateUserContract`;

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress: address,
          userId: signerAddress,
          role: "better",
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

  const calculateTotalWinnings = async (allbets) => {
    if (!Array.isArray(allbets)) {
      return "0";
    }

    const filteredBets = allbets
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
      );

    // Map over the filtered bets and process async calls outside of the reduce
    const winningsPromises = filteredBets.map(async (bet) => {
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
        return 0;
      }

      // Fetch amount made from sold bets and ensure proper conversion to Ether
      const amountMadeFromSoldBetsInWei =
        await contractInstance.amountMadeFromSoldBets(signerAddress);
      console.log("amount made from selling", amountMadeFromSoldBetsInWei);

      // Explicit conversion from Wei to Ether using ethers.utils.formatEther
      const amountMadeFromSoldBets = ethers.utils.formatEther(
        bigNumberToNumber(amountMadeFromSoldBetsInWei)
      );

      return (
        amountDeployerLocked +
        amountBuyerLocked +
        parseFloat(amountMadeFromSoldBets)
      );
    });

    // Wait for all promises to resolve
    const winnings = await Promise.all(winningsPromises);

    const totalWinnings = winnings.reduce((total, currentWinnings) => {
      return total + currentWinnings;
    }, 0);

    console.log(`Total Winnings: ${totalWinnings}`);

    return totalWinnings.toString();
  };

  const bigNumberToNumber = (bigNumber) => {
    return parseInt(bigNumber._hex, 16);
  };

  const displayAllBets = useCallback(async () => {
    if (contractInstance) {
      try {
        const [
          allbets,
          endTime,
          winner,
          state,
          endOfVoting,
          winnings,
          winngs2,
          winnings3,
        ] = await contractInstance.allBets_Balance();
        if (bigNumberToNumber(winnings) === 0) {
          setTotalWinnings(await calculateTotalWinnings(allbets));
        } else {
          setTotalWinnings(bigNumberToNumber(winnings));
        }

        setBetsBalance({
          allbets,
          endTime: bigNumberToNumber(endTime),
          winner,
          state,
          endOfVoting: bigNumberToNumber(endOfVoting),
          winnings: bigNumberToNumber(winnings),
        });
      } catch (error) {
        console.error("Error displaying bets:", error);
      }
    }
  }, [contractInstance]);

  const isAuthorizedUserStaff =
    signerAddress &&
    contract?.deployerAddress &&
    signerAddress === "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const isAuthorizedUserOwner =
    signerAddress &&
    contract?.deployerAddress &&
    signerAddress === contract.deployerAddress;

  const declareWinner = async (winner) => {
    if (contractInstance) {
      try {
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
            const tx = await contractInstance.declareWinner(winner);
            await tx.wait();

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
        // Prepare modal content for user confirmation
        setModalContent(
          `<p>Are you sure you want to disagree with the owner for the following reason: <strong>${reason}</strong>? </p>`
        );

        // Define action for the modal confirmation
        setModalAction(() => async () => {
          try {
            const tx = await contractInstance.disagreeWithOwner();
            await tx.wait();

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/moveToDisagreements`,
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
        "BetEdited",
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

    console.log("outcome Val1", outcomeValue);

    declareWinner(outcomeValue);
  };

  return (
    <div className="betting-app">
      <Header />
      {!signerAddress ? (
        <div className="wallet-connect-modal">
          <h2>Welcome to the Betting Arena! 🎰</h2>
          <p>Connect your wallet to join the action and place your bets.</p>
          <ConnectWallet className="connect-wallet-btn" />
        </div>
      ) : netWorkMismatch ? (
        <div className="network-switch-modal">
          <h2>Oops! Wrong Network 🔗</h2>
          <p>This market is on {contract?.chain?.name}. Let's switch!</p>
          <button
            onClick={() => switchNetwork(contract.chain.chainId)}
            className="switch-network-btn"
          >
            Switch to {contract?.chain?.name}
          </button>
        </div>
      ) : (
        <div className="betting-arena">
          <div className="market-info-column">
            <div className="market-info">
              <h1>{contract.NameofMarket}</h1>
              <h2>{contract.fullName}</h2>
              <div className="event-matchup">
                <span className="event-a">{contract.eventA}</span>
                <span className="vs">VS</span>
                <span className="event-b">{contract.eventB}</span>
              </div>
              {bets_balance.state === 0 ? (
                <div className="potential-winnings">
                  <h3>Total Potential Winnings</h3>
                  <p>
                    {totalWinnings} {chain?.nativeCurrency?.symbol}
                  </p>
                </div>
              ) : (
                <div className="winner-announcement">
                  <h3>Winner</h3>
                  <p>
                    {bets_balance.winner.toString() === "1"
                      ? contract.eventA
                      : bets_balance.winner.toString() === "2"
                      ? contract.eventB
                      : "Draw/Cancel - All Bets Refunded"}
                  </p>
                </div>
              )}
            </div>
            {contract &&
              contractInstance &&
              isAuthorizedUserStaff &&
              bets_balance.state < 4 && (
                <div className="admin-controls">
                  <h3>Admin Controls</h3>
                  <select
                    id="outcomeSelect"
                    className="dropdown"
                    value={winnerOfSet}
                    onChange={(e) => setWinnerOfSet(e.target.value)}
                  >
                    <option value="0">Set Winner...</option>
                    <option value="1">Winner: {contract.eventA}</option>
                    <option value="2">Winner: {contract.eventB}</option>
                    <option value="3">Cancel & Refund</option>
                  </select>
                  <button className="end-bet-btn" onClick={handleEndBet}>
                    Finalize Bet
                  </button>
                </div>
              )}
          </div>

          <div className="betting-interface-column">
            <div className="betting-actions">
              {bets_balance.state === 0 && (
                <div className="countdown-container">
                  <h3>Time left to bet</h3>
                  <CountdownTimer
                    endTime={contract.endsAt}
                    className="countdown-timer"
                  />
                </div>
              )}
              <div className="create-bet-container">
                {isBettingOpen ? (
                  <>
                    <button
                      className="toggle-inputs-btn"
                      onClick={() => setShowInputs(!showInputs)}
                    >
                      {showInputs ? "Hide Bet Form" : "Place a New Bet"}
                    </button>
                    {showInputs && (
                      <div className="bet-form">
                        <input
                          className="input-field"
                          value={myLocked}
                          onChange={(e) => setmyLocked(e.target.value)}
                          placeholder={`Your Bet (${chain?.nativeCurrency?.symbol})`}
                          maxLength={20}
                        />
                        <input
                          className="input-field"
                          value={buyInIChoose}
                          onChange={(e) => setbuyInIChoose(e.target.value)}
                          placeholder={`Opponent's Bet (${chain?.nativeCurrency?.symbol})`}
                          maxLength={20}
                        />
                        <select
                          className="dropdown"
                          value={selectedOutcome}
                          onChange={(e) => setSelectedOutcome(e.target.value)}
                        >
                          <option value="" disabled>
                            Choose your winner...
                          </option>
                          <option value="1">{contract.eventA}</option>
                          <option value="2">{contract.eventB}</option>
                        </select>
                        <button
                          className="submit-bet-btn"
                          onClick={() =>
                            sellANewBet(myLocked, buyInIChoose, selectedOutcome)
                          }
                        >
                          Place Bet
                        </button>
                      </div>
                    )}
                  </>
                ) : isVotingTime ? (
                  <div className="disagreement-form">
                    <h3>Betting is Closed</h3>
                    <p>
                      If you believe there's a mistake, you can file a
                      disagreement.
                    </p>
                    <input
                      className="input-field"
                      value={disagreeText}
                      onChange={(e) => setDisagreeText(e.target.value)}
                      placeholder="Reason for disagreement"
                      maxLength={1000}
                    />
                    <p>Time left to disagree:</p>
                    <CountdownTimer
                      endTime={bets_balance.endOfVoting}
                      className="countdown-timer"
                    />
                    <button
                      className="disagree-btn"
                      onClick={() => voteDisagree(disagreeText)}
                    >
                      File Disagreement
                    </button>
                  </div>
                ) : isDisagreementState ? (
                  <div className="disagreement-notice">
                    <h3>Disagreement Filed</h3>
                    <p>A user has disagreed with the bet outcome:</p>
                    <blockquote>{contract.disagreementText}</blockquote>
                    <p>
                      Our team is reviewing the issue and will resolve it
                      promptly.
                    </p>
                  </div>
                ) : (
                  <div className="withdrawal-section">
                    <h3>Betting Concluded</h3>
                    <p>Your balance available for withdrawal:</p>
                    <h2>
                      {totalWinnings} {chain?.nativeCurrency?.symbol}
                    </h2>
                    <button
                      className="withdraw-btn"
                      onClick={() => withdrawBet()}
                    >
                      Withdraw Winnings
                    </button>
                    {contract && contractInstance && (
                      <>
                        {isAuthorizedUserOwner ? (
                          <button
                            className="admin-btn"
                            onClick={() => ownerWithdraw()}
                          >
                            Owner: Withdraw Commission & Locked Amounts
                          </button>
                        ) : isAuthorizedUserStaff ? (
                          <button
                            className="admin-btn"
                            onClick={() => transferStaffAmount()}
                          >
                            Staff: Process Withdrawal
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bets-list-column">
            <div className="bet-filters">
              <button
                onClick={() => setFilter("all")}
                className={filter === "all" ? "active" : ""}
              >
                All Bets
              </button>
              <button
                onClick={() => setFilter("forSale")}
                className={filter === "forSale" ? "active" : ""}
              >
                Bets For Sale
              </button>
              <button
                onClick={() => setFilter("deployedByMe")}
                className={filter === "deployedByMe" ? "active" : ""}
              >
                My Deployed Bets
              </button>
              <button
                onClick={() => setFilter("ownedByMe")}
                className={filter === "ownedByMe" ? "active" : ""}
              >
                Bets I Own
              </button>
            </div>
            <div className="bets-list">
              {selectedBets.length > 0 && (
                <button
                  className="unlist-selected-btn"
                  onClick={() => unlistBet(selectedBets)}
                >
                  Unlist Selected Bets
                </button>
              )}
              {bets_balance.allbets && Array.isArray(bets_balance.allbets) ? (
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
                    .map((bet, index) => (
                      <div key={index} className="bet-card">
                        <h3>Bet #{index + 1}</h3>
                        <div className="bet-details">
                          <p>
                            Potential Win:{" "}
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
                          </p>
                          {bet.selling && (
                            <p>
                              Purchase Cost:{" "}
                              {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                              {chain?.nativeCurrency?.symbol}
                            </p>
                          )}
                          <p>
                            Winning Condition:{" "}
                            {bet.conditionForBuyerToWin === 1
                              ? contract.eventA
                              : contract.eventB}{" "}
                            Wins
                          </p>
                        </div>
                        {bet.selling ? (
                          bet.owner === signerAddress ? (
                            <div className="bet-actions">
                              <label>
                                <input
                                  type="checkbox"
                                  value={bet.positionInArray}
                                  onChange={(e) =>
                                    handleSelectBet(e.target.value)
                                  }
                                />
                                Select to Unlist
                              </label>
                            </div>
                          ) : (
                            <button
                              className="buy-bet-btn"
                              onClick={() =>
                                buyBet(bet.positionInArray, bet.amountToBuyFor)
                              }
                            >
                              Buy This Bet
                            </button>
                          )
                        ) : !bet.selling &&
                          bet.owner === signerAddress &&
                          bet.deployer !== signerAddress ? (
                          <div className="relist-bet">
                            <input
                              className="relist-price-input"
                              value={betPrices[index] || ""}
                              onChange={(e) =>
                                handleChangePrice(e.target.value, index)
                              }
                              placeholder={`Resell Price (${chain?.nativeCurrency?.symbol})`}
                              maxLength={100}
                            />
                            <button
                              className="relist-btn"
                              onClick={() =>
                                listBetForSale(
                                  bet.positionInArray,
                                  betPrices[index] || ""
                                )
                              }
                            >
                              Relist Bet
                            </button>
                          </div>
                        ) : null}
                        {bet.deployer === signerAddress &&
                          bet.owner === signerAddress && (
                            <div className="edit-bet-section">
                              <h4>Edit Your Deployed Bet</h4>
                              <div className="current-values">
                                <p>
                                  Current Deployed:{" "}
                                  {ethers.utils.formatEther(
                                    bet.amountDeployerLocked
                                  )}{" "}
                                  {chain?.nativeCurrency?.symbol}
                                </p>
                                <p>
                                  Current Ask:{" "}
                                  {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                                  {chain?.nativeCurrency?.symbol}
                                </p>
                              </div>
                              <div className="edit-inputs">
                                <input
                                  className="edit-input"
                                  value={
                                    newDeployedPrices[bet.positionInArray] || ""
                                  }
                                  onChange={(e) =>
                                    setNewDeployedPrices({
                                      ...newDeployedPrices,
                                      [bet.positionInArray]: e.target.value,
                                    })
                                  }
                                  placeholder={`New Deployed (${chain?.nativeCurrency?.symbol})`}
                                />
                                <input
                                  className="edit-input"
                                  value={
                                    newAskingPrices[bet.positionInArray] || ""
                                  }
                                  onChange={(e) =>
                                    setNewAskingPrices({
                                      ...newAskingPrices,
                                      [bet.positionInArray]: e.target.value,
                                    })
                                  }
                                  placeholder={`New Ask (${chain?.nativeCurrency?.symbol})`}
                                  maxLength={100}
                                />
                              </div>
                              <button
                                className="save-changes-btn"
                                onClick={() =>
                                  editADeployedBet(
                                    bet.positionInArray,
                                    newDeployedPrices[bet.positionInArray] ||
                                      bet.amountDeployerLocked,
                                    newAskingPrices[bet.positionInArray] ||
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
                    ))
                ) : (
                  <div className="no-bets-message">No Bets Available</div>
                )
              ) : (
                <div className="no-bets-message">No Bets Available</div>
              )}
            </div>
          </div>
        </div>
      )}
      <Modal
        show={showModal}
        handleClose={handleClose}
        handleConfirm={handleConfirm}
        content={modalContent}
      />
      <style jsx>{`
        .betting-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: #e0e0e0;
          font-family: "Roboto", sans-serif;
        }

        .betting-arena {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          padding: 1rem;
          gap: 1rem;
        }

        .market-info-column,
        .betting-interface-column,
        .bets-list-column {
          flex: 1;
          min-width: 300px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .market-info,
        .betting-actions,
        .bets-list {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .event-matchup {
          display: flex;
          justify-content: left;
          align-items: center;
          gap: 0.5rem;
          margin: 1rem 0;
          font-size: 1.2rem;
        }

        .event-a,
        .event-b {
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .vs {
          color: #ff6b6b;
          font-weight: bold;
        }

        .countdown-timer {
          font-size: 1.5rem;
          color: #4ecdc4;
          background: rgba(78, 205, 196, 0.1);
          padding: 0.5rem;
          border-radius: 4px;
          display: inline-block;
        }

        .bet-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-field,
        .dropdown {
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
        }

        .submit-bet-btn,
        .buy-bet-btn,
        .relist-btn,
        .withdraw-btn,
        .disagree-btn,
        .end-bet-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        }

        .submit-bet-btn {
          background: #4ecdc4;
          color: #1a1a2e;
        }
        .buy-bet-btn {
          background: #45b7d1;
          color: #1a1a2e;
        }
        .relist-btn {
          background: #f7b731;
          color: #1a1a2e;
        }
        .withdraw-btn {
          background: #26de81;
          color: #1a1a2e;
        }
        .disagree-btn {
          background: #fc5c65;
          color: #1a1a2e;
        }
        .end-bet-btn {
          background: #a55eea;
          color: #1a1a2e;
        }

        .submit-bet-btn:hover,
        .buy-bet-btn:hover,
        .relist-btn:hover,
        .withdraw-btn:hover,
        .disagree-btn:hover,
        .end-bet-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .bet-filters {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .bet-filters button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: #e0e0e0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .bet-filters button.active,
        .bet-filters button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .bet-card {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .bet-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .bet-details {
          font-size: 0.9rem;
          color: #b0b0b0;
        }

        .edit-bet-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .edit-inputs {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .edit-input {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
        }

        .save-changes-btn {
          background: #45b7d1;
          color: #1a1a2e;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
        }

        .save-changes-btn:hover {
          background: #3ca3bc;
        }

        @media (max-width: 768px) {
          .betting-arena {
            flex-direction: column;
          }

          .market-info-column,
          .betting-interface-column,
          .bets-list-column {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
