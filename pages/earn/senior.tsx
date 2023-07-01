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
import { Anchor, Button, Col, InputNumber, Row, Slider, Statistic } from "antd";
import { toast } from "react-toastify";
import { MonitorOutlined } from '@ant-design/icons';
import Fidu from "../../abi/Fidu.json";
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
        }
      }`

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
                args: [BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION)), signatureDeadline, splitedSignature.v, splitedSignature.r, splitedSignature.s],
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
            toast.error("Deposit amount must greater than 0")
            return;
        }
        setLoadingWithdraw(true);
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'withdrawInFidu',
                args: [BigNumber(wantWithdrawAmount).multipliedBy(BigNumber(constants.ONE_BILLION)).multipliedBy(BigNumber(constants.ONE_BILLION))],
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
        <Row style={{ backgroundColor: 'rgb(253, 245, 227)' }}>
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
                <div id="invest" style={{ height: 'auto', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} className='bg-amber-300' >
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
                                    <div className="mt-2" style={{ display: 'flex', justifyContent: 'center' }}> appropriate: {wantWithdrawAmount * Number(sharePrice)} USDC</div> :
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

                <div id="portfolio-details" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', padding: '10px' }} className="rounded-lg">
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Porfolio details</div>
                    <div style={{ margin: '10px', fontSize: '18px' }}>Goldfinch Senior Pool</div>
                    <div style={{ margin: '10px', fontSize: '16px', textAlign: 'justify' }}>The Goldfinch Senior Pool is automatically managed by The Goldfinch protocol. Capital is automatically allocated from the Senior Pool into the senior tranches of various direct-lending deals on Goldfinch according to the Leverage Model. This capital is protected by first-loss capital in all deals.</div>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', padding: '5px' }} className="rounded-full">
                            <a href='https://discord.gg/7FHgxdyW' target='_blank'>Website</a>
                        </div>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', padding: '5px' }} className="rounded-full">
                            <a href='https://www.linkedin.com/in/loing851/' target='_blank'>LinkedIn</a>
                        </div>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', padding: '5px' }} className="rounded-full">
                            <a href='https://twitter.com/' target='_blank'>Website</a>
                        </div>
                    </div>
                </div>

                <div id="repayment" style={{ height: 'auto', background: 'rgba(0,0,255,0.02)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }}>
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Recent activity</div>
                </div>
            </Col>
            <Col span={5}>
            </Col>
        </Row>
    )
}

SeniorLoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });
