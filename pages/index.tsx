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

export default function LandingPage() {
  // const { address, connector, isConnected } = useAccount()
  // const { connect, connectors, error, isLoading, pendingConnector } =
  //   useConnect()

  // if (isConnected && connector) {
  //   return (
  //     <div>
  //       <div>{address}</div>
  //       <div>Connected to {connector.name}</div>
  //       <SignMessage />
  //     </div>
  //   )
  // }

  // return (
  //   <div>
  //     {connectors.map((connector) => (
  //       <button
  //         key={connector.id}
  //         onClick={() => connect({ connector })}
  //       >
  //         {connector.name}
  //       </button>
  //     ))}

  //     {error && <div>{error.message}</div>}
  //   </div>
  // )
  const router = useRouter();

  return (
    <div>
      <button onClick={() => router.push('/earn')}>Open App</button>
    </div>
  )
}
