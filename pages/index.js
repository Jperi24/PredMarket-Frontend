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
    async function fetchContracts() {
      const contractsData = await getContracts();
      setAllContracts(contractsData);
      applyFilters(contractsData, ""); // Apply initial filter (none)
      setIsLoading(false);
    }
    fetchContracts();
  }, []);

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

  const handleTagFilter = (filterType) => {
    setCurrentFilter(filterType);
    filterContractsByType(filterType);
  };

  const filterContractsByType = (filterType) => {
    let filtered = allContracts;
    switch (filterType) {
      case "allBets":
        break;
      case "userBets":
        filtered = filtered.filter(
          (contract) => contract.betters && contract.betters.includes(signer)
        );
        break;
      case "ownerDeployed":
        filtered = filtered.filter(
          (contract) => contract.deployerAddress === signer
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
              src={
                contract.tags && contract.tags.includes("SSBMelee")
                  ? "http://localhost:3000/MeleeBubble.png"
                  : contract.tags && contract.tags.includes("SSBUltimate")
                  ? "http://localhost:3000/SMASHULT.png"
                  : contract.tags && contract.tags.includes("LeagueOfLegends")
                  ? "http://localhost:3000/LeagueBubble.png"
                  : contract.tags && contract.tags.includes("CSGO")
                  ? "http://localhost:3000/CSGOBubble.png"
                  : contract.tags && contract.tags.includes("Fortnite")
                  ? "http://localhost:3000/FortniteBubble.png"
                  : "http://localhost:3000/noPhotoAvail.jpg"
              }
              alt="Contract Image"
              className="contract-image"
            />
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
