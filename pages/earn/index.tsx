import { SignMessage } from '@/components/signMessage'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSignMessage,
} from 'wagmi'
import { useRouter } from 'next/router';

export default function EarnPage() {
  const { address, connector, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()

  if (isConnected && connector) {
    return (
      <div>
        <div>{address}</div>
        <div>Connected to {connector.name}</div>
        <SignMessage />
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          Connect Metamask Wallet
        </button>
      ))}

      {error && <div>{error.message}</div>}
    </div>
  )
}
