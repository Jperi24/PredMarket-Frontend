import { ethers } from "ethers";
import predMarketArtifact from "../predMarket.json"; // path to the ABI and Bytecode
import React, { useState } from "react";
import Header from "../components/Header";

import { addContract } from "../data/contractStore";

const deployPredMarket = async (
  timeToEnd,
  odds1,
  odds2,
  tags,
  imageUrl,
  NameofMaket,
  ConditionOfMarket
) => {
  const localNetworkURL = "http://localhost:8545";
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const PredMarket = new ethers.ContractFactory(
    predMarketArtifact.abi,
    predMarketArtifact.bytecode,
    signer
  );

  const predMarket = await PredMarket.deploy(timeToEnd, odds1, odds2);
  const endTime = Math.floor(Date.now() / 1000) + parseInt(timeToEnd);
  addContract(
    predMarket.address,
    endTime,
    odds1,
    odds2,
    tags,
    imageUrl,
    NameofMaket,
    ConditionOfMarket
  );
  console.log("Contract deployed to:", predMarket.address);
  console.log("Contract deployed with: ", tags, "  tags");
  console.log("Address of deployer:", await signer.getAddress());
};

export default function DeployPredMarket() {
  const [timeToEndDays, setTimeToEndDays] = useState("");
  const [timeToEndMinutes, setTimeToEndMinutes] = useState("");
  const [odds1, setOdds1] = useState("");
  const [odds2, setOdds2] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [NameofMarket, setNameOfMarket] = useState("");
  const [ConditionOfMarket, setConditionOfMarket] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const timeToEnd = timeToEndDays * 86400 + timeToEndMinutes * 60;

  const handleDeploy = async () => {
    if (
      !timeToEnd ||
      !odds1 ||
      !odds2 ||
      !NameofMarket ||
      !ConditionOfMarket ||
      !category
    ) {
      alert("Please fill out all fields before deploying.");
      return;
    }
    let finalTags = category ? `${category},${tags}` : tags;
    await deployPredMarket(
      timeToEnd,
      odds1,
      odds2,
      finalTags.split(",").map((tag) => tag.trim()),
      imageUrl,
      NameofMarket,
      ConditionOfMarket
    );
  };

  return (
    <div className="page-container">
      <Header />
      <header className="header">
        <h1>Deploy Prediction Market</h1>
      </header>

      <div className="market-interaction-container">
        <div className="contract-container">
          <label className="input-label">
            Days Until Betting Period Expires
            <input
              className="search-input"
              type="number"
              value={timeToEndDays}
              onChange={(e) => setTimeToEndDays(e.target.value)}
            />
          </label>
          <label className="input-label">
            Minutes Until Betting Period Expires
            <input
              className="search-input"
              type="number"
              value={timeToEndMinutes}
              onChange={(e) => setTimeToEndMinutes(e.target.value)}
            />
          </label>
          <label className="input-label">
            Image URL
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL"
            />
          </label>

          <label className="input-label">
            Odds 1 (e.g., 5 in 5/2)
            <input
              className="search-input"
              type="number"
              value={odds1}
              onChange={(e) => setOdds1(e.target.value)}
            />
          </label>
          <label className="input-label">
            Odds 2 (e.g., 2 in 5/2)
            <input
              className="search-input"
              type="number"
              value={odds2}
              onChange={(e) => setOdds2(e.target.value)}
            />
          </label>

          <label className="input-label">
            Title OfMarket
            <input
              className="search-input"
              type="text"
              value={NameofMarket}
              onChange={(e) => setNameOfMarket(e.target.value)}
            />
          </label>

          <label className="input-label">
            Conditions of Win/Loss and Where Documented
            <input
              className="search-input"
              type="text"
              value={ConditionOfMarket}
              onChange={(e) => setConditionOfMarket(e.target.value)}
            />
          </label>

          <label className="input-label">
            Select Category
            <select
              className="search-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              <option value="SSBMelee">SSB Melee</option>
              <option value="SSBUltimate">SSB Ultimate</option>
              <option value="LeagueOfLegends">League Of Legends</option>
              <option value="CSGO">CS:GO</option>
              <option value="Fortnite">Fortnite</option>
            </select>
          </label>

          <label className="input-label">
            Tags (comma-separated)
            <input
              className="search-input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>

          <button className="search-button" onClick={handleDeploy}>
            Deploy Market
          </button>
        </div>
      </div>
    </div>
  );
}
