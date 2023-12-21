import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base, zora } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

// Define your local chain configuration
const localChain = {
  id: 31337, // Common Chain ID for local networks like Ganache
  name: "Localhost",
  network: "localhost",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: "http://127.0.0.1:8545",
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://etherscan.io" },
  },
  testnet: true,
};

const { chains, publicClient } = configureChains(
  [mainnet, polygon, optimism, arbitrum, base, zora],
  [alchemyProvider({ apiKey: process.env.ALCHEMY_ID }), publicProvider()]
);

// const { chains, publicClient } = configureChains(
//   [localChain, mainnet, polygon, optimism, arbitrum, base, zora],
//   [
//     alchemyProvider({ apiKey: process.env.ALCHEMY_ID }),
//     publicProvider(),
//     jsonRpcProvider({
//       rpc: (chain) => {
//         // Ensure that the chain's rpcUrls is defined and has a 'default' property
//         if (chain.rpcUrls && chain.rpcUrls.default) {
//           return { http: chain.rpcUrls.default };
//         }
//         throw new Error(`RPC URL not found for chain ID: ${chain.id}`);
//       },
//     }),
//   ]
// );
// const { chains, publicClient } = configureChains(
//   [mainnet, polygon],
//   [
//     jsonRpcProvider({
//       rpc: (chain) => ({
//         http: "http://localhost:8545",
//       }),
//     }),
//   ]
// );

const { connectors } = getDefaultWallets({
  appName: "My RainbowKit App",
  projectId: "c403e2d5b2b3a5fdf6aa040a81a24505",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export { WagmiConfig, RainbowKitProvider, wagmiConfig, chains };
