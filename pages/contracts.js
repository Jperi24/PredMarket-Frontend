import React, { useState, useEffect } from "react";
import { getContracts } from "../data/contractStore";
import CountdownTimer from "../components/CountDownTimer";
import Header from "../components/Header";
import { useRouter } from "next/router";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContracts, setFilteredContracts] = useState([]);

  useEffect(() => {
    async function fetchContracts() {
      const contractsData = getContracts();
      setContracts(contractsData);
      setFilteredContracts(contractsData); // Initially show all contracts
    }
    fetchContracts();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchClick = () => {
    const filtered = contracts.filter((contract) =>
      contract.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredContracts(filtered);
  };
  const router = useRouter(); // Use the useRouter hook
  const navigateToMarket = (contractAddress) => {
    router.push(`/market/${contractAddress}`); // Use the router to navigate
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
      </div>
      <ul className="contracts-list">
        {filteredContracts.map((contract) => (
          <li
            key={contract.address}
            className="contract-item"
            onClick={() => navigateToMarket(contract.address)}
          >
            <p>
              <strong>Address:</strong> {contract.address}
            </p>
            <p>
              <strong>Time left to Bet:</strong>
              <CountdownTimer endTime={contract.endTime} />{" "}
              {/* Pass endTime here */}
            </p>
            <p>
              <strong>Tags:</strong> {contract.tags.join(", ")}
            </p>
            <p>
              <strong>Name of Market:</strong> {contract.NameofMaket}
            </p>
            <p>
              <strong>Condition of Market:</strong> {contract.ConditionOfMarket}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
