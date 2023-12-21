import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import predMarketArtifact from "../../predMarket.json"; // Assuming correct path to the ABI and Bytecode

import CountdownTimer from "../../components/CountDownTimer";
import Header from "../../components/Header";
import { getContractDetails, getContracts } from "../../data/contractStore";

const MarketInteractionPage = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contractInstance, setContractInstance] = useState(null);
  const [bet, setBet] = useState("");
  const [reduction, setReduction] = useState("");
  const [bettor, setBettor] = useState(null);
  const router = useRouter();
  const { contractAddress } = router.query;

  useEffect(() => {
    if (contractAddress) {
      setContract(getContractDetails(contractAddress));
    }
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
        } catch (error) {
          console.error("Error finding bettor:", error);
        }
      }
    };

    // Function to handle account changes
    const handleAccountsChanged = (accounts) => {
      // You can add additional logic here if needed
      findBettor();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    findBettor();

    // Clean up function
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [contractInstance]); // Effect runs on component mount and when contractInstance changes

  const betOnOption = async (option) => {
    if (contractInstance && bet) {
      try {
        if (option == 0) {
          const tx = await contractInstance.betOnBetA({
            value: ethers.utils.parseEther(bet),
          });
          await tx.wait();
        } else {
          const tx = await contractInstance.betOnBetB({
            value: ethers.utils.parseEther(bet),
          });
          await tx.wait();
        }

        console.log(`Bet placed on ${option}`);
      } catch (error) {
        console.error(`Error placing bet on ${option}:`, error);
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

  if (!contract) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      <Header getContracts={getContracts} />
      <div className="contract-container">
        <h1 className="contract-title">{contract.name}</h1>
        <div className="contract-details">
          <p>
            <strong>Address:</strong> {contractAddress}
          </p>
          <p>
            <strong>Contract Name:</strong> {contract.NameOfMarket}
          </p>
          <p>
            <strong>Contract Condition:</strong> {contract.ConditionOfMarket}
          </p>
          <p>
            <strong>Contract Odds:</strong> {contract.odds1} / {contract.odds2}
          </p>
          <p>
            <CountdownTimer endTime={contract.endTime} />
          </p>
        </div>
        <input
          value={bet}
          onChange={(e) => setBet(e.target.value)}
          placeholder="Bet Amount"
        />
        <button onClick={() => betOnOption(0)}>Bet on A</button>
        <button onClick={() => betOnOption(1)}>Bet on B</button>

        <input
          value={reduction}
          onChange={(e) => setReduction(e.target.value)}
          placeholder="Bet Amount"
        />
        <button onClick={() => reduceBet("BetA")}>Reduce on A</button>
        <button onClick={() => reduceBet("BetB")}>Reduce on B</button>
        <div>
          {bettor ? (
            <>
              {bettor.betterA && (
                <>
                  <div>Bettor A: {bettor.betterA.bettor.toString()}</div>
                  <div>Bet Amount A: {bettor.betterA.amount.toString()}</div>
                  <div>
                    Odds A: {bettor.betterA.odds[0].toString()} /{" "}
                    {bettor.betterA.odds[1].toString()}
                  </div>
                  {/* Add more properties of betterA as needed */}
                </>
              )}
              {bettor.betterB && (
                <>
                  <div>Bettor B: {bettor.betterB.bettor.toString()}</div>
                  <div>Bet Amount B: {bettor.betterB.amount.toString()}</div>
                  <div>
                    Odds B: {bettor.betterB.odds[0].toString()} /{" "}
                    {bettor.betterB.odds[1].toString()}
                  </div>
                  {/* Add more properties of betterB as needed */}
                </>
              )}
              {!bettor.betterA && !bettor.betterB && <p>No information</p>}
            </>
          ) : (
            <p>No bettor information available</p>
          )}
        </div>
      </div>
    </>
  );
};

export default MarketInteractionPage;
