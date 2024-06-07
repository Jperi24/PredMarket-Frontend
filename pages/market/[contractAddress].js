import { ethers } from "ethers";
import predMarketArtifact from "../../predMarketV2.json"; // path to the ABI and Bytecode

import { useSigner } from "@thirdweb-dev/react";
import Header from "../../components/Header";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";
import { resultKeyNameFromField } from "@apollo/client/utilities";

export default function PredMarketPageV2() {
  const [contractInstance, setContractInstance] = useState(null);
  const signer = useSigner();
  const commonChains = {
    56: {
      // Binance Smart Chain
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
      // Polygon
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
      // Avalanche
      chainName: "Avalanche Mainnet",
      rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
      nativeCurrency: {
        name: "Avalanche",
        symbol: "AVAX",
        decimals: 18,
      },
      blockExplorerUrls: ["https://snowtrace.io"],
    },
    250: {
      // Fantom
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
      // Hardhat Localhost
      chainName: "Hardhat Localhost",
      rpcUrl: "http://127.0.0.1:8545/",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      // Typically, there is no block explorer for localhost networks
      blockExplorerUrls: [],
    },
  };

  const [myLocked, setmyLocked] = useState(null);
  const [buyInIChoose, setbuyInIChoose] = useState(null);
  const [condition, setCondition] = useState(null);
  const [showInputs, setShowInputs] = useState(false);
  const [contract, setContract] = useState(null);
  const router = useRouter();
  const [selectedOutcome, setselectedOutcome] = useState("");
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

  const [bets_balance, setbetsbalance] = useState({
    allbets: [],
    endTime: 0,
    winner: 0,
    state: 0,
    endOfVoting: 0,
    winnings: 0,
  });
  const [filter, setFilter] = useState("forSale");

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

  const bigNumberToString = (bigNumber) =>
    parseInt(bigNumber._hex, 16).toString();

  const convertCryptoToUSD = (numberInCrypto) => {};

  const sellANewBet = async (myBet, buyIn, selectedOutcome) => {
    console.log(myBet);
    console.log(buyIn);
    console.log(selectedOutcome);
    if (contractInstance) {
      try {
        // Convert myBet from ether to wei and ensure it's a BigNumber
        const total = parseFloat(myBet) + parseFloat(buyIn);
        const reverseSelected = selectedOutcome === "1" ? "2" : "1";
        const selectedName =
          selectedOutcome === "1" ? contract.eventA : contract.eventB;
        const valueInWei = ethers.utils.parseEther(myBet.toString());
        const valueInWeiBuyIn = ethers.utils.parseEther(buyIn.toString());

        // Display the alert-style message to the user and get their response
        const userConfirmed = confirm(
          `You are depositing ${myBet} ETH. If ${selectedName} wins and another user buys this bet for ${buyIn} ETH, you will be rewarded ${total} ETH. If another user does not buy in by the time the deployer of the bet declares a winner, you will be refunded ${myBet} ETH. You are eligible to unlist this bet at any time. Do you accept the terms?`
        );

        if (!userConfirmed) {
          alert("You declined the terms. The bet was not placed.");
          return;
        }

        const tx = await contractInstance.sellANewBet(
          valueInWeiBuyIn,
          reverseSelected,
          {
            value: valueInWei,
          }
        );
        await tx.wait();
        updateBetterMongoDB(contractAddress, signerAddress);
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
      // Ensure positionsArray is an array, even if it's just one position
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

  const redeemBets = async () => {
    try {
      const tx = await contractInstance.redeemBets();
      await tx.wait();
      if (contract.disagreementText) {
        try {
          const response = await fetch(
            `http://localhost:3001/moveFromDisagreementsToContracts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ contractAddress }), // Include disagreement text here
            }
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
          // Consider setting state here to display the error on the UI if appropriate
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  // const listBet = async (positionInArray) => {
  //   try {
  //     // Convert myBet from ether to wei and ensure it's a BigNumber

  //     const tx = await contractInstance.listBet(positionInArray);
  //     await tx.wait();
  //   } catch (error) {
  //     console.log("Can't unlist bet, this whyyyy");
  //     console.log(error);
  //   }
  // };

  const buyBet = async (positionInArray, purchasePrice) => {
    try {
      // Convert myBet from ether to wei and ensure it's a BigNumber

      const selectedName =
        bets_balance.allbets[positionInArray].conditionForBuyerToWin === 1
          ? contract.eventA
          : contract.eventB;

      const buyerPrice =
        bets_balance.allbets[positionInArray].amountBuyerLocked > 0
          ? bets_balance.allbets[positionInArray].amountBuyerLocked
          : bets_balance.allbets[positionInArray].amountToBuyFor;

      const winnings =
        parseFloat(
          ethers.utils.formatEther(
            bets_balance.allbets[positionInArray].amountDeployerLocked
          )
        ) + parseFloat(ethers.utils.formatEther(buyerPrice));

      const purchasePriceString = ethers.utils.formatEther(purchasePrice);

      const userConfirmed = confirm(
        `You are spending ${purchasePriceString} to buy into a bet that states: if ${selectedName} wins you will be rewarded ${winnings}`
      );

      if (!userConfirmed) {
        alert("You declined the terms. The bet was not placed.");
        return;
      }

      const tx = await contractInstance.buyABet(positionInArray, {
        value: purchasePrice,
      });
      await tx.wait();
      updateBetterMongoDB(contractAddress, signerAddress);
    } catch (error) {
      console.log(error);
    }
  };

  const listBetForSale = async (positionInArray, askingPrice) => {
    try {
      // Convert myBet from ether to wei and ensure it's a BigNumber
      const valueInWei = ethers.utils.parseEther(askingPrice.toString());

      const userConfirmed = confirm(
        `You are selling this bet for ${askingPrice} ETH and will no longer be participating. Do you agree?`
      );

      if (!userConfirmed) {
        alert("You declined the terms. The bet was not placed.");
        return;
      }

      const tx = await contractInstance.sellAnExistingBet(
        positionInArray,
        valueInWei
      );
      await tx.wait();
    } catch (error) {
      console.log("Can't sell bet, this whyyyy");
      console.log(error);
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

  function handleChangePrice(value, index) {
    setBetPrices((prevPrices) => ({
      ...prevPrices,
      [index]: value, // Update the price for the specific bet
    }));
  }

  const BigNumber = require("bignumber.js");

  const calculateTotalWinnings = (allbets) => {
    if (!Array.isArray(allbets)) {
      return "0";
    }

    const totalWinnings = allbets
      .filter(
        (bet) => bet.deployer === signerAddress || bet.owner === signerAddress
      )
      .reduce((total, bet) => {
        // Convert BigNumber values to ether and then to numbers
        const amountDeployerLocked = parseFloat(
          ethers.utils.formatEther(bet.amountDeployerLocked)
        );
        const amountBuyerLocked = parseFloat(
          ethers.utils.formatEther(
            bet.amountBuyerLocked > 0 ? bet.amountBuyerLocked : 0
          )
        );

        // Check for NaN values and handle them appropriately
        if (isNaN(amountDeployerLocked) || isNaN(amountBuyerLocked)) {
          console.error("Invalid BigNumber conversion encountered.");
          return total;
        }

        // Sum up the locked amounts and add to the total
        return total + amountDeployerLocked + amountBuyerLocked;
      }, 0); // Start with zero

    // Return the total winnings as a string
    console.log(`Total Winnings: ${totalWinnings}`); // Final output before conversion
    return totalWinnings.toString(); // Convert to string for final output
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
          winnings: ethers.utils.formatEther(bigNumberToNumber(winnings)),
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

  const declareWinner = async (winner) => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.declareWinner(winner);
        await tx.wait();
      } catch (error) {
        console.log(error);
      }
    }
  };

  const voteDisagree = async (reason) => {
    if (contractInstance) {
      try {
        const tx = await contractInstance.disagreeWithOwner({
          value: ethers.utils.parseEther("0.05"),
        });
        await tx.wait();
        const response = await fetch(
          "http://localhost:3001/moveToDisagreements",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ contractAddress, reason }), // Include disagreement text here
          }
        );
      } catch (error) {
        console.log(error);
      }
    }
  };

  const fetchContractDetails = async (address) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/contracts/${address}`
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
      // Consider setting state here to display the error on the UI if appropriate
    }
  };

  useEffect(() => {
    // Only attempt to fetch if contractAddress is not undefined
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
  }, [contractAddress, signer]); // Ensure this effect runs whenever contractAddress changes

  const switchNetwork = async (targetChainId) => {
    const chainHex = `0x${targetChainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch (switchError) {
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
                  rpcUrls: [chainDetails.rpcUrl], // Ensure this is an array
                  blockExplorerUrls: chainDetails.blockExplorerUrls,
                },
              ],
            });
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
        }
      } else {
        console.error("Failed to switch the network:", switchError);
      }
    }
  };

  useEffect(() => {
    // Ensure that contractInstance is not null and is ready to use
    if (contractInstance && signer) {
      // Define a list of event names you want to listen to
      const eventNames = ["shithappened", "winnerDeclaredVoting", "userVoted"];

      // Attach the event listener for each event
      eventNames.forEach((eventName) => {
        contractInstance.on(eventName, displayAllBets);
      });

      // Cleanup function to remove the event listeners
      return () => {
        eventNames.forEach((eventName) => {
          contractInstance.off(eventName, displayAllBets);
        });
      };
    }
  }, [contractInstance, signer]);

  const handleSelectBet = (position) => {
    setSelectedBets(
      (prevSelectedBets) =>
        prevSelectedBets.includes(position)
          ? prevSelectedBets.filter((pos) => pos !== position) // Remove if already selected
          : [...prevSelectedBets, position] // Add if not already selected
    );
  };

  return (
    <>
      <main className="contract-container">
        <Header />
        {netWorkMismatch ? (
          <div className="network-switch-modal">
            <p>
              You are on the wrong network. Please switch to the correct one.
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
                    <h4>{contract.NameofMarket}</h4>
                    <h4>{contract.fullName}</h4>
                    <div>
                      {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
                      {contract.eventB}
                    </div>
                    {bets_balance.state === 0 ? (
                      <p>
                        Total Potential Winnings: {totalWinnings}{" "}
                        {chain?.nativeCurrency?.symbol}
                      </p>
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
                      {bets_balance.state === 0 &&
                      Math.floor(Date.now() / 1000) < bets_balance.endTime ? (
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
                              />
                              <input
                                className="input-field"
                                value={buyInIChoose}
                                onChange={(e) =>
                                  setbuyInIChoose(e.target.value)
                                }
                                placeholder={`Opponent's Bet In ${chain?.nativeCurrency?.symbol}`}
                              />
                              <select
                                className="dropdown"
                                value={selectedOutcome}
                                onChange={(e) =>
                                  setselectedOutcome(e.target.value)
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
                      ) : bets_balance.state === 1 ||
                        (bets_balance.state === 0 &&
                          Math.floor(Date.now() / 1000) >
                            bets_balance.endTime) ? (
                        <>
                          <p>The betting is closed or completed.</p>
                          <input
                            className="input-field"
                            value={disagreeText}
                            onChange={(e) => setDisagreeText(e.target.value)}
                            placeholder={`Disagreement Reason`}
                          />
                          <button onClick={() => voteDisagree(disagreeText)}>
                            Disagree
                          </button>
                        </>
                      ) : bets_balance.state === 2 &&
                        Math.floor(Date.now() / 1000) <
                          bets_balance.endOfVoting ? (
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
                          <h4>{bets_balance.winnings}</h4>
                          <button onClick={() => withdrawBet()}>
                            Withdraw Balance
                          </button>
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
                <div className="bets-container">
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
                          // Example filtering conditions, adjust according to your actual data structure
                          switch (filter) {
                            case "forSale":
                              return bet.selling; // Assuming this is a boolean indicating the bet is for sale
                            case "deployedByMe":
                              return bet.deployer === signerAddress; // You'll need to determine `signerAddress`
                            case "ownedByMe":
                              return bet.owner === signerAddress; // Adjust based on your data
                            case "all":
                            default:
                              return true; // No filtering, return all bets
                          }
                        })
                        .map((bet, index) => (
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
                                {ethers.utils.formatEther(
                                  bigNumberToString(bet.amountToBuyFor)
                                )}{" "}
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
                            ) : !bet.selling && bet.owner === signerAddress ? (
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
                          </div>
                        ))
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
                <>
                  <div>
                    <select id="outcomeSelect" className="dropdown">
                      <option value="1">Set Winner As {contract.eventA}</option>
                      <option value="2">Set Winner As {contract.eventB}</option>
                      <option value="3">Cancel Refund</option>
                    </select>
                    <button
                      onClick={() => {
                        const selectedOutcome =
                          document.getElementById("outcomeSelect").value;
                        declareWinner(parseInt(selectedOutcome, 10));
                      }}
                    >
                      End Bet
                    </button>
                    {bets_balance.state > 0 && (
                      <button onClick={() => redeemBets()}>Redeem Bets</button>
                    )}
                  </div>
                </>
              )}
          </div>
        )}
      </main>
    </>
  );
}
