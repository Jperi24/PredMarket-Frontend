import { ethers } from "ethers";
import predMarketArtifact from "../predMarketV2.json"; // path to the ABI and Bytecode

import { useSigner } from "@thirdweb-dev/react";
import Header from "../components/Header";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PredMarketPageV2() {
  const [contractInstance, setContractInstance] = useState(null);
  const signer = useSigner();

  const [myLocked, setmyLocked] = useState(null);
  const [buyInIChoose, setbuyInIChoose] = useState(null);
  const [condition, setCondition] = useState(null);
  const [selectedOutcome, setselectedOutcome] = useState("0");
  const [signerAddress, setSignerAddress] = useState(null);
  const [newPrice, setnewPrice] = useState(null);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);
  const { contractAddress } = router.query;
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
  });
  const [filter, setFilter] = useState("forSale");

  const bigNumberToString = (bigNumber) =>
    parseInt(bigNumber._hex, 16).toString();

  const deployPredMarketV2 = async (timeToEnd) => {
    const PredMarket = new ethers.ContractFactory(
      predMarketArtifact.abi,
      predMarketArtifact.bytecode,
      signer
    );

    const predMarket = await PredMarket.deploy(timeToEnd);
  };

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

  const unlistBet = async (positionInArray) => {
    try {
      // Convert myBet from ether to wei and ensure it's a BigNumber

      const tx = await contractInstance.unlistABet(positionInArray);
      await tx.wait();
    } catch (error) {
      console.log("Can't unlist bet, this whyyyy");
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
          .filter((bet) => bet.owner === signerAddress)
          .reduce(
            (total, bet) =>
              total + parseInt(bigNumberToString(bet.amountDeployerLocked)),
            0
          )
      : 0;
  };

  const calculateTotalLocked = (allbets) => {
    return Array.isArray(allbets)
      ? allbets
          .filter((bet) => bet.deployer === signerAddress)
          .reduce(
            (total, bet) =>
              total + parseInt(bigNumberToString(bet.amountDeployerLocked)),
            0
          )
      : 0;
  };

  const displayAllBets = async () => {
    if (contractInstance) {
      try {
        let allbets, balance;
        [allbets, balance] = await contractInstance.allBets_Balance();

        setbetsbalance({
          allbets: allbets,
          balance: balance,
        });

        const totalWinnings = calculateTotalWinnings(allbets);
        const totalLocked = calculateTotalLocked(allbets);
        setTotalWinnings(totalWinnings);
        setTotalLocked(totalLocked);
      } catch (error) {
        console.log(error);
      }
    }
  };
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

  return (
    <>
      <main className="contract-container">
        <Header />

        <button onClick={() => deployPredMarketV2(300)}>
          Deploy Pred Market
        </button>

        <div>
          <input
            style={{
              width: "100%",
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
              width: "100%",
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
            <option value="0">Set Winner A</option>
            <option value="1">Set Winner B</option>
          </select>
          <button
            onClick={() => sellANewBet(myLocked, buyInIChoose, selectedOutcome)}
          >
            Submit Bet
          </button>

          <div>
            <button onClick={() => setFilter("all")}>All Bets</button>
            <button onClick={() => setFilter("forSale")}>Bets For Sale</button>
            <button onClick={() => setFilter("deployedByMe")}>
              My Deployed Bets
            </button>
            <button onClick={() => setFilter("ownedByMe")}>Bets I Own</button>
          </div>

          <div>
            <h2>Bets and Balance</h2>
            {/* Display balance */}
            <p>Balance: {bets_balance.balance.toString()}</p>
            <p>Total Potential Winnings: {totalWinnings}</p>
            <p>Total Amount Locked: {totalLocked}</p>

            {/* List all bets */}
            <ul>
              <div class="bets-container">
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
                          {bigNumberToString(bet.amountDeployerLocked)}
                        </div>

                        {bet.selling && (
                          <div class="bet-info">
                            Cost To Purchase:{" "}
                            {bigNumberToString(bet.amountToBuyFor)}
                          </div>
                        )}
                        <div class="bet-info">
                          Win Condition: {bet.conditionForBuyerToWin}
                        </div>
                        {bet.selling ? (
                          bet.owner === signerAddress ? (
                            <button
                              onClick={() => unlistBet(bet.positionInArray)}
                            >
                              Unlist Bet
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                buyBet(bet.positionInArray, bet.amountToBuyFor)
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
        </div>
      </main>
    </>
  );
}
