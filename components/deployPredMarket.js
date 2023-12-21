import { ethers } from "ethers";
import predMarketArtifact from "../predMarket.json"; // path to the ABI and Bytecode
import React, { useState } from "react";

import { addContract } from "../data/contractStore";

const deployPredMarket = async (
  timeToEnd,
  odds1,
  odds2,
  tags,
  NameofMaket,
  ConditionOfMarket
) => {
  // Define the local network URL, e.g., Ganache
  const localNetworkURL = "http://localhost:8545";

  // Create a provider for the local network
  // const provider = new ethers.providers.JsonRpcProvider(localNetworkURL);

  // Optionally, use a specific account from the local network
  // This requires the private key of the account; make sure to replace 'your_private_key_here' with the actual key
  // const signer = new ethers.Wallet('your_private_key_here', provider);

  // If you want to use MetaMask's account, uncomment these lines
  // await window.ethereum.request({ method: "eth_requestAccounts" });
  // const signer = provider.getSigner();

  await window.ethereum.request({ method: "eth_requestAccounts" });

  // Create a provider that wraps around MetaMask's provider
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  // Get the signer corresponding to the currently selected account in MetaMask
  const signer = provider.getSigner();

  // Create a factory for your contract
  const PredMarket = new ethers.ContractFactory(
    predMarketArtifact.abi,
    predMarketArtifact.bytecode,
    signer
  );

  // Deploy the contract
  const predMarket = await PredMarket.deploy(timeToEnd, odds1, odds2);
  const endTime = Math.floor(Date.now() / 1000) + parseInt(timeToEnd);
  addContract(
    predMarket.address,
    endTime,
    odds1,
    odds2,
    tags,
    NameofMaket,
    ConditionOfMarket
  );
  console.log("Contract deployed to:", predMarket.address);
  console.log("Contract deployed with: ", tags, "  tags");
  console.log("Address of deployer:", await signer.getAddress());
};

export default function DeployPredMarket() {
  const [timeToEnd, setTimeToEnd] = useState("");
  const [odds1, setodds1] = useState("");
  const [odds2, setodds2] = useState("");
  const [tags, setTags] = useState("");
  const [NameofMaket, setName] = useState("");
  const [ConditionOfMarket, setCondition] = useState("");

  const handleDeploy = async () => {
    if (!timeToEnd) return;
    await deployPredMarket(
      timeToEnd,
      odds1,
      odds2,
      tags.split(",").map((tag) => tag.trim()),
      NameofMaket,
      ConditionOfMarket
    ); // split and trim tags
  };

  return (
    <div>
      <input
        type="number"
        value={timeToEnd}
        onChange={(e) => setTimeToEnd(e.target.value)}
        placeholder="Time to End"
      />
      <input
        type="number"
        value={odds1}
        onChange={(e) => setodds1(e.target.value)}
        placeholder="odds1"
      />
      <input
        type="number"
        value={odds2}
        onChange={(e) => setodds2(e.target.value)}
        placeholder="odds2"
      />
      <input
        type="text"
        value={NameofMaket}
        onChange={(e) => setName(e.target.value)}
        placeholder="Title Of Market"
      />
      <input
        type="text"
        value={ConditionOfMarket}
        onChange={(e) => setCondition(e.target.value)}
        placeholder="Conditions of Win/Loss and Where Documented"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated)"
      />
      <button onClick={handleDeploy}>Deploy predMarket</button>
    </div>
  );
}
