import { SignMessage } from '@/components/signMessage'
import {
  useAccount,
  useConnect,
  useContractRead,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSignMessage,
} from 'wagmi'
import { useRouter } from 'next/router';
import ConnectWallet from '@/components/connectWallet';
import { contractAddr } from '@/commons/contractAddress';
import UniqueIdentity from "@/abi/UniqueIdentity.json"
import { constants } from '@/commons/constants';
import { useEffect, useState } from 'react';
import Header from '@/components/header';

export default function EarnPage() {
  const router = useRouter()

  const [uidStatus, setUidStatus] = useState(false)

  const { address } = useAccount()
  const {data} = useContractRead({
    address: contractAddr.sepolia.uniqueIdentity as any,
    abi: UniqueIdentity,
    functionName: 'balanceOf',
    args: [address, constants.UID_ID]
  })
  
  useEffect(() => {
    setUidStatus(data == 0 ? false : true)
  
  }, [data])
  

  return (
    <div>
      <Header />
      {!uidStatus && (
        <div>
          <div>Set up your UID to start</div>
          <div>Unique Identity (UID) is a non-transferrable NFT representing KYC-verification on-chain. A UID is required to participate in the Doberman lending protocol. No personal information is stored on-chain.</div>
          <button onClick={()=>router.push('/account')}>Go to my account</button>
        </div>
      )}
    </div>
  )
}
