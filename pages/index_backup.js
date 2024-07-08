import React, { useState, useEffect } from "react";
import { getContracts } from "../data/contractStore";
import Header from "../components/Header";
import VideoGameSelector from "../components/videoGameSelector";
import { useRouter } from "next/router";
import { useAddress } from "@thirdweb-dev/react";

export default function ContractsPage() {
  const [allContracts, setAllContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const signer = useAddress();
  const router = useRouter();

  useEffect(() => {
    async function fetchInitialContracts() {
      const response = await fetch("http://localhost:3001/getContracts");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const contracts = await response.json();
      setAllContracts(contracts);

      console.log(contracts);
      setIsLoading(false);
    }

    fetchInitialContracts();
  }, []);

  useEffect(() => {
    if (allContracts.length > 0) {
      handleTagFilter("allBets");
    }
  }, [allContracts]); // Dependency on allContracts and currentFilter

  const applyFilters = (contracts, search) => {
    const filtered = contracts.filter((contract) => {
      return (
        contract.tags &&
        contract.tags
          .split(",")
          .some((tag) =>
            tag.trim().toLowerCase().includes(search.toLowerCase())
          )
      );
    });
    setFilteredContracts(filtered);
  };

  const getChainLogo = (id) => {
    const chainInfo = {
      1: "EthLogo.png",
      56: "BnbLogo.png",
      137: "PolygonLogo.png",
      43114: "avalancheLogo.jpg",
      250: "fantomLogo.png",
      31337: "hardHatLogo.png", // Assumes local Hardhat testnet uses the same rate as Ethereum
    };

    const defaultImage = "noPhotoAvail.jpg";
    const foundImage = chainInfo[id]; // Get the image filename directly from the map using the id
    return `http://localhost:3000/${foundImage || defaultImage}`; // Use the foundImage if available, otherwise use defaultImage
  };

  const handleTagFilter = (filterType) => {
    setCurrentFilter(filterType);
    filterContractsByType(filterType);
  };

  const filterContractsByType = (filterType) => {
    let filtered = allContracts;
    switch (filterType) {
      case "allBets":
        // Filter out contracts from "ExpiredContracts" and "Disagreements"
        filtered = filtered.filter(
          (contract) => contract.collectionName === "Contracts"
        );
        console.log("Filtered for allBets:", filtered);
        break;
      case "userBets":
        filtered = filtered.filter(
          (contract) =>
            contract.betters &&
            contract.betters.includes(signer) &&
            (contract.collectionName === "Contracts" ||
              contract.collectionName === "ExpiredContracts" ||
              contract.collectionName === "Disagreements")
        );
        break;
      case "ownerDeployed":
        filtered = filtered.filter(
          (contract) =>
            contract.deployerAddress === signer &&
            (contract.collectionName === "Contracts" ||
              contract.collectionName === "ExpiredContracts" ||
              contract.collectionName === "Disagreements")
        );
        break;
      default:
        filtered = filtered.filter(
          (contract) =>
            contract.tags &&
            contract.tags
              .split(",")
              .map((tag) => tag.trim())
              .includes(filterType)
        );
        break;
    }
    applyFilters(filtered, searchQuery);
  };

  const handleSearchChange = (e) => {
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);

    if (newSearchQuery.trim() === "") {
      // If the search query is empty, reset to the full list filtered by the current tag filter only
      handleTagFilter(currentFilter);
    } else {
      // Filter within the already filtered contracts by the tag filter
      const filteredBySearch = filteredContracts.filter(
        (contract) =>
          contract.tags &&
          contract.tags
            .split(",")
            .some((tag) =>
              tag.trim().toLowerCase().includes(newSearchQuery.toLowerCase())
            )
      );
      setFilteredContracts(filteredBySearch);
    }
  };

  const navigateToMarket = (contractAddress) => {
    router.push(`/market/${contractAddress}`);
  };

  const getImageForTag = (tags) => {
    const tagMap = {
      "Super Smash Bros. Melee": "Melee.jpg",
      "Super Smash Bros. Ultimate": "SSBUltimate.jpg",
      "TEKKEN 8": "tekken8.jpg",
      "Street Fighter 6": "streetfighter6.png",
      "Guilty Gear: Strive": "guiltygearstrive.jpg",
      Brawlhalla: "brawlhalla.jpg",
      "Rocket League": "rocketleague.jpg",
      "Pokémon Unite": "pokemonunite.jpg",
      "Counter-Strike 2": "csgo2.jpg",
      "Counter Strike: Global Offensive": "CSGO-Symbol.jpg",
      "Mortal Kombat 1": "mortalKombat1.jpg",

      "League of Legends": "League:.jpg",

      Fortnite: "FortniteImg.jpg",
      "Overwatch 2": "overwatch2.jpg", // Add your game images here
    };

    const defaultImage = "noPhotoAvail.jpg";
    const foundTag = tags.split(",").find((tag) => tagMap[tag.trim()]);
    return `http://localhost:3000/${tagMap[foundTag] || defaultImage}`;
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <Header />
        <h2>Deployed Contracts</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <h2>Deployed Contracts</h2>
      <div className="search-container">
        <VideoGameSelector onFilterSelect={handleTagFilter} />
        <button onClick={() => handleTagFilter("userBets")}>
          Bets I Bet On
        </button>
        <button onClick={() => handleTagFilter("ownerDeployed")}>
          Bets I Deployed
        </button>

        <input
          type="text"
          placeholder="Search by tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      <div className="grid-container2">
        {filteredContracts.map((contract) => (
          <div
            key={contract.address}
            className="grid-item"
            onClick={() => navigateToMarket(contract.address)}
          >
            <img
              src={getImageForTag(contract.tags)}
              alt="Contract Image"
              className="contract-image"
            />
            <img
              src={getChainLogo(contract.chain.chainId)}
              className="chain-image"
            />{" "}
            <p>{contract.NameofMarket || "No Market Name"}</p>
            <p>{contract.fullName || ""}</p>
            <div>
              {contract.eventA} <span style={{ color: "red" }}>VS</span>{" "}
              {contract.eventB}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
