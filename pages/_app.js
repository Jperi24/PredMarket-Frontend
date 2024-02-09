import "../styles/ContractsPage.css";

import {
  WagmiConfig,
  RainbowKitProvider,
  wagmiConfig,
  chains,
} from "/components/rainbowkit.jsx";

import { ThirdwebProvider } from "@thirdweb-dev/react";

export default function App({ Component, pageProps }) {
  return (
    // <WagmiConfig config={wagmiConfig}>
    //   <RainbowKitProvider chains={chains}>

    //   </RainbowKitProvider>
    // </WagmiConfig>
    <ThirdwebProvider activeChain="localhost">
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}
