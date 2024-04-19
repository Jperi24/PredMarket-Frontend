import React, { useState, useEffect } from "react";
import { getContracts, getContracts2 } from "../data/contractStore";
import CountdownTimer from "../components/CountDownTimer";
import Header from "../components/Header";
import VideoGameSelector from "../components/videoGameSelector";
import { useRouter } from "next/router";
import { useAddress } from "@thirdweb-dev/react";

export default function ContractsPage() {
  const [allContracts, setAllContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const signer = useAddress();
  const router = useRouter();

  useEffect(() => {
    async function fetchContracts() {
      const contractsData = await getContracts();

      const combinedContracts = [...contractsData];
      setAllContracts(combinedContracts);
      applyFilters(combinedContracts, ""); // Apply initial filter (none)
      setIsLoading(false);
    }
    fetchContracts();
  }, []);

  const applyFilters = (contracts, search) => {
    let filtered = contracts.filter((contract) => {
      return (
        contract.tags &&
        contract.tags.toLowerCase().includes(search.toLowerCase())
      );
    });
    setFilteredContracts(filtered);
  };

  const handleTagFilter = (filterType) => {
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
    setSearchQuery(e.target.value);
    applyFilters(filteredContracts, e.target.value);
  };

  const navigateToMarket = (contractAddress) => {
    router.push(`/market/${contractAddress}`);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <Header />
        <h2>Deployed Contracts</h2>
        <div className="spinner"></div> {/* Loading spinner */}
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <h2>Deployed Contracts</h2>
      <div className="search-container">
        <VideoGameSelector onFilterSelect={handleTagFilter} />
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
