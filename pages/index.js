import React, { useState, useEffect } from "react";
import { getContracts } from "../data/contractStore";
import CountdownTimer from "../components/CountDownTimer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { useAddress } from "@thirdweb-dev/react";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContracts, setFilteredContracts] = useState([]);
  const router = useRouter();
  // const [signer, setSigner] = useState("");

  const signer = useAddress();

  const handleUserBetsFilter = () => {
    const userAddress = signer;
    console.log(signer);
    const filtered = contracts.filter(
      (contract) =>
        Array.isArray(contract.betters) &&
        contract.betters.includes(userAddress)
    );
    setFilteredContracts(filtered);
  };

  useEffect(() => {
    async function fetchContracts() {
      //USED TO GET ADDRESS //////////////////////////////////////////////////////////////////////////////
      // if (typeof window.ethereum !== "undefined") {
      //   // await window.ethereum.request({ method: "eth_requestAccounts" });
      //   const tempProvider = new ethers.providers.JsonRpcProvider(
      //     "http://localhost:8545"
      //   );
      //   await window.ethereum.request({ method: "eth_requestAccounts" });

      //   // Create a provider that wraps around MetaMask's provider
      //   const provider = new ethers.providers.Web3Provider(window.ethereum);

      //   // Get the signer corresponding to the currently selected account in MetaMask
      //   const signer2 = provider.getSigner();
      //   // const tempSigner = tempProvider.getSigner();
      //   const signer3 = await signer2.getAddress();
      //   setSigner(signer3);
      // }
      //End Used to get address////////////////////////////////////////////////////////////////////////////////

      const contractsData = await getContracts();
      setContracts(contractsData);
      setFilteredContracts(contractsData); // Initially show all contracts
    }

    fetchContracts();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchClick = () => {
    const queryLower = searchQuery.toLowerCase().split(/\s+/);

    const filtered = contracts.filter((contract) => {
      const tagMatch = contract.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const addressMatch = contract.address
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const nameWords = contract.NameofMaket.toLowerCase().split(/\s+/);
      const nameMatch =
        queryLower.filter((word) => nameWords.includes(word)).length >=
        queryLower.length * 0.5;

      return tagMatch || addressMatch || nameMatch;
    });

    setFilteredContracts(filtered);
  };

  const handleTagFilter = (tag) => {
    const filtered = contracts.filter((contract) =>
      contract.tags.includes(tag)
    );
    setFilteredContracts(filtered);
  };

  const navigateToMarket = (contractAddress) => {
    router.push(`/market/${contractAddress}`);
  };

  return (
    <div className="page-container">
      <Header />
      <h1 className="header">Deployed Contracts</h1>
      <div className="search-container">
        <input
          className="search-input"
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by tags"
        />
        <button className="search-button" onClick={handleSearchClick}>
          Search
        </button>
        <button onClick={() => handleTagFilter("SSBMelee")}>SSB Melee</button>
        <button onClick={() => handleTagFilter("SSBUltimate")}>
          SSB Ultimate
        </button>
        <button onClick={() => handleTagFilter("LeagueOfLegends")}>LOL</button>
        <button onClick={() => handleTagFilter("CSGO")}>CS:GO</button>
        <button onClick={() => handleTagFilter("Fortnite")}>Fortnite</button>
        <button onClick={() => setFilteredContracts(contracts)}>
          All Contracts
        </button>
        <button onClick={() => handleUserBetsFilter()}> My Bets</button>
      </div>
      <div className="grid-container">
        {filteredContracts.map((contract) => (
          <div
            key={contract.address}
            className="grid-item"
            onClick={() => navigateToMarket(contract.address)}
          >
            <img
              src={
                contract.tags[0] === "SSBMelee"
                  ? "http://localhost:3000/MeleeBubble.png"
                  : contract.tags[0] === "SSBUltimate"
                  ? "http://localhost:3000/SMASHULT.png"
                  : contract.tags[0] === "LeagueOfLegends"
                  ? "http://localhost:3000/LeagueBubble.png"
                  : contract.tags[0] === "CSGO"
                  ? "http://localhost:3000/CSGOBubble.png"
                  : contract.tags[0] === "Fortnite"
                  ? "http://localhost:3000/FortniteBubble.png"
                  : "http://localhost:3000/noPhotoAvail.jpg" // default image if none of the tags match
              }
              alt="Contract Image"
              className="contract-image"
            />

            <p>
              <strong>Time left to Bet:</strong>
              <CountdownTimer endTime={contract.endTime} />
            </p>
            <p>
              <strong>Tags:</strong>{" "}
              {Array.isArray(contract.tags)
                ? contract.tags.join(", ")
                : contract.tags}
            </p>
            <p>
              <strong>Name of Market:</strong> {contract.NameofMaket}
            </p>
            <p>
              <strong>Condition of Market:</strong> {contract.ConditionOfMarket}
            </p>

            <p className="contract-address">
              <strong>Address:</strong> {contract.address}
            </p>

            <p className="deployer-address">
              <strong>Address of Deployer:</strong> {contract.deployerAddress}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
