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

  // const [allBets, setAllBets] = useState({
  //   allBets: [], // Assuming this would be an array of objects
  //   balance: 0,
  //   myDeployedBets: [],
  //   myBetsIBetOn: [],
  //   myAmountInLockedBets: 0,
  //   myAmountToWin: 0,
  // });
  const [bets_balance, setbetsbalance] = useState({
    allbets: [],
    balance: 0,
    endTime: 0,
    winner: 0,
  });
  const [filter, setFilter] = useState("forSale");

  const bigNumberToString = (bigNumber) =>
    parseInt(bigNumber._hex, 16).toString();

  const sellANewBet = async (myBet, buyIn, selectedOutcome) => {
    console.log(myBet);
    console.log(buyIn);
    console.log(selectedOutcome);
    try {
      // Convert myBet from ether to wei and ensure it's a BigNumber
      const valueInWei = ethers.utils.parseEther(myBet.toString());

      const tx = await contractInstance.sellANewBet(buyIn, selectedOutcome, {
        value: valueInWei,
      });
      await tx.wait();
    } catch (error) {
      console.log("Can't send new bet, this whyyyy");
      console.log(error);
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

  const calculateTotalWinnings = (allbets) => {
    return Array.isArray(allbets)
      ? allbets
          .filter(
            (bet) =>
              bet.deployer === signerAddress || bet.owner === signerAddress
          )
          .reduce(
            (total, bet) =>
              total +
              parseInt(
                bigNumberToString(
                  bet.amountDeployerLocked + bet.amountBuyerLocked
                )
              ),
            0
          )
      : 0;
  };

  const displayAllBets = async () => {
    if (contractInstance) {
      try {
        let allbets, balance, endTime, winner;
        [allbets, balance, endTime, winner] =
          await contractInstance.allBets_Balance();
        console.log(allbets, "all the bets");

        setbetsbalance({
          allbets: allbets,
          balance: balance,
          endTime: endTime,
          winner: winner,
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
                    <h4>Tournament: {contract.NameofMaket}</h4>
                    <h4>{contract.fullName}</h4>
                    <div>
                      {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
                      {contract.eventB}
                    </div>
                    <h4>Balance: {bets_balance.balance.toString()}</h4>
                    <p>Total Potential Winnings: {totalWinnings}</p>
                  </h4>
                </div>
              </div>

              <div className="input-container">
                <button
                  className="toggle-inputs-btn"
                  onClick={() => setShowInputs(!showInputs)}
                >
                  {showInputs ? "Hide Details" : "Enter Bet Details"}
                </button>

                {showInputs && (
                  <>
                    <input
                      style={{
                        width: "10%",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                      value={myLocked}
                      onChange={(e) => setmyLocked(e.target.value)}
                      placeholder="How Much I am Locking In Before Deploying This Bet"
                    />
                    <input
                      style={{
                        width: "10%",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                      value={buyInIChoose}
                      onChange={(e) => setbuyInIChoose(e.target.value)}
                      placeholder="How Much is required To Buy This Bet"
                    />
                    <select
                      id="outcomeSelect"
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
                        sellANewBet(myLocked, buyInIChoose, selectedOutcome)
                      }
                    >
                      Submit Bet
                    </button>
                  </>
                )}
              </div>

              <div>
                <h3>You're Gay In:</h3>

                <CountdownTimer
                  endTime={bigNumberToString(bets_balance.endTime)}
                  style={{
                    fontSize: "20px", // Larger font size for the countdown
                    fontWeight: "bold",
                    textAlign: "center", // Center align text
                    color: "#ffeb3b", // Make the countdown numbers stand out
                  }}
                />
                <h3> And the winner is : {bets_balance.winner}</h3>
              </div>
            </div>

            <div>
              <button onClick={() => setFilter("all")}>All Bets</button>
              <button onClick={() => setFilter("forSale")}>
                Bets For Sale
              </button>
              <button onClick={() => setFilter("deployedByMe")}>
                My Deployed Bets
              </button>
              <button onClick={() => setFilter("ownedByMe")}>Bets I Own</button>
            </div>

            <div>
              {/* List all bets */}
              <ul>
                <div class="bets-container">
                  {selectedBets.length > 0 && (
                    <button onClick={() => unlistBet(selectedBets)}>
                      Unlist All Selected
                    </button>
                  )}
                  {bets_balance.allbets &&
                    Array.isArray(bets_balance.allbets) &&
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
                        <div key={index} class="bet">
                          <h3>Bet {index + 1}</h3>

                          <div class="bet-info">
                            Amount To Win:{" "}
                            {bigNumberToString(
                              bet.amountDeployerLocked.add(
                                bet.amountBuyerLocked
                              )
                            )}
                          </div>

                          {bet.selling && (
                            <div class="bet-info">
                              Cost To Purchase:{" "}
                              {bigNumberToString(bet.amountToBuyFor)}
                            </div>
                          )}
                          <div class="bet-info">
                            Owner Of Bet Wins If :{" "}
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
                                value={newPrice}
                                onChange={(e) => setnewPrice(e.target.value)}
                                placeholder="ReSell Price"
                              />
                              <button
                                onClick={() =>
                                  listBetForSale(bet.positionInArray, newPrice)
                                }
                              >
                                Re-List Bet
                              </button>
                            </>
                          ) : null}
                        </div>
                      ))}
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
