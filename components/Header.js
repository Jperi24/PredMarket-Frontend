import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import Link from "next/link"; // Importing Link from Next.js

const Header = () => {
  const address = useAddress();
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [currentPhaseSets, setCurrentPhaseSets] = useState([]);

  useEffect(() => {
    // This useEffect will run whenever the wallet address changes
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

      // You can do more with the userData here if needed
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  return (
    <div className="header">
      {/* Navigation Buttons */}
      <div className="navigation-buttons">
        <Link href="/">Home</Link> {/* Link to Home Page */}
        <Link target="_blank" href="/deployingFAQ.pdf">
          Get Started
        </Link>
        {/* Link to FAQ Page */}
        <Link href="/tdisplay2">Create A Bet</Link>
        <Link href="/myAccount">My Account</Link>
        <Link href="/Moderation">Moderate</Link>
        {/* Link to Deployed Contracts Page */}
      </div>

      <ConnectWallet
        style={{
          background: "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)", // Lively gradient background
          padding: "10px",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Soft shadow for depth
          color: "white", // White text color for better contrast
        }}
      />
    </div>
  );
};

export default Header;
