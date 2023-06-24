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
            setTotalShares(Number(BigNumber(res.data.seniorPool.totalShares).div(constants.ONE_BILLION)))
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getSeniorLoanDetailInfo()
        setChainId(chain?.id || 80001)
    }, [chain])

    const domain: Domain = {
        version: '2',
        name: `\'USD Coin\'`,
        chainId: chainId,
        verifyingContract: contractAddr.mumbai.usdc as any
    }
    const signatureDeadline = Math.floor(Date.now() / 1000 + 90000);

    const handleDeposit = async () => {
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
                confirmations: 6,
            })

            if (status == 'success') {
                toast.success("Invest successfully")
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }

        } catch (error) {
            console.log(error)
            try {
                toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1])
            } catch (error2) {
                console.log(JSON.stringify(error2))
            }
        }

    }

    // const getUserShares = async() => {
    //     try {
    //         await readContract({
    //             address: contractAddr.mumbai.
    //         })
    //     } catch (error) {

    //     }
    // }

    const handleWantInvestAmount = (value: any) => {
        setWantInvestAmount(value)
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
                            key: 'overview',
                            href: '#overview',
                            title: 'Overview'
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
                        },
                        {
                            key: 'history',
                            href: '#history',
                            title: 'Recent activity'
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
                    <div style={{ margin: '10px', fontSize: '16px' }}>Fixed USDC APY {(seniorLoanDetailInfo as any).estimatedApy} %</div>
                    <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                        <Statistic title="Assets (USDC)" value={assets} precision={2} />
                        <Statistic title="Your Shares (GFI)" value={totalShares} precision={2} />
                        <Statistic title="Shares (GFI)" value={totalShares} precision={2} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <InputNumber
                            placeholder="Input value"
                            value={wantInvestAmount}
                            onChange={handleWantInvestAmount}
                            style={{ width: 300, marginTop: '10px' }}
                            addonAfter='USDC ($)'
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Button onClick={handleDeposit} style={{ margin: '20px', marginTop: '25px' }}>Deposit</Button>

                    </div>


                </div>

                <div id="overview" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Overview</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Total</div>
                    <div>Repayment status</div>
                </div>


                <div id="repayment" style={{ height: 'auto', background: 'rgba(0,0,255,0.02)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }}>
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Repayment terms</div>
                    <div>Loan terms</div>
                    <div>Term start date</div>
                    <div>Loan maturity date</div>
                    <div>Repayment structure</div>
                    <div>Payment Frequency</div>
                    <div>Total payments</div>
                </div>

                <div id="repayment" style={{ height: 'auto', background: 'rgba(0,0,255,0.02)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }}>
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Recent activity</div>
                </div>
            </Col>
            <Col span={5}>
            </Col>
        </Row>
        // </div>
        // </div>
    )
}

SeniorLoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });
