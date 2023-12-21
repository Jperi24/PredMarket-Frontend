import React, { useState } from "react";
import { useRouter } from "next/router";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = ({ getContracts }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchClick = async () => {
    const contractsData = await getContracts();
    const filtered = contractsData.filter((contract) =>
      contract.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    // Assuming you want to do something with the filtered contracts
  };

  return (
    <div className="header">
      <ConnectButton />
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
      {/* Add other categories or navigation elements here if needed */}
    </div>
  );
};

export default Header;
