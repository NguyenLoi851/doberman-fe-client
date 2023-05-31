import { SignMessage } from '@/components/signMessage'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useNetwork,
  useSignMessage,
  useSwitchNetwork,
} from 'wagmi'
import { useRouter } from 'next/router';
import { shortenAddress } from './shortenAddress';
import { constants } from '@/commons/constants';

export default function ConnectWallet() {
  const { address, connector, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()

  if (isConnected && connector) {

    if (chain?.id == constants.MUMBAI_ID) {
      return (
        <div>
          {shortenAddress(address as any)}
        </div>
      )
    }else{
      return (
        <div>
          <button onClick={() => switchNetwork?.(constants.MUMBAI_ID)}>Wrong network</button>
        </div>
      )
    }
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
