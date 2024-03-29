import { WagmiConfig, createConfig, configureChains, mainnet, sepolia } from 'wagmi'

import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { polygonMumbai } from 'viem/chains'

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia, polygonMumbai],
  // [alchemyProvider({ apiKey: 'CWqhHk2pxO8SxEqYe7m_hQaQB9Bx-rFv' }), publicProvider(), alchemyProvider({apiKey: '74V0171KCA0RskRmn-PzGyrENBMVWPJW'})],
  [alchemyProvider({ apiKey: '74V0171KCA0RskRmn-PzGyrENBMVWPJW' }), publicProvider(), alchemyProvider({ apiKey: '74V0171KCA0RskRmn-PzGyrENBMVWPJW' })],
)

// Set up wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
  ],
  publicClient,
  webSocketPublicClient,
})
