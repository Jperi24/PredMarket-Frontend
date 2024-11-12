import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import Link from "next/link";

const Header = () => {
  const address = useAddress();
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [currentPhaseSets, setCurrentPhaseSets] = useState([]);

  useEffect(() => {
    if (address) {
      console.log("Wallet connected with address:", address);
      handleUserCheck(address);
    }
  }, [address]);

  const handleUserCheck = async (userAddress) => {
    console.log("Checking user with address:", userAddress);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/existingUser/${userAddress}`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  return (
    <div className="header">
      {address ? (
        // Navigation Buttons displayed if a wallet address is connected
        <div className="navigation-buttons">
          <Link href="/">Home</Link>
          <Link target="_blank" href="/deployingFAQ.pdf">
            Get Started
          </Link>
          <Link href="/tdisplay2">Create A Bet</Link>
          <Link href="/myAccount">My Account</Link>
        </div>
      ) : (
        <div className="connect-prompt">
          <div className="connect-prompt-content">
            <h2>Welcome to the BetsGG!</h2>
            <p>Connect your wallet to participate </p>
          </div>
        </div>
      )}

      {/* Wallet Connect Button */}
      <ConnectWallet
        style={{
          background: "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)",
          padding: "10px",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          color: "white",
        }}
      />
    </div>
  );
};

export default Header;
