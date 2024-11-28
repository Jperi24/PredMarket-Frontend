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
  const router = useRouter();
  const { contractAddress } = router.query;

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

  const [signerAddress, setSignerAddress] = useState(null);
  const [newPrice, setnewPrice] = useState(null);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);

  const [selectedBets, setSelectedBets] = useState([]);
  const [betPrices, setBetPrices] = useState({});
  const [chain, setChain] = useState(null);
  const [netWorkMismatch, setNetworkMismatch] = useState(true);
  const [disagreeText, setDisagreeText] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [winnerOfSet, setWinnerOfSet] = useState("0");
  const [selectedOutcome2, setSelectedOutcome2] = useState("0");
  const [deployerLocked, setDeployerLocked] = useState("");
  const [isBettingOpen, setIsBettingOpen] = useState(null);
  const [isVotingTime, setIsVotingTime] = useState("");
  const [isBettingClosed, setIsBettingClosed] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalAction, setModalAction] = useState(null);
  const [isDisagreementState, setIsDisagreementState] = useState("");
  const [contractBalance, setContractBalance] = useState("");
  const [newDeployedPrices, setNewDeployedPrices] = useState({});
  const [newAskingPrices, setNewAskingPrices] = useState({});
  const [selectedState, setSelectedState] = useState("");
  const [userBetsHistory, setUserBets] = useState([]);
  const [isLoadingBets, setIsLoadingBets] = useState(false);
  const [editingBetId, setEditingBetId] = useState(null);
  const [isStillLoading, setisStillLoading] = useState(true);

  const [cryptoRates, setCryptoRates] = useState({}); // State for crypto rates
  const [usdEquivalents, setUsdEquivalents] = useState({}); // State for USD equivalents

  const [bets_balance, setBetsBalance] = useState({
    allbets: [],
    endTime: 0,
    winner: 0,
    state: null,
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

  const fetchUserBets = async (saddress, contractAddress) => {
    if (!saddress || !contractAddress) {
      console.error("saddress or contractAddress is not defined");
      return;
    }

    setIsLoadingBets(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/user-bets/${saddress}?contractAddress=${contractAddress}`
      );

      if (!response.ok) {
        throw new Error(`Error fetching bets: ${await response.text()}`);
      }

      const bets = await response.json();
      setUserBets(bets);
      console.log(bets, "these are the user bets");
    } catch (error) {
      console.error("Failed to fetch user bets:", error);
    } finally {
      setIsLoadingBets(false);
    }
  };

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

          if (contract && contract.chain && contract.chain.chainId) {
            const expectedChainId = contract.chain.chainId;

            if (network.chainId !== expectedChainId) {
              setNetworkMismatch(true);
            } else {
              setNetworkMismatch(false);
              console.log("Live on chain: ", network.chainId);
              setContractInstance(tempContractInstance);

              setChain(commonChains[network.chainId]);

              const balance = await signer.provider.getBalance(contractAddress);

              // ethers.js uses BigNumber to handle large numbers; convert the balance from Wei to Ether
              const balanceInEther = ethers.utils.formatEther(balance);
              setContractBalance(balanceInEther);
              fetchUserBets(saddress, contractAddress);
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

  useEffect(() => {
    if (contractInstance) {
      // Check if both contractInstance and currentTime exist
      const updateStates = () => {
        setIsBettingOpen(
          bets_balance.state === 0 && currentTime < bets_balance.endTime
        );
        setIsVotingTime(
          (bets_balance.state === 1 &&
            currentTime < bets_balance.endOfVoting) ||
            (bets_balance.state === 0 && currentTime > bets_balance.endTime)
        );
        setIsBettingClosed(
          bets_balance.state === 0 && currentTime > bets_balance.endTime
        );
        setIsDisagreementState(bets_balance.state === 2);
        console.log(bets_balance.state, "Bets Balance State");

        if (bets_balance.state !== null) {
          setisStillLoading(false); // Set loading to false when state is defined
          console.log("SetIsStillLoading Is False");
        }
      };

      updateStates(); // Call updateStates whenever currentTime changes

      // Set up an interval to keep updating until loading is false
      const interval = setInterval(() => {
        if (!isStillLoading) {
          clearInterval(interval); // Clear the interval if loading is complete
        } else {
          displayAllBets();
          updateStates(); // Call updateStates again if still loading
        }
      }, 1000); // Update every second

      // Cleanup function to clear the interval on component unmount or when dependencies change
      return () => clearInterval(interval);
    }
  }, [contractInstance, bets_balance, contractAddress, contract]);

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

  useEffect(() => {
    // Fetch rates from the server
    const fetchRates = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/rates`
        );
        const data = await response.json();
        setCryptoRates(data); // Store rates in state
        console.log("crypyto rate data:", data);
      } catch (error) {
        console.error("Error fetching rates:", error);
      }
    };

    fetchRates();
  }, []);

  // Function to calculate USD equivalent
  const calculateUsdEquivalent = (amount, currency) => {
    const rate = cryptoRates[currency + "_RATE"]; // Get the rate for the selected currency

    if (rate) {
      return (amount * rate).toFixed(2); // Calculate and format to 2 decimal places
    }
    return 0;
  };

  // Update the input change handler for different fields
  const handleCryptoInputChange = (e, fieldName) => {
    const value = e.target.value;
    const amount = parseFloat(value);

    console.log("Chain is", contract.chain.chainId);
    const currency = contract?.chain?.chainId.toString();
    console.log("Currency:", currency);

    // Update the specific field's state based on fieldName
    if (fieldName === "myLocked") {
      setmyLocked(value);
    } else if (fieldName === "buyInIChoose") {
      setbuyInIChoose(value);
    } else if (fieldName.startsWith("editDeployed-")) {
      // Extract the position from the fieldName (e.g., "editDeployed-123")
      const position = fieldName.split("-")[1];
      setNewDeployedPrices((prev) => ({
        ...prev,
        [position]: value,
      }));
    } else if (fieldName.startsWith("editAsking-")) {
      // Extract the position from the fieldName (e.g., "editAsking-123")
      const position = fieldName.split("-")[1];
      setNewAskingPrices((prev) => ({
        ...prev,
        [position]: value,
      }));
    }

    // Calculate and update the USD equivalent
    if (!isNaN(amount)) {
      const usdValue = calculateUsdEquivalent(amount, currency);
      setUsdEquivalents((prev) => ({
        ...prev,
        [fieldName]: usdValue,
      }));
    } else {
      setUsdEquivalents((prev) => ({
        ...prev,
        [fieldName]: 0,
      }));
    }
  };

  const handleBetAction = async (action, data) => {
    try {
      const requestBody = {
        action,
        ...data,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/bets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text(); // Get error details as text
        throw new Error(
          `Error performing ${action}: ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json(); // This will now work as expected
      console.log(result.message); // Output: Bet bought successfully

      // Handle the response based on the action
      switch (action) {
        case "deploy":
          console.log("Bet deployed successfully with betId:", result.betId);
          return result.betId;
        case "buy":
          console.log("Bet bought successfully");
          break;
        case "resell":
          console.log("Bet listed for resale successfully");
          break;
        case "unlist":
          console.log("Bet unlisted successfully");
          break;
        case "edit":
          console.log("Bet edited successfully");
          break;
        case "cancel":
          console.log("Bet Cancelled Successfully");
        default:
          console.log("Action completed successfully");
      }

      return result;
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      throw error; // Rethrow the error for further handling
    }
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
          `<p>You are depositing <strong>${myBet} ${chain?.nativeCurrency?.symbol}</strong>. If <strong>${selectedName}</strong> wins and another user buys this bet for <strong>${buyIn} ${chain?.nativeCurrency?.symbol}</strong>, you will be rewarded <strong>${total} ${chain?.nativeCurrency?.symbol}</strong>. If another user does not buy in by the time the deployer of the bet declares a winner, you will be refunded <strong>${myBet} ${chain?.nativeCurrency?.symbol}</strong>. You are eligible to unlist this bet at any time. Do you accept the terms?</p>`
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

            const receipt = await tx.wait();

            // Extract the positionInArray from the transaction receipt
            const event = receipt.events.find(
              (event) => event.event === "userCreatedABet"
            );
            if (!event) {
              throw new Error(
                "NewBetCreated event not found in transaction receipt"
              );
            }

            const positionInArray = event.args.positionInArray;

            // Update the database after the transaction is successful
            await updateBetterMongoDB(contractAddress, signerAddress);

            const data = {
              address: signerAddress,
              amount: myBet,
              buyerAmount: buyIn,
              condition: selectedOutcome,
              contractAddress: contractAddress,
              positionInArray: positionInArray,
            };
            await handleBetAction("deploy", data);
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

      console.log(positions, "positions");
      console.log(positionsArray, "positions Array");

      const tx = await contractInstance.unlistBets(positions);
      await tx.wait();

      for (const positionInArray of positionsArray) {
        const betData = {
          address: signerAddress,
          contractAddress,
          positionInArray: positionInArray,
        };
        console.log(positionInArray, "position Array");

        await handleBetAction("unlist", betData);
      }
      setSelectedBets([]);
    } catch (error) {
      console.log("Can't unlist bet, this is why:");
      console.log(error);
    }
  };

  const buyBet = async (positionInArray, purchasePrice, index) => {
    try {
      console.log("Position Array: ", typeof positionInArray);

      const selectedName =
        bets_balance.allbets[index].conditionForBuyerToWin === 1
          ? contract.eventA
          : contract.eventB;

      const buyerPrice =
        bets_balance.allbets[index].amountBuyerLocked > 0
          ? bets_balance.allbets[index].amountBuyerLocked
          : bets_balance.allbets[index].amountToBuyFor;

      // Assuming you already have a web3 instance initialized
      const buyerPriceEth = ethers.utils.formatEther(buyerPrice, "ether");

      const winnings =
        parseFloat(
          ethers.utils.formatEther(
            bets_balance.allbets[index].amountDeployerLocked
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

          const betData = {
            address: signerAddress,
            contractAddress,
            positionInArray: positionInArray,
          };

          console.log(bigNumberToNumber(positionInArray), "position IN Aray");

          // Call the backend API
          await handleBetAction("buy", betData);
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

  const cancelBet = async (positionInArray) => {
    try {
      // Set the content of the modal to ask for user confirmation
      setModalContent(
        `<p>Are you sure you want to cancel this bet? This action is irreversible and you will no longer participate in this bet.</p>`
      );

      // Set the action to be executed when the user confirms the modal
      setModalAction(() => async () => {
        try {
          // Call the cancelOwnedBet function from the contract
          const tx = await contractInstance.cancelOwnedBet(positionInArray);
          await tx.wait();

          const betData = {
            address: signerAddress,
            contractAddress,
            positionInArray: positionInArray,
          };

          // Call the backend API to process the cancellation
          await handleBetAction("cancel", betData);

          alert("Bet has been successfully canceled.");
        } catch (error) {
          // Log the error or display a message to the user
          console.error("Error occurred during cancellation:", error);
          alert("Failed to cancel the bet. Please try again.");
        }
      });

      // Show the modal to the user
      setShowModal(true);
    } catch (error) {
      console.log("Unable to initiate bet cancellation:", error);
    }
  };

  const listBetForSale = async (positionInArray, askingPrice) => {
    try {
      const valueInWei = ethers.utils.parseEther(askingPrice.toString());

      setModalContent(
        `<p>You are selling this bet for <strong>${askingPrice} ${chain?.nativeCurrency?.symbol}</strong> and will no longer be participating. Do you agree?</p>`
      );
      setModalAction(() => async () => {
        try {
          const tx = await contractInstance.sellAnExistingBet(
            positionInArray,
            valueInWei
          );
          await tx.wait();
          const betData = {
            address: signerAddress,
            contractAddress,
            positionInArray: positionInArray,
            amount: askingPrice,
          };

          // Call the backend API
          await handleBetAction("resell", betData);
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
        `<p>The new amount that you will have locked up is <strong>${newDeployedPriceInEth} ${chain?.nativeCurrency?.symbol}</strong> and the new purchase price for this bet is <strong>${newAskingPriceInEth} ${chain?.nativeCurrency?.symbol}</strong>. Do you agree?</p>`
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
          const betData = {
            address: signerAddress,
            contractAddress,
            positionInArray: positionInArray,
            amount: newDeployedPriceInEth, // Use 'amount' for deployed amount
            buyerAmount: newAskingPriceInEth,
          };

          // Call the backend API
          await handleBetAction("edit", betData);
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

    // Add USD equivalent calculation
    const amount = parseFloat(value);
    const currency = contract?.chain?.chainId.toString();

    if (!isNaN(amount)) {
      const usdValue = calculateUsdEquivalent(amount, currency);
      setUsdEquivalents((prev) => ({
        ...prev,
        [`resellPrice-${index}`]: usdValue,
      }));
    } else {
      setUsdEquivalents((prev) => ({
        ...prev,
        [`resellPrice-${index}`]: 0,
      }));
    }
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
    console.log("CalculateTotalWinningsRunning");
    if (!Array.isArray(allbets)) {
      return "0";
    }

    // Fetch amount made from sold bets once and ensure proper conversion to Ether
    const amountMadeFromSoldBetsInWei =
      await contractInstance.amountMadeFromSoldBets(signerAddress);
    const amountMadeFromSoldBets = ethers.utils.parseEther(
      ethers.utils.formatEther(amountMadeFromSoldBetsInWei)
    ); // Keep it as a BigNumber
    console.log(amountMadeFromSoldBets, "Amount made from sold Bets");
    // Filter and process bets
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

    // Map over the filtered bets and process async calls
    const winningsPromises = filteredBets.map(async (bet) => {
      const amountDeployerLocked = ethers.utils.parseEther(
        ethers.utils.formatEther(bet.amountDeployerLocked)
      );
      const amountBuyerLocked = ethers.utils.parseEther(
        ethers.utils.formatEther(bet.amountBuyerLocked)
      );

      return amountDeployerLocked
        .add(amountBuyerLocked)
        .add(amountMadeFromSoldBetsInWei);
    });

    // Wait for all promises to resolve
    const winnings = await Promise.all(winningsPromises);

    const totalWinnings = winnings.reduce((total, currentWinnings) => {
      return total.add(currentWinnings); // Using BigNumber addition
    }, ethers.BigNumber.from(0));

    console.log(`Total Winnings: ${ethers.utils.formatEther(totalWinnings)}`);

    return ethers.utils.formatEther(totalWinnings).toString();
  };

  const bigNumberToNumber = (bigNumber) => {
    return parseInt(bigNumber._hex, 16);
  };

  const displayAllBets = useCallback(async () => {
    if (contractInstance) {
      try {
        const [allbets, endTime, winner, state, endOfVoting, winnings] =
          await contractInstance.allBets_Balance();

        if (state.toString() === "0") {
          setTotalWinnings(await calculateTotalWinnings(allbets));
        } else {
          const WinningsAsEth = ethers.utils.formatEther(winnings); // Convert BigNumber (wei) to string (ether)

          setTotalWinnings(WinningsAsEth); // Set the state with a human-readable ether value
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

  const getBetStatus = (bet, bettingAddress) => {
    const currentAddress = bettingAddress.toLowerCase();

    // Check if the deployer is the current address
    if (bet.deployer === currentAddress) {
      if (!bet.isActive) {
        return "Bet Has Been Cancelled And Refunded";
      }
      if (bet.buyer === null && bet.betForSale) {
        return "Bet is Open, No One Accepted";
      } else if (bet.buyer !== null) {
        return "Bet Is Accepted and Pending";
      }
    }

    // Check if the buyer is the current address
    if (bet.buyer === currentAddress) {
      // New condition: if the buyer is the current address, there's at least one reseller,
      // and the last reseller is not the buyer
      if (
        bet.reseller.length > 0 &&
        bet.reseller[bet.reseller.length - 1] !== bet.buyer
      ) {
        return `I bought this Bet for ${
          bet.resellPrice[bet.resellPrice.length - 1]
        }`;
      }

      // Check if the bet is not for sale
      if (!bet.betForSale) {
        return "Bet Is Pending";
      }

      // Check if the bet is for sale
      if (bet.betForSale) {
        return `Bet Is For Sale For: ${
          bet.resellPrice[bet.resellPrice.length - 1]
        }`;
      }
    }

    // Check if the current address is in the reseller array
    const resellerIndex = bet.reseller.indexOf(currentAddress);
    if (resellerIndex !== -1) {
      if (bet.buyer !== currentAddress) {
        return `Bet Resold For: ${bet.resellPrice[resellerIndex]}`;
      } else if (resellerIndex === bet.reseller.length - 1) {
        return `Bet Is For Sale For: ${
          bet.resellPrice[bet.resellPrice.length - 1]
        }`;
      }
    }

    // Default status if no other conditions are met
    return bet.betForSale
      ? bet.deployer === currentAddress
        ? "No One Bought"
        : "Re-Selling Not Sold"
      : "Not Active";
  };

  const changeState = async (state) => {
    if (contractInstance) {
      try {
        // Prepare modal content for user confirmation
        setModalContent(
          `<p>Are you sure you want to change the contract to state <strong>${state}</strong>? This action cannot be undone.</p>`
        );

        // Define action for the modal confirmation
        setModalAction(() => async () => {
          try {
            const tx = await contractInstance.changeState(state);
            await tx.wait();

            alert("State Changed Successfully!");
          } catch (error) {
            console.error("Transaction Error:", error);
            alert("Failed to changeState");
          }
        });

        // Show the modal for user confirmation
        setShowModal(true);
      } catch (error) {
        console.error("Error while changing State:", error);
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
    const fetchContractWithRetries = async (address) => {
      const maxRetries = 5; // Set the maximum number of retries
      let attempts = 0; // Initialize the attempt counter

      while (attempts < maxRetries) {
        console.log(
          `Fetching details for contract: ${address}, Attempt: ${attempts + 1}`
        );
        try {
          const data = await fetchContractDetails(address);
          if (data) {
            setContract(data);
            return; // Exit if successful
          } else {
            console.log("Contract data not found or error occurred");
          }
        } catch (error) {
          console.error("Fetching contract details failed", error);
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retrying
      }
      console.error("Max retries reached. Unable to fetch contract details.");
    };

    if (contractAddress && signer) {
      fetchContractWithRetries(contractAddress);
      console.log("contractDetails Set");
    } else {
      console.log(
        "contractAddress or signer is undefined, waiting for them to be set"
      );
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
      // Define the event names
      const eventNames = [
        "userCreatedABet",
        "BetUnlisted",
        "userBoughtBet",
        "userReListedBet",
        "winnerDeclaredVoting",
        "userVoted",
        "userWithdrew",
        "BetEdited",
        "BetCancelled",
      ];

      // Define handler functions for the events
      const eventHandler = () => {
        displayAllBets();
        fetchUserBets(signerAddress, contractAddress);
      };

      // Attach event listeners
      eventNames.forEach((eventName) => {
        contractInstance.on(eventName, eventHandler);
      });

      // Cleanup function
      return () => {
        eventNames.forEach((eventName) => {
          contractInstance.off(eventName, eventHandler);
        });
      };
    }
  }, [contractInstance, signer, signerAddress, contractAddress]);

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
      ) : isStillLoading ? (
        <div className="loading-container">
          <div className="loading-content">
            <h2 className="loading-title">Loading Betting Arena</h2>
            <div className="loading-spinner-container">
              <div className="loading-spinner"></div>
            </div>
            <p className="loading-message">
              Preparing your personalized betting experience...
            </p>
            <div className="loading-progress">
              <div className="loading-bar"></div>
            </div>
          </div>
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
                  <h2>Potential Winnings:</h2>
                  <div className="winnings-amount">
                    <span className="crypto-amount">
                      {totalWinnings} {chain?.nativeCurrency?.symbol}
                    </span>
                    <div className="usd-equivalent-display">
                      <span className="usd-symbol">$</span>
                      <span className="usd-amount">
                        {calculateUsdEquivalent(
                          totalWinnings,
                          contract?.chain?.chainId.toString()
                        )}
                      </span>
                      <span className="usd-label">USD</span>
                    </div>
                  </div>
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

                  {/* Dropdown to select contract state to change to */}
                  <select
                    id="stateSelect"
                    className="dropdown"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    <option value="0">State: OPEN</option>
                    <option value="1">State: VOTING</option>
                    <option value="2">State: UNDERREVIEW</option>
                    <option value="3">State: SETTLED</option>
                  </select>

                  {/* Button to change contract state */}
                  <button
                    className="change-state-btn"
                    onClick={() => changeState(selectedState)}
                  >
                    Change Contract State
                  </button>
                </div>
              )}
          </div>

          <div className="betting-interface-column">
            <div className="betting-actions">
              {bets_balance.state === 0 && (
                <div className="countdown-container">
                  <h3>Tournament Ends:</h3>
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
                        <div className="bet-input-group">
                          <input
                            className="input-field"
                            value={myLocked || ""}
                            onChange={(e) =>
                              handleCryptoInputChange(e, "myLocked")
                            }
                            placeholder={`Your Bet (${chain?.nativeCurrency?.symbol})`}
                            maxLength={20}
                          />
                          <div className="usd-equivalent">
                            <span className="usd-symbol">$</span>
                            <span className="usd-amount">
                              {usdEquivalents["myLocked"] || 0}
                            </span>
                            <span className="usd-label">USD</span>
                          </div>
                        </div>

                        <div className="bet-input-group">
                          <input
                            className="input-field"
                            value={buyInIChoose || ""}
                            onChange={(e) =>
                              handleCryptoInputChange(e, "buyInIChoose")
                            }
                            placeholder={`Opponent's Bet (${chain?.nativeCurrency?.symbol})`}
                            maxLength={20}
                          />
                          <div className="usd-equivalent">
                            <span className="usd-symbol">$</span>
                            <span className="usd-amount">
                              {usdEquivalents["buyInIChoose"] || 0}
                            </span>
                            <span className="usd-label">USD</span>
                          </div>
                        </div>
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
                          return (
                            bet.owner === signerAddress &&
                            bet.deployer !== signerAddress
                          );
                        case "all":
                        default:
                          return true;
                      }
                    })
                    .map((bet, index) => (
                      <div key={index} className="bet-card">
                        <h3>BetsGG</h3>
                        <div className="bet-details">
                          <div className="potential-win">
                            <p>Potential Win:</p>
                            <div className="win-amount">
                              <span className="crypto-amount">
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
                              </span>
                              <div className="usd-equivalent-small">
                                <span className="usd-symbol">$</span>
                                <span className="usd-amount">
                                  {calculateUsdEquivalent(
                                    ethers.utils.formatEther(
                                      ethers.BigNumber.from(
                                        bet.amountDeployerLocked
                                      ).add(
                                        ethers.BigNumber.from(
                                          bet.amountBuyerLocked > 0
                                            ? bet.amountBuyerLocked
                                            : bet.amountToBuyFor
                                        )
                                      )
                                    ),
                                    contract?.chain?.chainId.toString()
                                  )}
                                </span>
                                <span className="usd-label">USD</span>
                              </div>
                            </div>
                          </div>
                          {bet.selling && (
                            <div className="purchase-cost">
                              <p>Purchase Cost:</p>
                              <div className="cost-amount">
                                <span className="crypto-amount">
                                  {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                                  {chain?.nativeCurrency?.symbol}
                                </span>
                                <div className="usd-equivalent-small">
                                  <span className="usd-symbol">$</span>
                                  <span className="usd-amount">
                                    {calculateUsdEquivalent(
                                      ethers.utils.formatEther(
                                        bet.amountToBuyFor
                                      ),
                                      contract?.chain?.chainId.toString()
                                    )}
                                  </span>
                                  <span className="usd-label">USD</span>
                                </div>
                              </div>
                            </div>
                          )}
                          <p>
                            Winning Condition:{" "}
                            {signerAddress && bet.deployer === signerAddress
                              ? bet.conditionForBuyerToWin === 1
                                ? contract.eventB
                                : contract.eventA
                              : bet.conditionForBuyerToWin === 1
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
                                buyBet(
                                  bet.positionInArray,
                                  bet.amountToBuyFor,
                                  index
                                )
                              }
                            >
                              Buy This Bet
                            </button>
                          )
                        ) : !bet.selling &&
                          bet.owner === signerAddress &&
                          bet.deployer !== signerAddress ? (
                          <div className="relist-bet">
                            <div className="bet-input-group">
                              <input
                                className="relist-price-input"
                                value={betPrices[index] || ""}
                                onChange={(e) =>
                                  handleChangePrice(e.target.value, index)
                                }
                                placeholder={`Resell Price (${chain?.nativeCurrency?.symbol})`}
                                maxLength={100}
                              />
                              <div className="usd-equivalent">
                                <span className="usd-symbol">$</span>
                                <span className="usd-amount">
                                  {usdEquivalents[`resellPrice-${index}`] || 0}
                                </span>
                                <span className="usd-label">USD</span>
                              </div>
                            </div>
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
                            <div className="edit-bet-container">
                              {editingBetId === bet.positionInArray ? (
                                <div className="edit-bet-section">
                                  <div className="edit-header">
                                    <h4>Edit Your Deployed Bet</h4>
                                    <button
                                      className="close-edit-btn"
                                      onClick={() => setEditingBetId(null)}
                                    >
                                      ×
                                    </button>
                                  </div>
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
                                      {ethers.utils.formatEther(
                                        bet.amountToBuyFor
                                      )}{" "}
                                      {chain?.nativeCurrency?.symbol}
                                    </p>
                                  </div>
                                  <div className="edit-inputs">
                                    <div className="bet-input-group">
                                      <input
                                        className="edit-input"
                                        value={
                                          newDeployedPrices[
                                            bet.positionInArray
                                          ] || ""
                                        }
                                        onChange={(e) => {
                                          setNewDeployedPrices({
                                            ...newDeployedPrices,
                                            [bet.positionInArray]:
                                              e.target.value,
                                          });
                                          handleCryptoInputChange(
                                            e,
                                            `editDeployed-${bet.positionInArray}`
                                          );
                                        }}
                                        placeholder={`New Deployed (${chain?.nativeCurrency?.symbol})`}
                                        maxLength={100}
                                      />
                                      <div className="usd-equivalent">
                                        <span className="usd-symbol">$</span>
                                        <span className="usd-amount">
                                          {usdEquivalents[
                                            `editDeployed-${bet.positionInArray}`
                                          ] || 0}
                                        </span>
                                        <span className="usd-label">USD</span>
                                      </div>
                                    </div>

                                    <div className="bet-input-group">
                                      <input
                                        className="edit-input"
                                        value={
                                          newAskingPrices[
                                            bet.positionInArray
                                          ] || ""
                                        }
                                        onChange={(e) => {
                                          setNewAskingPrices({
                                            ...newAskingPrices,
                                            [bet.positionInArray]:
                                              e.target.value,
                                          });
                                          handleCryptoInputChange(
                                            e,
                                            `editAsking-${bet.positionInArray}`
                                          );
                                        }}
                                        placeholder={`New Ask (${chain?.nativeCurrency?.symbol})`}
                                        maxLength={100}
                                      />
                                      <div className="usd-equivalent">
                                        <span className="usd-symbol">$</span>
                                        <span className="usd-amount">
                                          {usdEquivalents[
                                            `editAsking-${bet.positionInArray}`
                                          ] || 0}
                                        </span>
                                        <span className="usd-label">USD</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="edit-actions">
                                    <button
                                      className="save-changes-btn"
                                      onClick={() =>
                                        editADeployedBet(
                                          bet.positionInArray,
                                          newDeployedPrices[
                                            bet.positionInArray
                                          ] ||
                                            ethers.utils.formatEther(
                                              bet.amountDeployerLocked
                                            ),
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
                                    <button
                                      className="cancel-bet-btn"
                                      onClick={() =>
                                        cancelBet(bet.positionInArray)
                                      }
                                    >
                                      Cancel Bet
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="edit-bet-btn"
                                  onClick={() =>
                                    setEditingBetId(bet.positionInArray)
                                  }
                                >
                                  Edit Bet
                                </button>
                              )}
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
          <div className="betting-history-column">
            <h2>Your Betting History</h2>
            {isLoadingBets ? (
              <div className="loading-spinner">Loading history...</div>
            ) : userBetsHistory.length > 0 ? (
              <div className="history-list">
                {userBetsHistory.map((bet, index) => {
                  const betStatus = signerAddress
                    ? getBetStatus(bet, signerAddress)
                    : "Loading...";

                  return (
                    <div className="history-card" key={index}>
                      <div className="history-card-header">
                        <span className="bet-number">BetsGG</span>
                        <span
                          className={`bet-status ${betStatus
                            .toLowerCase()
                            .replace(/[0-9.]/g, "") // Remove numbers and decimal points
                            .replace(/\s+for:\s+.*$/, "-for-sale") // Replace "for: {price}" with "-for-sale"
                            .replace(/\s+/g, "-") // Replace remaining spaces with hyphens
                            .trim()}`}
                        >
                          {betStatus}
                        </span>
                      </div>

                      {/* Only show the body if the bet status is not "" */}
                      {!betStatus.includes("Bet Resold For") && (
                        <div className="history-card-body">
                          <div className="bet-amount">
                            <span>Amount Bet:</span>
                            <strong>
                              {bet.deployedAmount}{" "}
                              {chain?.nativeCurrency?.symbol}
                            </strong>
                          </div>

                          <div className="bet-prediction">
                            <span>My Prediction:</span>
                            <strong>
                              {signerAddress &&
                                (signerAddress.toLowerCase() ===
                                bet.deployer.toLowerCase()
                                  ? bet.condition === "1"
                                    ? contract.eventA
                                    : contract.eventB
                                  : bet.condition === "1"
                                  ? contract.eventB
                                  : contract.eventA)}
                              Wins
                            </strong>
                          </div>

                          {bet.buyerAmount && (
                            <div className="potential-return">
                              <span>Potential Return:</span>
                              <strong>
                                {bet.buyerAmount + bet.deployedAmount}{" "}
                                {chain?.nativeCurrency?.symbol}
                              </strong>
                            </div>
                          )}

                          <div className="bet-timestamp">
                            <span>Placed:</span>
                            <time>
                              {new Date(bet.timestamp).toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-history">
                <div className="empty-state">
                  <span className="empty-icon">🎲</span>
                  <h3>No Betting History</h3>
                  <p>You haven't placed any bets in this market yet.</p>
                  {isBettingOpen && (
                    <button
                      className="start-betting-btn"
                      onClick={() => setShowInputs(true)}
                    >
                      Place Your First Bet
                    </button>
                  )}
                </div>
              </div>
            )}
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
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          padding: 2rem;
        }

        .loading-content {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 500px;
          width: 100%;
        }
        .loading-title {
          color: #4ecdc4;
          font-size: 2rem;
          margin-bottom: 2rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .loading-spinner-container {
          margin: 2rem 0;
        }

        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(78, 205, 196, 0.1);
          border-left-color: #4ecdc4;
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 1s linear infinite;
        }

        .loading-message {
          color: #b0b0b0;
          font-size: 1.1rem;
          margin: 1.5rem 0;
          line-height: 1.6;
        }

        .loading-progress {
          background: rgba(255, 255, 255, 0.1);
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 2rem;
        }

        .loading-bar {
          height: 100%;
          width: 30%;
          background: linear-gradient(90deg, #4ecdc4, #45b7d1);
          border-radius: 2px;
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        @media (max-width: 768px) {
          .loading-content {
            padding: 2rem;
          }

          .loading-title {
            font-size: 1.5rem;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
          }
        }

        .betting-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: #e0e0e0;
          font-family: "Roboto", sans-serif;
        }

        .relist-price-input {
          width: 100%;
          padding: 0.75rem;
          padding-right: 120px; /* Make room for the USD display */
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .relist-price-input:focus {
          outline: none;
          border-color: rgba(78, 205, 196, 0.5);
          box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.2);
        }
        .betting-history-column {
          flex: 1;
          min-width: 250px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 1rem;
          margin-top: 1rem;
          height: calc(
            100vh - 200px
          ); /* Adjust the 200px based on your header height */
          display: flex;
          flex-direction: column;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
          padding-right: 0.5rem;
          flex: 1;
          /* Add custom scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: rgba(78, 205, 196, 0.5) rgba(255, 255, 255, 0.1);
        }

        /* Custom scrollbar for webkit browsers */
        .history-list::-webkit-scrollbar {
          width: 6px;
        }

        .history-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .history-list::-webkit-scrollbar-thumb {
          background: rgba(78, 205, 196, 0.5);
          border-radius: 3px;
        }

        .history-list::-webkit-scrollbar-thumb:hover {
          background: rgba(78, 205, 196, 0.7);
        }

        .history-card {
          flex-shrink: 0; /* Prevent cards from shrinking */
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s ease;
          margin-bottom: 1rem; /* Ensure consistent spacing */
        }

        .history-card:hover {
          transform: translateY(-2px);
        }

        .history-card-header {
          background: rgba(0, 0, 0, 0.2);
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bet-number {
          font-weight: bold;
          color: #4ecdc4;
        }

        .bet-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          text-transform: capitalize;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        /* Open Bets */
        .bet-status.bet-is-open-no-one-accepted {
          background: linear-gradient(135deg, #00b894, #00cec9);
          color: white;
        }
        /* Existing bet-status styles */
        .bet-status.i-bought-this-bet-for-sale {
          background: linear-gradient(135deg, #20bf6b, #0fb9b1);
          color: white;
          animation: softPulse 2s infinite;
        }

        @keyframes softPulse {
          0% {
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 4px 8px rgba(32, 191, 107, 0.2);
          }
          100% {
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        }

        /* Pending Bets */
        .bet-status.bet-is-accepted-and-pending,
        .bet-status.bet-is-pending {
          background: linear-gradient(135deg, #6c5ce7, #a55eea);
          color: white;
        }

        /* For Sale Statuses */
        .bet-status.bet-is-for-sale-for-sale {
          background: linear-gradient(135deg, #ffd93d, #ff6b6b);
          color: #1a1a2e;
        }

        /* Resold Status */
        .bet-status.bet-resold-for-sale {
          background: linear-gradient(135deg, #4ecdc4, #45b7d1);
          color: white;
        }

        /* Inactive/Default Statuses */
        .bet-status.no-one-bought {
          background: linear-gradient(135deg, #636e72, #b2bec3);
          color: white;
        }

        .bet-status.re-selling-not-sold {
          background: linear-gradient(135deg, #fd79a8, #e84393);
          color: white;
        }

        .bet-status.not-active {
          background: linear-gradient(135deg, #2d3436, #636e72);
          color: white;
        }

        /* Hover effect for all statuses */
        .bet-status:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }

        .history-card-body {
          padding: 1rem;
          display: grid;
          gap: 0.75rem;
        }

        .history-card-body > div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-card-body span {
          color: #b0b0b0;
        }

        .history-card-body strong {
          color: #fff;
        }

        .no-history {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }

        .empty-state {
          text-align: center;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: block;
        }

        .start-betting-btn {
          margin-top: 1rem;
          background: #4ecdc4;
          color: #1a1a2e;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .start-betting-btn:hover {
          background: #45b7d1;
          transform: translateY(-2px);
        }

        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          color: #4ecdc4;
        }

        @media (max-width: 1200px) {
          .betting-history-column {
            order: 4;
          }
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
          min-width: 250px;
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

        .bet-input-group {
          position: relative;
          margin-bottom: 1rem;
        }

        .input-field {
          width: 100%;
          padding: 0.75rem;
          padding-right: 120px; /* Make room for the USD display */
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: rgba(78, 205, 196, 0.5);
          box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.2);
        }

        .potential-winnings h3 {
          color: #4ecdc4;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .winnings-amount {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .potential-win {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.5rem 0;
        }

        .win-amount {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .purchase-cost {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.5rem 0;
        }

        .cost-amount {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .crypto-amount {
          font-weight: bold;
          color: #4ecdc4;
        }

        .usd-equivalent-small {
          background: rgba(78, 205, 196, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #4ecdc4;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .usd-equivalent {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(78, 205, 196, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #4ecdc4;
          display: flex;
          align-items: center;
          gap: 2px;
          transition: all 0.3s ease;
        }

        .usd-symbol {
          color: #4ecdc4;
          font-weight: bold;
        }

        .usd-amount {
          color: #fff;
        }

        .usd-label {
          color: #4ecdc4;
          font-size: 0.75rem;
          text-transform: uppercase;
          margin-left: 2px;
        }

        /* Optional: Add a hover effect */
        .bet-input-group:hover .usd-equivalent {
          background: rgba(78, 205, 196, 0.2);
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
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .bet-card:last-child {
          margin-bottom: 0;
        }

        .bet-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .bet-details {
          font-size: 0.9rem;
          color: #b0b0b0;
        }
        .edit-bet-container {
          margin-top: 1rem;
        }

        .edit-bet-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
        }
        .close-edit-btn {
          background: none;
          border: none;
          color: #ff6b6b;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .close-edit-btn:hover {
          background: rgba(255, 107, 107, 0.1);
        }
        .edit-inputs {
          display: flex;
          flex-direction: column; /* Change to column to stack vertically */
          gap: 1rem;
          margin: 1rem 0;
        }

        .edit-input {
          width: 100%; /* Change from flex: 1 to width: 100% */
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .edit-input:focus {
          outline: none;
          border-color: rgba(78, 205, 196, 0.5);
          box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.2);
        }

        .edit-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .save-changes-btn {
          background: #4ecdc4;
          color: #1a1a2e;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        }

        .cancel-bet-btn {
          background: #ff6b6b;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        }
        .edit-bet-btn {
          background: #4ecdc4;
          color: #1a1a2e;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        }
        .edit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
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

        .bets-list-column {
          flex: 1;
          min-width: 250px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          height: calc(100vh - 150px); /* Match betting-history-column height */
          display: flex;
          flex-direction: column;
        }

        .bet-filters {
          flex-shrink: 0; /* Keep filters at top */
        }

        .bets-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
          padding-right: 0.5rem;
          flex: 1;
          /* Add custom scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: rgba(78, 205, 196, 0.5) rgba(255, 255, 255, 0.1);
        }

        /* Custom scrollbar for webkit browsers */
        .bets-list::-webkit-scrollbar {
          width: 6px;
        }

        .bets-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .bets-list::-webkit-scrollbar-thumb {
          background: rgba(78, 205, 196, 0.5);
          border-radius: 3px;
        }

        .bets-list::-webkit-scrollbar-thumb:hover {
          background: rgba(78, 205, 196, 0.7);
        }

        .bet-card {
          flex-shrink: 0; /* Prevent cards from shrinking */
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .unlist-selected-btn {
          flex-shrink: 0; /* Prevent button from shrinking */
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
