import "../styles/ContractsPage.css";
import React from "react"; // Add this line

import { ApolloProvider } from "@apollo/client";
import apolloClient from "../apollo-client"; // Adjust the import path to where your Apollo client instance is defined
import { ThirdwebProvider } from "@thirdweb-dev/react";

export default function App({ Component, pageProps }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ThirdwebProvider activeChain="localhost">
        <Component {...pageProps} />
      </ThirdwebProvider>
    </ApolloProvider>
  );
}
