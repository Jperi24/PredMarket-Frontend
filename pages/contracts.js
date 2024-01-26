import React, { useState, useEffect } from "react";
import { getContracts } from "../data/contractStore";
import CountdownTimer from "../components/CountDownTimer";
import Header from "../components/Header";
import { useRouter } from "next/router";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContracts, setFilteredContracts] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchContracts() {
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
    const queryLower = searchQuery.toLowerCase().split(/\s+/); // Split query into words

    const filtered = contracts.filter((contract) => {
      // Check for tag, address, or name match
      const tagMatch = contract.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const addressMatch = contract.address
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Split name of the market into words and check for significant word overlap
      const nameWords = contract.NameofMaket.toLowerCase().split(/\s+/);
      const nameMatch =
        queryLower.filter((word) => nameWords.includes(word)).length >=
        queryLower.length * 0.5; // At least 50% word match

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
      <Header getContracts={getContracts} />
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
        <button onClick={() => handleTagFilter("LeagueOfLegends")}>
          League Of Legends
        </button>
        <button onClick={() => handleTagFilter("CSGO")}>CS:GO</button>
        <button onClick={() => handleTagFilter("Fortnite")}>Fortnite</button>
        <button onClick={() => setFilteredContracts(contracts)}>
          All Contracts
        </button>
      </div>
      <ul className="contracts-list">
        {filteredContracts.map((contract) => (
          <li
            key={contract.address}
            className="contract-item"
            onClick={() => navigateToMarket(contract.address)}
          >
            {contract.imageUrl ? (
              <img
                src={contract.imageUrl}
                alt="Contract Image"
                style={{ width: "100px", height: "100px" }}
              />
            ) : (
              <img
                src="../data/noPhotoAvail.jpg" // Replace with the path to your default image
                alt="Default Image"
                style={{ width: "100px", height: "100px" }}
              />
            )}
            <p>
              <strong>Address:</strong> {contract.address}
            </p>
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
            <p>
              <strong>Addres of deployer {contract.deployerAddress}</strong>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
