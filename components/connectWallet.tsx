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
import { useEffect, useState } from 'react';

export default function ConnectWallet() {
  const { address, connector, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  const [chainId, setChainId] = useState(0)

  useEffect(() => {
    setChainId(chain?.id || 0)

  }, [chain])

  return (
    <div>
      {isConnected && connector ? (
        chainId == constants.MUMBAI_ID ? (
          <div>
            {shortenAddress(address as any)}
          </div>
        ) : (
          <div>
            <button onClick={() => switchNetwork?.(constants.MUMBAI_ID)}>Wrong network</button>
          </div>
        )
      ) : (
        connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
          >
            Connect Metamask Wallet
          </button>
        ))
      )
      }

      {error && <div>{error.message}</div>}
    </div>
  )
}
