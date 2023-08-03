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
import { switchNetwork as switchNetworkCore, readContract, connect as connectCore, disconnect } from '@wagmi/core'
import { Button, Modal, Tooltip } from 'antd';
import USDC from "../abi/USDC.json"
import Fidu from "../abi/Fidu.json";
import { contractAddr } from '@/commons/contractAddress';
import BigNumber from 'bignumber.js';

export default function ConnectWallet() {
  const { address, connector, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  const [chainId, setChainId] = useState(constants.MUMBAI_ID)
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [fiduBalance, setFiduBalance] = useState(0)
  const [showInstallMetamaskModal, setShowInstallMetamaskModal] = useState(false)
  const [connectorsClient, setConnectorsClient] = useState<any>([])
  const [addressClient, setAddressClient] = useState('0x')

  const handleOk = async () => {
    setShowInstallMetamaskModal(false);
  };

  const handleCancel = () => {
    setShowInstallMetamaskModal(false);
  };

  const handleSwitchNetworkCore = async () => {
    try {
      await switchNetworkCore({ chainId: constants.MUMBAI_ID })
    } catch (error) {
      console.log(error)
    }
  }

  const getBalances = async () => {
    try {
      const balance = await readContract({
        address: contractAddr.mumbai.usdc as any,
        abi: USDC,
        functionName: 'balanceOf',
        args: [address],
      })
      setUsdcBalance(Number(BigNumber(balance as any).div(BigNumber(constants.ONE_MILLION))))
    } catch (error) {
      console.log(error)
    }

    try {
      const balance = await readContract({
        address: contractAddr.mumbai.fidu as any,
        abi: Fidu,
        functionName: 'balanceOf',
        args: [address],
      })
      setFiduBalance(Number(BigNumber(balance as any).div(BigNumber(constants.ONE_BILLION)).div(BigNumber(constants.ONE_BILLION))))
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    try {
      setChainId(chain?.id || constants.MUMBAI_ID)
      if (chain?.id != constants.MUMBAI_ID && connector && isConnected) {
        handleSwitchNetworkCore()
      }
      if (connectors) {
        setConnectorsClient(connectors)
      }
      // if (!connector) {
      //   return;
      // }
      if (address) {
        getBalances();
        setAddressClient(address)
      }

    } catch (error) {
      console.log(error)
    }

  }, [chain, address, connectors])

  const handleConnectWallet = (connector: any) => {
    try {
      if (connector.ready == true) {
        connectCore({ connector })
      } else {
        setShowInstallMetamaskModal(true)
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div>
      {isConnected && connector ? (
        chainId == constants.MUMBAI_ID ? (
          <Tooltip
            color='yellow'
            placement='bottom'
            title=
            <div className='bg-white text-black' style={{ padding: '0px' }}>
              <div style={{ paddingTop: '15px', display: 'flex', justifyContent: 'center' }}>
                Your Balances
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ margin: '10px' }}>
                  {usdcBalance.toLocaleString()}
                </div>
                <div style={{ margin: '10px' }}>
                  <a href='https://mumbai.polygonscan.com/address/0x901ff11b2e65A8805d175533A5f062EB2f9bD43F' target='_blank'>USDC</a>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ margin: '10px' }}>
                  {fiduBalance.toLocaleString()}
                </div>
                <div style={{ margin: '10px' }}>
                  <a href='https://mumbai.polygonscan.com/address/0x67bc0abf395Be2D92b432c8dBd3C153C6BbB8701' target='_blank'>FIDU</a>
                </div>
              </div>
              <div className='flex justify-center' onClick={() => disconnect()}>
                <Button style={{ margin: '10px' }}>Disconnect</Button>
              </div>
            </div>
          >
            <div style={{ fontWeight: 'bold' }} className="rounded-lg">
              {shortenAddress(addressClient as any)}
            </div>
          </Tooltip>
        ) : (
          <div>
            <div style={{ fontWeight: 'bold' }} onClick={() => switchNetwork?.(constants.MUMBAI_ID)}>Wrong network</div>
          </div>
        )
      ) : (
        <div>
          {connectorsClient.length && connectorsClient.map((connector: any) => (
            <div
              key={connector.id}
              // onClick={() => connect({ connector })}
              onClick={() => handleConnectWallet(connector)}
              className="font-bold font-mono cursor-pointer"
            >
              Connect Metamask Wallet
            </div>
          ))}
        </div>
      )}

      {error && <div>{error.message}</div>}

      <Modal title="Install Metamask Extension and add Mumbai network to wallet" open={showInstallMetamaskModal} onOk={handleOk} onCancel={handleCancel} okText=<div className='text-black'>OK</div>
      >
        <div>
          You need to do those steps:
          <ol>
            <li>Install metamask for your browser via:
              <a href='https://metamask.io/download/' target='_blank' className='text-sky-500 hover:underline hover:underline-offset-2'> here</a>
            </li>
            <li>Add Mumbai network via:
              <a href='https://chainlist.org/?testnets=true&search=mumbai' target='_blank' className='text-sky-500 hover:underline hover:underline-offset-2'> here</a>
            </li>
          </ol>
        </div>

      </Modal>
    </div>
  )
}
