import { ethers } from "ethers";
import predMarketArtifact from "../predMarket.json"; // path to the ABI and Bytecode
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import { useSigner } from "@thirdweb-dev/react";
import { convertUsdToWei } from "../components/currencyConversionUtils";

import { addContract } from "../data/contractStore";

const deployPredMarket = async (
  timeToEnd,
  eventA,
  eventB,
  odds1,
  odds2,
  buyIn,
  tags,
  NameofMaket,
  ConditionOfMarket,
  signer
) => {
  // const localNetworkURL = "http://localhost:8545";
  // await window.ethereum.request({ method: "eth_requestAccounts" });
  // const provider = new ethers.providers.Web3Provider(window.ethereum);
  // const signer = provider.getSigner();

  const PredMarket = new ethers.ContractFactory(
    predMarketArtifact.abi,
    predMarketArtifact.bytecode,
    signer
  );
  const deployerAddress = await signer.getAddress();

  const predMarket = await PredMarket.deploy(timeToEnd, odds1, odds2, buyIn, {
    value: ethers.utils.parseEther("0.05"), // Example value, adjust accordingly
  });
  const endTime = Math.floor(Date.now() / 1000) + parseInt(timeToEnd);
  addContract(
    predMarket.address,
    endTime,
    eventA,
    eventB,
    odds1,
    odds2,
    buyIn,
    tags,
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
  const [eventA, seteventA] = useState("");
  const [eventB, seteventB] = useState("");
  const [odds1, setOdds1] = useState("");
  const [odds2, setOdds2] = useState("");
  const [buyIn, setBuyIn] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [NameofMarket, setNameOfMarket] = useState("");
  const [ConditionOfMarket, setConditionOfMarket] = useState("");
  const [timeToEndHours, setTimeToEndHours] = useState("");
  const timeToEnd =
    timeToEndDays * 86400 + timeToEndHours * 3600 + timeToEndMinutes * 60;
  const [endTimeDisplay, setEndTimeDisplay] = useState("");
  const signer = useSigner();

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
      !eventA ||
      !eventB ||
      !odds1 ||
      !odds2 ||
      !buyIn ||
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
    try {
      const buyInWei = await convertUsdToWei(buyIn);

      await deployPredMarket(
        timeToEnd,
        eventA,
        eventB,
        odds1,
        odds2,
        buyInWei,
        finalTags.split(",").map((tag) => tag.trim()),
        NameofMarket,
        ConditionOfMarket,
        signer
      );
      console.log("deployed successfully");
    } catch (error) {
      alert("deployment failed " + error.message);
    }
  };

  return (
    <div className="page-container">
      <Header />

      <div className="market-interaction-container">
        <div className="contract-container">
          <h3>Deploy Prediction Market</h3>
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
          <p style={{ fontSize: "20px", fontWeight: "bold" }}>
            People May Place And Edit Bets Up Until: {endTimeDisplay}
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            {" "}
            {/* Adjust the gap value as needed */}
            <label className="input-label">
              Set Event A
              <span className="tooltip">
                <span className="help-icon">?</span>
                <span className="tooltiptext"></span>
              </span>
              <input
                className="search-input"
                type="text"
                value={eventA}
                onChange={(e) => seteventA(e.target.value)}
              />
            </label>
            <label className="input-label">
              Set Event B
              <span className="tooltip">
                <span className="help-icon">?</span>
                <span className="tooltiptext"></span>
              </span>
              <input
                className="search-input"
                type="text"
                value={eventB}
                onChange={(e) => seteventB(e.target.value)}
              />
            </label>
          </div>

          {/* Combined Odds Input */}
          <label className="odds-input-label">
            Odds ({eventA}/{eventB})
            <div
              className="odds-input-group"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input
                className="odds-input"
                type="number"
                value={odds1}
                onChange={(e) => setOdds1(e.target.value)}
                style={{ marginRight: "5px" }}
              />
              <span>/</span>
              <input
                className="odds-input"
                type="number"
                value={odds2}
                onChange={(e) => setOdds2(e.target.value)}
                style={{ marginLeft: "5px" }}
              />
            </div>
            {odds1 && odds2 && (
              <span className="tooltip">
                <span className="info-icon">i</span>
                <span className="tooltiptext" style={{ marginLeft: "355px" }}>
                  Event A - {eventA}: This assumes {eventA} is {odds2}/{odds1}{" "}
                  as likely to occur as {eventB} and therefore a player who bets
                  on {eventA} will leave with ((players initial bet*{odds1})/
                  {odds2}) in addition to their original bet. Example, if Player
                  Bets $2 on {eventA} with 2/1 odds they will recieve $4 and be
                  eligible to withdraw their initial bet of $2.
                </span>
              </span>
            )}
            {odds1 && odds2 && (
              <span className="tooltip">
                <span className="info-icon">i</span>
                <span className="tooltiptext" style={{ marginLeft: "355px" }}>
                  Event B - {eventB}: This assumes {eventB} is {odds1}/{odds2}{" "}
                  as likely to occur as {eventA} and therefore a player who bets
                  on {eventB} will leave with ((players initial bet*{odds2})/
                  {odds1}) in addition to their original bet.Example, if Player
                  Bets $2 on {eventB} with 1/2 odds they will recieve $1 and be
                  eligible to withdraw their initial bet of $2.
                </span>
              </span>
            )}
          </label>

          <label className="input-label">
            Set User Buy In Price in $ - Cost To Participate
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                This is the amount a user has to pay one time to bet on either
                events, you keep this amount
              </span>
            </span>
            <input
              className="search-input"
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
            />
          </label>

          {/* Title of Market */}
          <label className="input-label">
            Title Of Market
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Choose a descriptive title for your prediction market. This
                title should be concise yet informative, helping users
                understand the nature of the market at a glance. Example:
                'Champions League Final Winner'.
              </span>
            </span>
            <input
              className="search-input"
              type="text"
              value={NameofMarket}
              onChange={(e) => setNameOfMarket(e.target.value)}
            />
          </label>

          {/* Select Category */}
          <label className="input-label">
            Select Category
            <span className="tooltip">
              <span className="help-icon">?</span>
              <span className="tooltiptext">
                Assign your market to a category to facilitate easier browsing
                and discovery for users.
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
                EInput relevant keywords as tags to enhance the market's
                discoverability. Separate tags with commas. Use tags like
                'sports', 'politics', or specific names relevant to the market
                for better classification. Example: 'WorldCup, SKT1, Faker
              </span>
            </span>
            <input
              className="search-input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>

          <div className="contract-conditions-form">
            {/* Definition of Bet A */}
            <div className="input-group">
              <label className="input-label">
                Bet A Details:
                <span className="tooltip">
                  <span className="help-icon">?</span>
                  <span className="tooltiptext">
                    Define Bet A by explaining the scenario in which betting on
                    A wins, including the criteria for victory and the payout
                    mechanism. Example: "Bet A wins if Team X scores first in
                    the game. Payout for Bet A is 2:1, meaning for every $1 bet,
                    $2 is won if Team X scores first."
                  </span>
                </span>
              </label>
              <textarea
                className="search-input"
                placeholder="Describe Bet A, its winning conditions, and payout details."
                onChange={(e) =>
                  setConditionOfMarket({
                    ...ConditionOfMarket,
                    betADetails: e.target.value,
                  })
                }
                rows="2"
              ></textarea>
            </div>

            {/* Definition of Bet B */}
            <div className="input-group">
              <label className="input-label">
                Bet B Details:
                <span className="tooltip">
                  <span className="help-icon">?</span>
                  <span className="tooltiptext">
                    Describe Bet B by detailing the conditions under which Bet B
                    wins, and explain how the payout is calculated. Example:
                    "Bet B wins if Team Y leads at halftime. The payout ratio
                    for Bet B is 3:1, awarding $3 for every $1 bet if Team Y is
                    ahead at halftime."
                  </span>
                </span>
              </label>
              <textarea
                className="search-input"
                placeholder="Explain Bet B, its conditions for winning, and the payout formula."
                onChange={(e) =>
                  setConditionOfMarket({
                    ...ConditionOfMarket,
                    betBDetails: e.target.value,
                  })
                }
                rows="2"
              ></textarea>
            </div>

            {/* Event Timing */}
            <div className="input-group">
              <label className="input-label">
                Event Timing:
                <span className="tooltip">
                  <span className="help-icon">?</span>
                  <span className="tooltiptext">
                    Specify the start and end dates/times for when bets can be
                    placed and when the event determining the outcome occurs.
                    Example: "Bets can be placed from January 1, 2023, 00:00 UTC
                    until January 7, 2023, 10:00 UTC. The outcome will be
                    determined during the game on January 7, 2023, starting at
                    12:00 UTC."
                  </span>
                </span>
              </label>
              <input
                className="search-input"
                type="text"
                placeholder="Enter the event's timing details."
                onChange={(e) =>
                  setConditionOfMarket({
                    ...ConditionOfMarket,
                    eventTiming: e.target.value,
                  })
                }
              />
            </div>

            {/* Sources of Information */}
            <div className="input-group">
              <label className="input-label">
                Sources of Information:
                <span className="tooltip">
                  <span className="help-icon">?</span>
                  <span className="tooltiptext">
                    Indicate where the event's outcome will be verified.
                    Example: "The outcome will be confirmed based on official
                    results posted on the Sports League Official Website and
                    corroborated by major news outlets such as ESPN."
                  </span>
                </span>
              </label>
              <input
                className="search-input"
                type="text"
                placeholder="List sources for outcome verification. -  Need A URL"
                onChange={(e) =>
                  setConditionOfMarket({
                    ...ConditionOfMarket,
                    informationSources: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <button className="search-button" onClick={handleDeploy}>
            Deploy Market
          </button>
        </div>
      </div>
    </div>
  );
}
