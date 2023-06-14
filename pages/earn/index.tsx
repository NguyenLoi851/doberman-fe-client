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
import Router, { useRouter } from 'next/router';
import ConnectWallet from '@/components/connectWallet';
import { contractAddr } from '@/commons/contractAddress';
import UniqueIdentity from "@/abi/UniqueIdentity.json"
import { constants } from '@/commons/constants';
import { ReactNode, useEffect, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import PageLayout from '@/components/layouts/PageLayout';
import axios from 'axios';
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { List } from 'antd';

interface Props {
  children: ReactNode;
}

export default function EarnPage() {
  const router = useRouter()
  const [uidStatus, setUidStatus] = useState(false)
  const [openLoans, setOpenLoans] = useState([])
  const [closeLoans, setCloseLoans] = useState([])

  const tokenLoansQuery = `
    query EarnPage {
      openPools: tranchedPools(
      orderBy: termEndTime
      orderDirection: desc
      where: {termStartTime: 0}
    ) {
      id
      usdcApy
      termInSeconds
      txHash
      address
    }
      
      closedPools: tranchedPools(
      orderBy: createdAt
      orderDirection: desc
      where: { termStartTime_not: 0 }
    ) {
      id
      principalAmount
      termEndTime
      txHash
      address
    }
  }`

  const client = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
    cache: new InMemoryCache(),
  })

  const getLoans = async () => {
    const res = await client.query({
      query: gql(tokenLoansQuery),
    })

    // setOpenLoans(res.data.openPools)
    // setCloseLoans(res.data.closePools)

    if (res.data.openPools.length > 0) {
      const addMetadata = res.data.openPools.map(async (item: any) => {
        const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/getLoanByFilter', {
          params: {
            txHash: item.txHash
          }
        })

        return {
          ...item,
          ...res2.data
        }
      })

      Promise.all(addMetadata).then((result) => {
        setOpenLoans(result as any)
      })
    }

    if (res.data.closedPools.length > 0) {
      const addMetadata = res.data.closedPools.map(async (item: any) => {
        const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/getLoanByFilter', {
          params: {
            txHash: item.txHash
          }
        })

        return {
          ...item,
          ...res2.data
        }
      })

      Promise.all(addMetadata).then((result2) => {
        setCloseLoans(result2 as any)
      })
    }
  }

  const { address } = useAccount()
  const { data } = useContractRead({
    address: contractAddr.mumbai.uniqueIdentity as any,
    abi: UniqueIdentity,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000001', constants.UID_ID],
    chainId: constants.MUMBAI_ID,
    onError(error) {
      console.log("line38", error)
    }
  })

  useEffect(() => {
    setUidStatus(data == 0 ? false : true)
    getLoans()
  }, [data])

  const handleDetailLoanInfo = async (item: any) => {
    Router.push({
      pathname: `/earn/${item.address}`,
      query: {
        ...item
      }
    })
  }

  return (
    <div>
      <div style={{ height: 'calc(100vh - 64px - 30px)' }}>

        {!uidStatus && (
          <div>
            <div>Set up your UID to start</div>
            <div>Unique Identity (UID) is a non-transferrable NFT representing KYC-verification on-chain. A UID is required to participate in the Doberman lending protocol. No personal information is stored on-chain.</div>
            <button onClick={() => router.push('/account')}>Go to my account</button>
          </div>
        )}

        <div>Open deals</div>
        <List
          itemLayout="horizontal"
          dataSource={openLoans}
          renderItem={(item, index) => (
            <List.Item
              actions={[<button onClick={() => handleDetailLoanInfo(item)}>View Detail</button>]}
              style={{ cursor: 'pointer', margin: '24px' }}>
              <List.Item.Meta
                avatar={index + 1 + '.'}
                title={(item as any).companyName}
                description={(item as any).projectName}
              />
            </List.Item>
          )}
        />
        <div>Close deals</div>

      </div>
    </div>
  )
}

EarnPage.Layout = (props: Props) => PageLayout({ children: props.children });