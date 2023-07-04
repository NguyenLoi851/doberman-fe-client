"use client";

import { contractAddr } from "@/commons/contractAddress";
import { buildPermitSignature, Domain } from "@/commons/functions";
import PageLayout from "@/components/layouts/PageLayout";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import BigNumber from "bignumber.js";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { useAccount, useNetwork, useWalletClient } from "wagmi";
import { readContract, writeContract, waitForTransaction } from "@wagmi/core"
import USDC from "../../abi/USDC.json"
import SeniorPool from "../../abi/SeniorPool.json"
import { constants } from "@/commons/constants";
import { Anchor, Button, Col, InputNumber, Row, Slider, Statistic, Table, Tooltip } from "antd";
import { toast } from "react-toastify";
import { MonitorOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Fidu from "../../abi/Fidu.json";
import { ColumnsType } from "antd/es/table";
import { shortenAddress } from "@/components/shortenAddress";
interface Props {
    children: ReactNode;
}

export default function SeniorLoanDetailPage() {
    const router = useRouter()
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);
    const [seniorLoanDetailInfo, setSeniorLoanDetailInfo] = useState({})
    const [wantInvestAmount, setWantInvestAmount] = useState(0)
    const [assets, setAssets] = useState(0)
    const { data: walletClient } = useWalletClient()
    const [totalShares, setTotalShares] = useState(0)
    const [myShares, setMyShares] = useState(0)
    const [loadingDeposit, setLoadingDeposit] = useState(false)
    const [seniorUSDCBalance, setSeniorUSDCBalance] = useState(0)
    const [wantWithdrawAmount, setWantWithdrawAmount] = useState(0)
    const [loadingWithdraw, setLoadingWithdraw] = useState(false)
    const [sharePrice, setSharePrice] = useState(BigNumber(constants.ONE_BILLION).multipliedBy(BigNumber(constants.ONE_BILLION)))
    const [historyTx, setHistoryTx] = useState([])
    const [totalInvested, setTotalInvested] = useState(0)
    const [porfolioLoans, setPorfolioLoans] = useState([])

    const tokenDetailSeniorLoanQuery = `
    query SeniorLoanDetail {
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
          tranchedPools {
            actualSeniorPoolInvestment
            juniorDeposited
          }
        }
        transactions(
            orderBy: timestamp
            orderDirection: desc
            where: {category_in: [SENIOR_POOL_DEPOSIT, SENIOR_POOL_WITHDRAWAL, SENIOR_POOL_REDEMPTION]}
        ) {
            sentAmount
            timestamp
            receivedNftId
            receivedAmount
            sentToken
            receivedToken
            sentNftType
            sentNftId
            receivedNftType
            transactionHash
            category
            fiduPrice
            user {
                id
            }
            id
        }
    }`

    const ActionPresentation = {
        TRANCHED_POOL_REPAYMENT: "Borrower repay",
        SENIOR_POOL_REDEMPTION: "Senior redeem",
        TRANCHED_POOL_DRAWDOWN: "Borrower drawdown",
        SENIOR_POOL_WITHDRAWAL: "Investor withdraw",
        SENIOR_POOL_DEPOSIT: "Investor deposit",
        BID: "User bids",
    }

    interface DataType {
        key: React.Key;
        user: string;
        action: string;
        sentAmount: string;
        receivedAmount: string;
        timestamp: string;
        tx: ReactNode;
    }

    const columns: ColumnsType<DataType> = [
        {
            title: 'User',
            dataIndex: 'user',
            width: 150,
        },
        {
            title: 'Action',
            dataIndex: 'action',
            width: 200,
        },
        {
            title: 'Sent Amount',
            dataIndex: 'sentAmount',
            width: 250,
        },
        {
            title: 'Received Amount',
            dataIndex: 'receivedAmount',
            width: 250,
        },
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            width: 200,
        },
        {
            title: 'Tx',
            dataIndex: 'tx',
            width: 150,
        },
    ];

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getSeniorLoanDetailInfo = async () => {
        try {
            const res = await client.query({
                query: gql(tokenDetailSeniorLoanQuery)
            })
            setSeniorLoanDetailInfo(res.data.seniorPool)
            setAssets(Number(res.data.seniorPool.assets) / constants.ONE_MILLION)
            setTotalShares(Number(BigNumber(res.data.seniorPool.totalShares).div(constants.ONE_BILLION).div(constants.ONE_BILLION)))
            setTotalInvested(Number(BigNumber(res.data.seniorPool.totalInvested).div(constants.ONE_MILLION)))
            setPorfolioLoans(res.data.seniorPool.tranchedPools)

            const txData: DataType[] = []
            res.data.transactions.map((item: any) => {
                let sentAmount = ''
                if (item.sentAmount == null) {
                    sentAmount = '0'
                } else if (item.sentToken == 'USDC') {
                    sentAmount = Number(BigNumber(item.sentAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()
                } else {
                    sentAmount = Number(BigNumber(item.sentAmount).div(BigNumber(constants.ONE_BILLION)).div(BigNumber(constants.ONE_BILLION))).toLocaleString()
                }

                let receivedAmount = ''
                if (item.receivedAmount == null) {
                    receivedAmount = '0'
                } else if (item.receivedToken == 'USDC') {
                    receivedAmount = Number(BigNumber(item.receivedAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()
                } else {
                    receivedAmount = Number(BigNumber(item.receivedAmount).div(BigNumber(constants.ONE_BILLION)).div(BigNumber(constants.ONE_BILLION))).toLocaleString()
                }

                txData.push({
                    key: item.id,
                    user: shortenAddress(item.user.id),
                    action: (ActionPresentation as any)[item.category as any],
                    // action: item.category,
                    sentAmount: sentAmount + ' ' + (item.sentToken ?? ''),
                    receivedAmount: receivedAmount + ' ' + (item.receivedToken ?? ''),
                    timestamp: dayjs(Number(item.timestamp) * 1000).format('DD/MM/YYYY HH:mm:ss'),
                    tx: <div><MonitorOutlined style={{ padding: '5px' }} /><a href={`https://mumbai.polygonscan.com/tx/${item.transactionHash}`} target='_blank' className="underline underline-offset-2">Tx</a></div>,
                })
            })
            setHistoryTx(txData as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getSeniorBalance = async () => {
        try {
            const balance = await readContract({
                address: contractAddr.mumbai.usdc as any,
                abi: USDC,
                functionName: 'balanceOf',
                args: [contractAddr.mumbai.seniorPool as any],
                chainId,
            });
            setSeniorUSDCBalance(Number(BigNumber(balance as any).div(BigNumber(constants.ONE_MILLION))))
        } catch (error) {
            console.log(error)
        }
    }

    const getSharePrice = async () => {
        try {
            const res = await readContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'sharePrice',
                args: [],
                chainId
            })
            setSharePrice(BigNumber(res as any).div(BigNumber(constants.ONE_BILLION)).div(BigNumber(constants.ONE_BILLION)))
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getSeniorLoanDetailInfo()
        setChainId(chain?.id || 80001)
        getUserShares()
        getSeniorBalance()
        getSharePrice()
    }, [chain, address, myShares])

    const domain: Domain = {
        version: '2',
        name: `\'USD Coin\'`,
        chainId: chainId,
        verifyingContract: contractAddr.mumbai.usdc as any
    }
    const signatureDeadline = Math.floor(Date.now() / 1000 + 90000);

    const handleDeposit = async () => {
        if (wantInvestAmount == 0) {
            toast.error("Deposit amount must greater than 0")
            return;
        }
        setLoadingDeposit(true)
        try {
            const nonces = await readContract({
                address: contractAddr.mumbai.usdc as any,
                abi: USDC,
                functionName: 'nonces',
                args: [address],
                chainId,
            });

            const splitedSignature = await buildPermitSignature(
                walletClient as any,
                { ...domain },
                contractAddr.mumbai.seniorPool as any,
                BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
                signatureDeadline,
                nonces as any
            )

            const { hash } = await writeContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'depositWithPermit',
                args: [Number(BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION))), signatureDeadline, splitedSignature.v, splitedSignature.r, splitedSignature.s],
            })

            setWantInvestAmount(0)

            const { status } = await waitForTransaction({
                hash: hash,
                // confirmations: 6,
            })

            if (status == 'success') {
                toast.success("Invest successfully")
                await getUserShares()
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
        } catch (error) {
            console.log(error)
            try {
                if ((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1].trim() == 'ERC20') {
                    toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[2])
                } else {
                    toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1])
                }
            } catch (error2) {
                console.log(JSON.stringify(error2))
            }
        }
        setLoadingDeposit(false)
    }

    const handleWithdraw = async () => {
        if (wantWithdrawAmount == 0) {
            toast.error("Withdraw amount must greater than 0")
            return;
        }
        setLoadingWithdraw(true);
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'withdrawInFidu',
                args: [Number(BigNumber(wantWithdrawAmount).times(BigNumber(constants.ONE_BILLION)).times(BigNumber(constants.ONE_BILLION)))],
                chainId
            })
            setWantWithdrawAmount(0)

            const { status } = await waitForTransaction({
                hash: hash,
                // confirmations: 6,
            })

            if (status == 'success') {
                toast.success("Withdraw successfully")
                await getUserShares()
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
        } catch (error) {
            console.log(error)
            try {
                if ((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1].trim() == 'ERC20') {
                    toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[2])
                } else {
                    toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1])
                }
            } catch (error2) {
                console.log(JSON.stringify(error2))
            }
        }
        setLoadingWithdraw(false);
    }

    const getUserShares = async () => {
        try {
            const shareAmountWD = await readContract({
                address: contractAddr.mumbai.fidu as any,
                abi: Fidu,
                functionName: 'balanceOf',
                args: [address as any]
            })
            setMyShares(Number(BigNumber(shareAmountWD as any).div(BigNumber(constants.ONE_BILLION)).div(BigNumber(constants.ONE_BILLION))))
        } catch (error) {
            console.log(error)
        }
    }

    const handleWantInvestAmount = (value: any) => {
        setWantInvestAmount(value)
    }

    const handleWantWithdrawAmount = (value: any) => {
        setWantWithdrawAmount(value)
    }

    return (
        <Row>
            <Col span={1}>
            </Col>
            <Col span={4}>
                <Anchor
                    bounds={100}
                    items={[
                        {
                            key: 'invest',
                            href: '#invest',
                            title: 'Invest'
                        },
                        {
                            key: 'portfolio-details',
                            href: '#portfolio-details',
                            title: 'Portfolio details',
                        },
                        {
                            key: 'repayment',
                            href: '#repayment',
                            title: 'Repayment'
                        }
                    ]}
                />
            </Col>
            <Col span={2}>
            </Col>
            <Col span={12}>
                <div id="invest" style={{ height: 'auto', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} className='bg-amber-250' >
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <div style={{ margin: '10px', fontSize: '16px' }}>Doberman Protocol</div>
                        <a style={{ margin: '10px' }} href={`https://mumbai.polygonscan.com/address/${contractAddr.mumbai.seniorPool}#code`} target="_blank" className="text-sky-500 hover:underline hover:underline-offset-3 "><MonitorOutlined style={{ marginRight: '5px', fontSize: '20px' }} />MumbaiScan </a>
                    </div>
                    <div style={{ margin: '10px', fontSize: '24px', fontWeight: 'bold' }}>Doberman Senior Pool</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>The Senior Pool is a pool of capital that is diversified across all Borrower Pools on the Doberman protocol. Liquidity Providers (LPs) who provide capital into the Senior Pool are capital providers in search of passive, diversified exposure across all Borrower Pools. This capital is protected by junior (first-loss) capital in each Borrower Pool.</div>
                    <div className="flex justify-between" style={{ margin: '30px', fontSize: '16px', marginTop: '50px' }}>
                        <div>
                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Total Assets (USDC)" value={assets} precision={2} />
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Remaining Assets (USDC)" value={seniorUSDCBalance} precision={2} />
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Remaining Assets Percentage" suffix="%" value={seniorUSDCBalance / assets * 100} precision={2} />
                            </div>
                        </div>
                        <div>
                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Total Shares Amount" value={totalShares} precision={2} />
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Your Shares Amount" value={myShares} precision={2} />
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <Statistic title="Your Shares Percentage" suffix="%" value={myShares / totalShares * 100} precision={2} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <InputNumber
                                    placeholder="Input value"
                                    value={wantInvestAmount}
                                    onChange={handleWantInvestAmount}
                                    style={{ width: 300, marginTop: '10px' }}
                                    addonAfter='USDC ($)'
                                    precision={2}
                                    min={0}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Button loading={loadingDeposit} onClick={handleDeposit} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }}
                                    // className="btn-sm bg-sky-600 text-white hover:text-black hover:bg-sky-400 border border-2 border-slate-600 rounded-md"
                                    className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg"
                                >Deposit</Button>
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <InputNumber
                                    placeholder="Input value"
                                    value={wantWithdrawAmount}
                                    onChange={handleWantWithdrawAmount}
                                    style={{ width: 300, marginTop: '10px' }}
                                    addonAfter='Shares'
                                    precision={2}
                                    min={0}
                                />
                            </div>
                            {wantWithdrawAmount > 0 && (
                                wantWithdrawAmount * Number(sharePrice) <= seniorUSDCBalance ?
                                    <div>
                                        <div className="mt-2" style={{ display: 'flex', justifyContent: 'center' }}>
                                            appropriate: {Number(wantWithdrawAmount * Number(sharePrice) * (100 - 0.5) / 100).toLocaleString()} USDC
                                            <Tooltip
                                                placement="right"
                                                title=
                                                <div>
                                                    <div className="mt-2" style={{ display: 'flex', justifyContent: 'center', fontSize: '10px' }}> fee: {Number(wantWithdrawAmount * Number(sharePrice) * (0.5) / 100).toLocaleString()} USDC</div>
                                                </div>
                                            >
                                                <InfoCircleOutlined style={{ marginLeft: '5px' }} />
                                            </Tooltip>
                                        </div>
                                    </div> :
                                    <div className="text-red-500 mt-2">You withdraw more than available amount</div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Button loading={loadingWithdraw} onClick={handleWithdraw} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }}
                                    // className="btn-sm bg-sky-600 text-white hover:text-black hover:bg-sky-400 border border-2 border-slate-600 rounded-md"
                                    className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg"
                                >Withdraw</Button>
                            </div>
                        </div>
                    </div>


                </div>

                <div id="portfolio-details" style={{ height: 'auto', marginBottom: '50px', padding: '10px' }} className="rounded-lg bg-amber-200">
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Porfolio details</div>
                    <div style={{ margin: '10px', fontSize: '18px' }}>Goldfinch Senior Pool</div>
                    <div style={{ margin: '10px', fontSize: '16px', textAlign: 'justify' }}>The Goldfinch Senior Pool is automatically managed by The Goldfinch protocol. Capital is automatically allocated from the Senior Pool into the senior tranches of various direct-lending deals on Goldfinch according to the Leverage Model. This capital is protected by first-loss capital in all deals.</div>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <div style={{ margin: '10px', padding: '8px' }} className="rounded-full bg-white hover:bg-slate-300">
                            <a href='https://discord.gg/7FHgxdyW' target='_blank' className="text-black hover:text-black hover:underline">Website</a>
                        </div>
                        <div style={{ margin: '10px', padding: '8px' }} className="rounded-full bg-white hover:bg-slate-300">
                            <a href='https://www.linkedin.com/in/loing851/' target='_blank' className="text-black hover:text-black hover:underline">LinkedIn</a>
                        </div>
                        <div style={{ margin: '10px', padding: '8px' }} className="rounded-full bg-white hover:bg-slate-300">
                            <a href='https://twitter.com/' target='_blank' className="text-black hover:text-black hover:underline">Twitter</a>
                        </div>
                    </div>

                    <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
                        <Statistic title="Total Shares Amount" prefix="$" value={totalInvested} precision={2} />
                        <Statistic title="No. of porfolio loans" value={porfolioLoans.length} />
                        <Statistic title="Total Shares Amount" prefix="$" value={assets} precision={2} />
                    </div>
                </div>

                <div id="repayment" style={{ height: 'auto', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} className="bg-white">
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Recent activity</div>
                    <Table
                        columns={columns}
                        dataSource={historyTx}
                        pagination={{ pageSize: 10 }}
                        scroll={{ y: 500 }}
                    // showHeader={false}
                    />
                </div>
            </Col>
            <Col span={5}>
            </Col>
        </Row>
    )
}

SeniorLoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });
