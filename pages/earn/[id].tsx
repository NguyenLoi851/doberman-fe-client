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
import TranchedPool from "../../abi/TranchedPool.json"
import { constants } from "@/commons/constants";
import { Anchor, Button, Col, InputNumber, Row, Slider, Statistic } from "antd";
import { toast } from "react-toastify";
import { MonitorOutlined } from '@ant-design/icons';

interface Props {
    children: ReactNode;
}

enum TrancheInvestStatus {
    OPEN,
    JUNIOR_LOCK,
    SENIOR_LOCK
}

export default function LoanDetailPage() {
    const router = useRouter()
    const props = router.query
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);
    const [loanDetailInfo, setLoanDetailInfo] = useState({})

    const [fundingLimit, setFundingLimit] = useState(0)
    const [juniorDeposited, setJuniorDeposited] = useState(0)
    const [seniorDeposited, setSeniorDeposited] = useState(0)
    const [wantInvestAmount, setWantInvestAmount] = useState(0)
    const [trancheInvestStatus, setTrancheInvestStatus] = useState(TrancheInvestStatus.OPEN)

    const { data: walletClient } = useWalletClient()
    const tokenDetailLoanQuery = `
    query LoanDetail($poolId: String!) {
        tranchedPool(id: $poolId) {
            id
            actualSeniorPoolInvestment
            address
            balance
            createdAt
            creditLineAddress
            drawdownsPaused
            estimatedLeverageRatio
            estimatedSeniorPoolContribution
            estimatedTotalAssets
            fundableAt
            fundingLimit
            initialInterestOwed
            interestAccruedAsOf
            interestAmountRepaid
            interestRate
            interestRateBigInt
            isPaused
            juniorDeposited
            seniorDeposited
            juniorFeePercent
            lateFeeRate
            nextDueTime
            numBackers
            numRepayments
            principalAmount
            principalAmountRepaid
            rawGfiApy
            remainingCapacity
            reserveFeePercent
            termEndTime
            termInSeconds
            termStartTime
            totalDeposited
            txHash
            usdcApy
            juniorLocked
            seniorLocked
        }
    }`

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getLoanDetailInfo = async () => {
        try {
            if (!props.address) {
                return;
            }

            const res = await client.query({
                query: gql(tokenDetailLoanQuery),
                variables: {
                    poolId: (props.address as any).toLowerCase() ?? ""
                }
            })
            setLoanDetailInfo(res.data.tranchedPool)
            setFundingLimit(Number((res.data.tranchedPool as any).fundingLimit) / constants.ONE_MILLION)
            setJuniorDeposited(Number((res.data.tranchedPool as any).juniorDeposited) / constants.ONE_MILLION)
            setSeniorDeposited(Number((res.data.tranchedPool as any).seniorDeposited) / constants.ONE_MILLION)
            if (res && res.data && res.data.tranchedPool) {
                if ((res.data.tranchedPool as any).seniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.SENIOR_LOCK)
                } else if ((res.data.tranchedPool as any).juniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.JUNIOR_LOCK)
                }
            }

        } catch (error) {
            console.log(error)
        }

    }

    useEffect(() => {
        getLoanDetailInfo()
        setChainId(chain?.id || 80001)
    }, [chain, props])

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
                props.address as any,
                BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
                signatureDeadline,
                nonces as any
            )

            const { hash } = await writeContract({
                address: props.address as any,
                abi: TranchedPool,
                functionName: 'depositWithPermit',
                args: [2, BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION)), signatureDeadline, splitedSignature.v, splitedSignature.r, splitedSignature.s],
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
            try {
                toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1])
            } catch (error2) {
                console.log(JSON.stringify(error2))
            }
        }

    }

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
                            key: 'borrower',
                            href: '#borrower',
                            title: 'Borrower',
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
                <div id="invest" style={{ height: 'auto', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} className="bg-lime-300" >
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <div style={{ margin: '10px', fontSize: '16px' }}>{props.companyName}</div>
                        <a style={{ margin: '10px' }} href={`https://mumbai.polygonscan.com/address/${props.address}#code`} target="_blank" className="text-sky-500 hover:underline hover:underline-offset-3 "><MonitorOutlined style={{ marginRight: '5px', fontSize: '20px' }} />MumbaiScan </a>
                    </div>
                    <div style={{ margin: '10px', fontSize: '24px', fontWeight: 'bold' }}>{props.projectName}</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{props.projectIntro}</div>
                    <div style={{ margin: '10px', fontSize: '16px' }}>Fixed USDC APY {(loanDetailInfo as any).usdcApy} %</div>
                    <div style={{ margin: '10px', fontSize: '16px' }}>Fundable At: {dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')}</div>
                    <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                        <Statistic title="Junior Deposited Amount (USDC)" value={juniorDeposited} precision={2} />
                        <Statistic title="Senior Deposited Amount (USDC)" value={seniorDeposited} precision={2} />
                        <Statistic title="Funding Limit (USDC)" value={fundingLimit} precision={2} />
                    </div>
                    <div style={{ margin: '10px', textAlign: 'center', marginTop: '50px', fontSize: '24px' }}>Invested ratio </div>
                    <div style={{ marginRight: '10px', display: 'flex', justifyContent: 'end', fontSize: '24px' }} className="text-sky-600">{juniorDeposited + seniorDeposited + wantInvestAmount} / {fundingLimit} USDC ({((juniorDeposited + seniorDeposited + wantInvestAmount) / fundingLimit * 100).toFixed(2)}%)</div>
                    <div style={{ margin: '10px', marginTop: '0px' }} >
                        <Slider
                            value={juniorDeposited + seniorDeposited + wantInvestAmount}
                            max={fundingLimit}
                            step={0.01}
                            disabled={true}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {Number((loanDetailInfo as any).fundableAt) > dayjs().unix() && (
                            <div style={{ margin: '20px', marginTop: '25px' }}>Wait until {dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')}</div>
                        )}
                        {trancheInvestStatus == 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <InputNumber
                                        placeholder="Input value"
                                        value={wantInvestAmount}
                                        onChange={handleWantInvestAmount}
                                        max={fundingLimit - juniorDeposited}
                                        style={{ width: 150, marginTop: '10px' }}
                                    />
                                </div>
                                <div onClick={handleDeposit} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }} className="btn-sm bg-sky-300 hover:bg-sky-500 rounded-lg">Deposit</div>
                            </div>
                        )}
                        {trancheInvestStatus != 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            <div style={{ margin: '20px', marginTop: '25px' }} className="btn-sm bg-sky-200">Locked</div>
                        )}
                    </div>


                </div>

                <div id="overview" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Overview</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Total</div>
                    <div>Repayment status</div>
                </div>

                <div id="borrower" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', borderRadius: '5%', padding: '10px' }} >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Borrower details</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{props.companyName}</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{props.companyIntro}</div>
                    <div style={{ margin: '10px', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', borderRadius: '30%', padding: '5px' }}>
                            <a href={`${props.companyPage}`}>Website</a>
                        </div>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', borderRadius: '30%', padding: '5px' }}>
                            <a href={`${props.companyContact}`}>Contact</a>
                        </div>
                    </div>
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

LoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });
