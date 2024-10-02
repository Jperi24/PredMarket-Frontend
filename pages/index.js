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
  const currentTime = Math.floor(Date.now() / 1000);

  useEffect(() => {
    async function fetchInitialContracts() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/getContracts`
      );

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

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "red";
      case "ongoing":
        return "green";
      case "upcoming":
        return "light green";
      default:
        return "transparent";
    }
  };

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
    return `${process.env.NEXT_PUBLIC_BASE_URL2}/${foundImage || defaultImage}`; // Use the foundImage if available, otherwise use defaultImage
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
        for (const contract of allContracts) {
          console.log("collection Name");
          console.log(contract.collectionName);
        }
        console.log("Filtered for allBets:", filtered);
        break;
      // case "userBets":
      //   filtered = filtered.filter(
      //     (contract) =>
      //       contract.betters &&
      //       contract.betters.includes(signer) &&
      //       (contract.collectionName === "Contracts" ||
      //         contract.collectionName === "ExpiredContracts" ||
      //         contract.collectionName === "Disagreements")
      //   );
      //   break;
      // case "ownerDeployed":
      //   filtered = filtered.filter(
      //     (contract) =>
      //       contract.deployerAddress === signer &&
      //       (contract.collectionName === "Contracts" ||
      //         contract.collectionName === "ExpiredContracts" ||
      //         contract.collectionName === "Disagreements")
      //   );
      //   break;
      // case "voteTimeExists":
      //   filtered = filtered.filter(
      //     (contract) => contract.voteTime && currentTime < contract.voteTime
      //   );
      //   break;

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
  const getWinnerDisplay = (contract) => {
    if (contract.status === "completed") {
      return contract.winner ? (
        <p className="winner">Winner: {contract.winner}</p>
      ) : (
        <p className="winner">Winner: Not available</p>
      );
    }
    return null;
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
    console.log(`http://localhost:3000/${tagMap[foundTag] || defaultImage}`);

    //NEXT_PUBLIC_BASE_URL=http://localhost:3001

    return `${process.env.NEXT_PUBLIC_BASE_URL2}/${
      tagMap[foundTag] || defaultImage
    }`;
  };

  return (
    <div className="page-container">
      <Header />
      <h1 className="title">Exciting Game Sets!</h1>
      <div className="search-container">
        <VideoGameSelector onFilterSelect={handleTagFilter} />
        {/* <div className="button-group">
          <button
            onClick={() => handleTagFilter("userBets")}
            className="filter-button"
          >
            <i className="fas fa-user"></i> My Bets
          </button>
          <button
            onClick={() => handleTagFilter("ownerDeployed")}
            className="filter-button"
          >
            <i className="fas fa-rocket"></i> My Deployed
          </button>
          <button
            onClick={() => handleTagFilter("voteTimeExists")}
            className="filter-button"
          >
            <i className="fas fa-clock"></i> Votable
          </button>
        </div> */}
        <div className="search-wrapper">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search for tags..."
            value={searchQuery}
            onChange={handleSearchChange}
            maxLength={100}
            className="search-input"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading exciting game sets...</p>
        </div>
      ) : (
        <div className="grid-container">
          {filteredContracts.map((contract) => (
            <div
              key={contract.address}
              className="grid-item"
              onClick={() => navigateToMarket(contract.address)}
              style={{ border: `2px solid ${getStatusColor(contract.status)}` }}
            >
              <div className="image-container">
                <img
                  src={getImageForTag(contract.tags)}
                  alt="Contract Image"
                  className="contract-image"
                />
                <img
                  src={getChainLogo(contract.chain.chainId)}
                  alt="Chain Logo"
                  className="chain-image"
                />
              </div>
              <h3 className="market-name">
                {contract.NameofMarket || "Unnamed Market"}
              </h3>
              <p className="full-name">{contract.fullName || ""}</p>
              <div className="versus">
                <span className="team">{contract.eventA}</span>
                <span className="vs">VS</span>
                <span className="team">{contract.eventB}</span>
              </div>
              <p className="status">Status: {contract.status}</p>
              {getWinnerDisplay(contract)}
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .page-container {
          padding: 20px;
          background-color: #f0f2f5;
          min-height: 100vh;
        }

        .title {
          text-align: center;
          color: #2c3e50;
          font-size: 2.5rem;
          margin-bottom: 30px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .search-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
        }

        .button-group {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .filter-button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 0 10px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-button:hover {
          background-color: #2980b9;
          transform: translateY(-2px);
        }

        .search-wrapper {
          position: relative;
          width: 100%;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 20px;
          border-radius: 20px;
          border: 2px solid #3498db;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
        }

        .search-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #3498db;
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 30px;
        }

        .grid-item {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .grid-item:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        }

        .image-container {
          position: relative;
          width: 100%;
          height: 0;
          padding-top: 56.25%; // 16:9 aspect ratio
          overflow: hidden;
          border-radius: 10px;
          margin-bottom: 15px;
        }

        .contract-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background-color: #f0f0f0; // Light grey background
        }

        .chain-image {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid white;
          background-color: white;
        }

        .market-name {
          font-size: 1.2rem;
          color: #2c3e50;
          margin-bottom: 5px;
        }

        .full-name {
          font-size: 0.9rem;
          color: #7f8c8d;
          margin-bottom: 10px;
        }

        .versus {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
        }

        .team {
          color: #2c3e50;
        }

        .vs {
          color: #e74c3c;
          font-size: 1.2rem;
        }

        .loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
        }

        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .title {
            font-size: 2rem;
          }

          .button-group {
            flex-wrap: wrap;
          }

          .filter-button {
            margin: 5px;
          }

          .grid-container {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
