import React, { useState } from "react";
import { useRouter } from "next/router";
import { ConnectWallet } from "@thirdweb-dev/react";
import Link from "next/link"; // Importing Link from Next.js

const Header = ({}) => {
  return (
    <div className="header">
      {/* Navigation Buttons */}
      <div className="navigation-buttons">
        <Link href="/">Home</Link> {/* Link to Home Page */}
        <Link target="_blank" href="/deployingFAQ.pdf">
          Get Started
        </Link>{" "}
        {/* Link to FAQ Page */}
        <Link href="/tdisplay2">Create A Bet</Link>{" "}
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
