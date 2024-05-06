import { ethers } from "ethers";
import predMarketArtifact from "../../predMarketV2.json"; // path to the ABI and Bytecode

import { useSigner } from "@thirdweb-dev/react";
import Header from "../../components/Header";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import CountdownTimer, { timeLeft } from "../../components/CountDownTimer";

export default function PredMarketPageV2() {
  const [contractInstance, setContractInstance] = useState(null);
  const signer = useSigner();

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

  const [bets_balance, setbetsbalance] = useState({
    allbets: [],
    balance: 0,
    endTime: 0,
    winner: 0,
    state: 0,
  });
  const [filter, setFilter] = useState("forSale");

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

  const sellANewBet = async (myBet, buyIn, selectedOutcome) => {
    console.log(myBet);
    console.log(buyIn);
    console.log(selectedOutcome);
    if (contractInstance) {
      try {
        // Convert myBet from ether to wei and ensure it's a BigNumber
        const valueInWei = ethers.utils.parseEther(myBet.toString());

        const tx = await contractInstance.sellANewBet(buyIn, selectedOutcome, {
          value: valueInWei,
        });
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

      const tx = await contractInstance.buyABet(positionInArray, {
        value: purchasePrice,
      });
      await tx.wait();
      updateBetterMongoDB(contractAddress, signerAddress);
    } catch (error) {
      console.log("Can't unlist bet, this whyyyy");
      console.log(error);
    }
  };

  const listBetForSale = async (positionInArray, askingPrice) => {
    try {
      // Convert myBet from ether to wei and ensure it's a BigNumber

      const tx = await contractInstance.sellAnExistingBet(
        positionInArray,
        askingPrice
      );
      await tx.wait();
    } catch (error) {
      console.log("Can't sell bet, this whyyyy");
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
        // Use the bigNumberToString function to convert BigNumber values
        const amountDeployerLockedString = bigNumberToString(
          bet.amountDeployerLocked
        );
        const amountBuyerLockedString = bigNumberToString(
          bet.amountBuyerLocked
        );

        console.log(
          `Converted Deployer Locked: ${amountDeployerLockedString}, Converted Buyer Locked: ${amountBuyerLockedString}`
        ); // Debug output

        // Convert strings to numbers to perform addition
        const amountDeployerLocked = parseInt(amountDeployerLockedString, 10);
        const amountBuyerLocked = parseInt(amountBuyerLockedString, 10);

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

  const displayAllBets = async () => {
    if (contractInstance) {
      try {
        let allbets, balance, endTime, winner, state;
        [allbets, balance, endTime, winner, state] =
          await contractInstance.allBets_Balance();
        console.log(allbets, "all the bets");

        setbetsbalance({
          allbets: allbets,
          balance: balance,
          endTime: endTime,
          winner: winner,
          state: state,
        });

        const totalWinnings = calculateTotalWinnings(allbets);

        setTotalWinnings(totalWinnings);
      } catch (error) {
        console.log(error);
      }
    }
  };

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
            displayAllBets();
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
  }, [contractAddress, signer, contractInstance]); // Ensure this effect runs whenever contractAddress changes

  useEffect(() => {
    const deployContract = async () => {
      if (signer && typeof window.ethereum !== "undefined") {
        const tempContractInstance = new ethers.Contract(
          contractAddress,
          predMarketArtifact.abi,
          signer
        );
        if (signer) {
          const saddress = await signer.getAddress();
          setSignerAddress(saddress);
        }
        setContractInstance(tempContractInstance);
      }
    };

    if (contractAddress) {
      deployContract();
    }
  }, [contractAddress, signer]);

  useEffect(() => {
    // Ensure that contractInstance is not null and is ready to use
    if (contractInstance && signer) {
      const eventName = "shithappened"; // Make sure this matches your contract

      // Attach the event listener
      contractInstance.on(eventName, displayAllBets);

      // Cleanup function to remove the event listener
      return () => {
        contractInstance.off(eventName, displayAllBets);
      };
    }
  }, [contractInstance, signer]); // Depend on contractInstance to re-attach the listener if it changes

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
        {contract && (
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
                      <p>Total Potential Winnings: {totalWinnings}</p>
                    ) : (
                      <h4>Balance: {bets_balance.balance.toString()}</h4>
                    )}
                  </h4>
                </div>
                <div className="input-container">
                  <div>
                    <div className="countdown-container">
                      <h4 className="countdown-heading">Time left to bet:</h4>
                      <CountdownTimer
                        endTime={contract.endsAt}
                        className="countdown-time"
                      />
                    </div>

                    <div className="createBetContainer">
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
                            placeholder="My Bet"
                          />
                          <input
                            className="input-field"
                            value={buyInIChoose}
                            onChange={(e) => setbuyInIChoose(e.target.value)}
                            placeholder="Buyers Bet"
                          />
                          <select
                            className="dropdown"
                            value={selectedOutcome}
                            onChange={(e) => setselectedOutcome(e.target.value)}
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
                              {bigNumberToString(
                                bet.amountDeployerLocked.add(
                                  bet.amountBuyerLocked
                                )
                              )}
                            </div>
                            {bet.selling && (
                              <div className="bet-info">
                                Cost To Purchase:{" "}
                                {bigNumberToString(bet.amountToBuyFor)}
                              </div>
                            )}
                            <div className="bet-info">
                              Owner Of Bet Wins If:{" "}
                              {bet.conditionForBuyerToWin === 0
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
                                  placeholder="ReSell Price"
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

            {signerAddress == contract.deployerAddress && (
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
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
