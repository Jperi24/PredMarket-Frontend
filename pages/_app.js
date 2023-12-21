import "../styles/ContractsPage.css";

import {
  WagmiConfig,
  RainbowKitProvider,
  wagmiConfig,
  chains,
} from "/components/rainbowkit.jsx";

export default function App({ Component, pageProps }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />;
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
