import React, { useState } from "react";
import { useRouter } from "next/router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link"; // Importing Link from Next.js

const Header = ({}) => {
  return (
    <div className="header">
      <ConnectButton />

      {/* Navigation Buttons */}
      <div className="navigation-buttons">
        <Link href="/">Home</Link> {/* Link to Home Page */}
        <Link target="_blank" href="/deployingFAQ">
          FAQ
        </Link>{" "}
        {/* Link to FAQ Page */}
        <Link href="/deploy">Deploy A Pred Market</Link>{" "}
        {/* Link to Deployed Contracts Page */}
      </div>
    </div>
  );
};

export default Header;
