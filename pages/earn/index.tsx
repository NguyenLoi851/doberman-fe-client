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
import { Card, Col, List, Row, Statistic } from 'antd';
import Link from 'next/link';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';

interface Props {
  children: ReactNode;
}

export default function EarnPage() {
  const router = useRouter()
  const [uidStatus, setUidStatus] = useState(false)
  const [openLoans, setOpenLoans] = useState([])
  const [closeLoans, setCloseLoans] = useState([])
  const [protocol, setProtocol] = useState({})
  const [seniorPool, setSeniorPool] = useState({})

  const tokenLoansQuery = `
    query EarnPage {
      openPools: tranchedPools(
      orderBy: fundableAt
      orderDirection: asc
      where: {termStartTime: 0}
    ) {
      id
      usdcApy
      termInSeconds
      txHash
      address
      juniorDeposited
      interestRate
      fundableAt
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
      estimatedTotalAssets
      termEndTime
      termStartTime
    }
    protocols {
      numLoans
      totalPrincipalCollected
      totalInterestCollected
      totalReserveCollected
      totalWritedowns
      totalDrawdowns
      defaultRate
      id
    }
    seniorPool(id: "1") {
      address
      assets
      defaultRate
      estimatedApy
      estimatedApyFromGfiRaw
      estimatedTotalInterest
      id
      sharePrice
      totalInvested
      totalLoansOutstanding
      totalShares
      totalWrittenDown
    }
  }`

  const client = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
    cache: new InMemoryCache(),
  })

  const getLoans = async () => {
    try {
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
          };
        })

        Promise.all(addMetadata).then((result) => {
          result = result.filter(item => item.companyName)
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
          result2 = result2.filter(item => item.companyName)
          setCloseLoans(result2 as any)
        })
      }

      if (res.data.protocols.length > 0) {
        setProtocol(res.data.protocols[0])
      }
      setSeniorPool(res.data.seniorPool)
    } catch (error) {
      console.log(error)
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

  const handleDetailSeniorLoanInfo = async () => {
    Router.push({
      pathname: '/earn/senior'
    })
  }

  return (
    <div style={{ height: 'calc(100% - 64px - 30px)' }}>

      <Row >
        <Col span={5}>
        </Col>
        <Col span={14}>
          {!uidStatus && (
            <div style={{ display: 'flex', flexDirection: 'row', margin: '20px' }} className='rounded-lg text-white bg-sky-700'>
              <div style={{ margin: '10px', width: '75%' }}>
                <div style={{ marginBottom: '15px', fontSize: '20px' }}>Set up your UID to start</div>
                <div style={{ display: 'flex', textAlign: 'justify' }}>Unique Identity (UID) is a non-transferrable NFT representing KYC-verification on-chain. A UID is required to participate in the Doberman lending protocol. No personal information is stored on-chain.</div>
              </div>
              <div style={{ marginTop: '60px' }}>
                <Link href='/account' >
                  <div style={{}} className="rounded-md btn-sm text-black bg-sky-50 hover:bg-gray-200 hover:text-black ml-3">
                    Go to my account
                  </div>
                </Link>
              </div>
            </div>
          )}

          <div className="flex justify-between border-2 border-amber-400 rounded-lg" style={{ margin: '10px', fontSize: '16px', marginTop: '50px', padding: '20px' }} >
            <Statistic title='Total Drawdown' prefix='$ ' value={(protocol as any).totalDrawdowns / constants.ONE_MILLION} precision={2}></Statistic>
            <Statistic title='Total Loans' value={(protocol as any).numLoans} precision={0}></Statistic>
            <Statistic title='Total Loans Repaid' prefix='$' value={(protocol as any).totalInterestCollected} precision={2}></Statistic>
          </div>

          <div className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>Open deals</div>

          <Card
            title={
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '24px' }}>Senior Pool</div>
                <div style={{ fontWeight: 'normal', fontSize: '12px' }}>Automated diversified portfolio</div>
              </div>
            }
            style={{ cursor: 'pointer', width: '35vh' }}
            className='bg-amber-200 hover:bg-amber-300 border-2 border-amber-300'
            onClick={() => handleDetailSeniorLoanInfo()}
          >
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <div>
                Invested Amount:
              </div>
              <div style={{ fontWeight: 'bold' }}>
                $ {Number(BigNumber((seniorPool as any).assets).div(BigNumber(constants.ONE_MILLION))).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <div>
                Loan term:
              </div>
              <div style={{ fontWeight: 'bold' }}>
                Open-ended
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <div>
                Interest:
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {(seniorPool as any).estimatedApy} %
              </div>
            </div>
          </Card>

          <List
            itemLayout="horizontal"
            grid={{ gutter: 16, column: 3 }}
            dataSource={openLoans}
            renderItem={(item, index) => (
              <List.Item
                style={{ cursor: 'pointer', marginTop: '12px', marginBottom: '12px' }}
                className='bg-amber-200 rounded-lg'>
                <Card
                  title={
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '24px' }}>{(item as any).companyName}</div>
                      <div style={{ fontWeight: 'normal', fontSize: '12px' }}>{(item as any).projectName}</div>
                    </div>
                  }
                  style={{ borderRadius: '5%' }}
                  className='bg-amber-200 hover:bg-amber-300 border-2 border-amber-300'
                  onClick={() => handleDetailLoanInfo(item)}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div>
                      Invested Amount:
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      $ {Number(BigNumber((item as any).juniorDeposited).div(BigNumber(constants.ONE_MILLION))).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div>
                      Fundable At:
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {dayjs(Number((item as any).fundableAt) * 1000).format('DD/MM/YYYY')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div>
                      Interest:
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {Number((item as any).interestRate)} %
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />

          <div className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>Closed deals</div>
          <List
            itemLayout="horizontal"
            dataSource={closeLoans}
            renderItem={(item, index) => (
              <List.Item
                actions={[<div className='btn-sm bg-sky-300 text-black rounded-md hover:font-bold' onClick={() => handleDetailLoanInfo(item)}>View Detail</div>]}
                style={{ cursor: 'pointer', marginTop: '12px', marginBottom: '12px' }}
                className='bg-white rounded-lg '>
                <List.Item.Meta
                  avatar={index + 1 + '.'}
                  title={(item as any).companyName}
                  description={(item as any).projectName}
                />
                <div style={{ marginRight: '80px' }}>
                  <div>Loan term</div>
                  <div style={{ fontWeight: 'bold' }}>{(Number((item as any).termEndTime) - Number((item as any).termStartTime)) / 60 / 60 / 24} months</div>
                </div>
                <div>
                  <div>Invested amount</div>
                  <div style={{ fontWeight: 'bold' }}>$ {Number(BigNumber((item as any).estimatedTotalAssets).div(BigNumber(constants.ONE_MILLION))).toLocaleString()}</div>
                </div>
              </List.Item>
            )}
          />
        </Col>
        <Col span={5}>
        </Col>
      </Row>

    </div >
  )
}

EarnPage.Layout = (props: Props) => PageLayout({ children: props.children });
