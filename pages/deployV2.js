import { ethers } from "ethers";
import predMarketArtifact from "../predMarket.json"; // path to the ABI and Bytecode
import React, { useState, useEffect } from "react";
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
  const deployerAddress = await signer.getAddress();

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
    ConditionOfMarket,
    deployerAddress
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
  const [timeToEndHours, setTimeToEndHours] = useState("");
  const timeToEnd =
    timeToEndDays * 86400 + timeToEndHours * 3600 + timeToEndMinutes * 60;
  const [endTimeDisplay, setEndTimeDisplay] = useState("");

  useEffect(() => {
    const totalTimeInSeconds =
      parseInt(timeToEndDays) * 86400 +
      parseInt(timeToEndHours) * 3600 +
      parseInt(timeToEndMinutes) * 60;

    const endTime = new Date(Date.now() + totalTimeInSeconds * 1000);
    setEndTimeDisplay(endTime.toLocaleString());
  }, [timeToEndDays, timeToEndHours, timeToEndMinutes]);

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
    if (tags.length > 20) {
      alert("You can only add up to 20 tags.");
      return;
    }
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
          <div className="time-inputs-container">
            {/* Time input fields */}
            <label className="input-label">
              Days
              <input
                className="time-input"
                type="number"
                value={timeToEndDays}
                onChange={(e) => setTimeToEndDays(e.target.value)}
              />
            </label>
            <label className="input-label">
              Hours
              <input
                className="time-input"
                type="number"
                value={timeToEndHours}
                onChange={(e) => setTimeToEndHours(e.target.value)}
              />
            </label>
            <label className="input-label">
              Minutes
              <input
                className="time-input"
                type="number"
                value={timeToEndMinutes}
                onChange={(e) => setTimeToEndMinutes(e.target.value)}
              />
            </label>
          </div>
          {/* Display Calculated End Time */}
          <p>Market will end on: {endTimeDisplay}</p>

          {/* Image URL */}
          <label className="input-label">
            Image URL
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Provide a URL for an image representing the market. This will be
                displayed alongside market details.
              </span>
            </span>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL"
            />
          </label>

          {/* Combined Odds Input */}
          <label className="input-label">
            Odds (e.g., 5/2)
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Enter the odds for the market. For example, '5/2' odds: '5' in
                the first box and '2' in the second box.
              </span>
            </span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                className="search-input odds-input"
                type="number"
                value={odds1}
                onChange={(e) => setOdds1(e.target.value)}
                style={{ marginRight: "5px" }}
              />
              <span>/</span>
              <input
                className="search-input odds-input"
                type="number"
                value={odds2}
                onChange={(e) => setOdds2(e.target.value)}
                style={{ marginLeft: "5px" }}
              />
            </div>
            {odds1 && odds2 && (
              <span className="tooltip">
                <span className="info-icon">i</span>
                <span className="tooltiptext">
                  Event A: This assumes event A is {odds2}/{odds1} as likely to
                  occur as event B and therefore a player who bets on event A
                  will leave with ((players initial bet*{odds1})/{odds2}) in
                  addition to their original bet.
                </span>
              </span>
            )}
            {odds1 && odds2 && (
              <span className="tooltip">
                <span className="info-icon">i</span>
                <span className="tooltiptext">
                  Event B: This assumes event B is {odds1}/{odds2} as likely to
                  occur as event A and therefore a player who bets on event B
                  will leave with ((players initial bet*{odds2})/{odds1}) in
                  addition to their original bet.
                </span>
              </span>
            )}
          </label>

          {/* Title of Market */}
          <label className="input-label">
            Title Of Market
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Provide a name or title for the market. This helps users
                identify the market easily.
              </span>
            </span>
            <input
              className="search-input"
              type="text"
              value={NameofMarket}
              onChange={(e) => setNameOfMarket(e.target.value)}
            />
          </label>

          {/* Conditions of Win/Loss */}
          <label className="input-label">
            Conditions of Win/Loss and Where Documented
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Describe the conditions for winning or losing in this market.
                Also, mention where these conditions are documented.
              </span>
            </span>
            <input
              className="search-input"
              type="text"
              value={ConditionOfMarket}
              onChange={(e) => setConditionOfMarket(e.target.value)}
            />
          </label>

          {/* Select Category */}
          <label className="input-label">
            Select Category
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Choose a category for the market from the dropdown. This helps
                in classifying and filtering markets.
              </span>
            </span>
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

          {/* Tags */}
          <label className="input-label">
            Tags (comma-separated)
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Enter any relevant tags for the market, separated by commas.
                Tags help in searchability and organization of markets.
              </span>
            </span>
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
