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
import { ReactNode, useEffect, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import PageLayout from '@/components/layouts/PageLayout';

interface Props {
  children: ReactNode;
}

export default function EarnPage(){
  const router = useRouter()

  const [uidStatus, setUidStatus] = useState(false)

  const { address } = useAccount()
  const { data } = useContractRead({
    address: contractAddr.mumbai.uniqueIdentity as any,
    abi: UniqueIdentity,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000001', constants.UID_ID],
    chainId: constants.MUMBAI_ID,
    onError(error) {
      console.log("line33", error)
    }
  })

  useEffect(() => {
    setUidStatus(data == 0 ? false : true)

  }, [data])


  return (
    <div>
      {/* <Header /> */}
      <div style={{height: 'calc(100vh - 64px - 30px)'}}>

        {!uidStatus && (
          <div>
            <div>Set up your UID to start</div>
            <div>Unique Identity (UID) is a non-transferrable NFT representing KYC-verification on-chain. A UID is required to participate in the Doberman lending protocol. No personal information is stored on-chain.</div>
            <button onClick={() => router.push('/account')}>Go to my account</button>
          </div>
        )}
      </div>
      {/* <Footer /> */}
    </div>
  )
}

EarnPage.Layout = (props: Props) => PageLayout({children: props.children});