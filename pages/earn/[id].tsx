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
import UniqueIdentity from "@/abi/UniqueIdentity.json"
import Link from "next/link";
import CreditLine from "../../abi/CreditLine.json";

interface Props {
    children: ReactNode;
}

enum TrancheInvestStatus {
    OPEN,
    JUNIOR_LOCK,
    SENIOR_LOCK
}

const InterestPaymentFrequency = [1, 3, 6, 12]

export default function LoanDetailPage() {
    const router = useRouter()
    const props = router.query
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);
    const [loanDetailInfo, setLoanDetailInfo] = useState({})
    const [uidStatus, setUidStatus] = useState(false)
    const [tokenIds, setTokenIds] = useState([])
    const [fundingLimit, setFundingLimit] = useState(0)
    const [juniorDeposited, setJuniorDeposited] = useState(0)
    const [seniorDeposited, setSeniorDeposited] = useState(0)
    const [interestAmountRepaid, setInterestAmountRepaid] = useState(0)
    const [principalAmountRepaid, setPrincipalAmountRepaid] = useState(0)
    const [wantInvestAmount, setWantInvestAmount] = useState(0)
    const [nextDueTime, setNextDueTime] = useState(0)
    const [creditLineAddr, setCreditLineAddr] = useState('')
    const [trancheInvestStatus, setTrancheInvestStatus] = useState(TrancheInvestStatus.OPEN)
    const [loadingDeposit, setLoadingDeposit] = useState(false)
    const [loadingWithdraw, setLoadingWithdraw] = useState(false)
    const [availableWithdraw, setAvailableWithdraw] = useState({
        interest: 0,
        principal: 0
    })

    const { data: walletClient } = useWalletClient()
    const tokenDetailLoanQuery = `
    query LoanDetail($poolId: String!, $userId: String!) {
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

        user(id: $userId) {
            poolTokens(where: {loan: $poolId}) {
              id
              principalAmount
            }
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
                    poolId: (props.address as any).toLowerCase() ?? "",
                    userId: (address as any).toLowerCase()
                }
            })
            setLoanDetailInfo(res.data.tranchedPool)
            setFundingLimit(Number((res.data.tranchedPool as any).fundingLimit) / constants.ONE_MILLION)
            setJuniorDeposited(Number((res.data.tranchedPool as any).juniorDeposited) / constants.ONE_MILLION)
            setSeniorDeposited(Number((res.data.tranchedPool as any).seniorDeposited) / constants.ONE_MILLION)
            setInterestAmountRepaid(Number((res.data.tranchedPool as any).interestAmountRepaid) / constants.ONE_MILLION)
            setPrincipalAmountRepaid(Number((res.data.tranchedPool as any).principalAmountRepaid) / constants.ONE_MILLION)
            setCreditLineAddr((res.data.tranchedPool as any).creditLineAddress)

            if (res && res.data && res.data.tranchedPool) {
                if ((res.data.tranchedPool as any).seniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.SENIOR_LOCK)
                } else if ((res.data.tranchedPool as any).juniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.JUNIOR_LOCK)
                }
            }

            const tokenIdsArr: string[] = []
            res.data.user.poolTokens.map((item: any) => {
                tokenIdsArr.push(item.id)
            })
            setTokenIds(tokenIdsArr as any)
            await getAvailableWithdraw(tokenIdsArr)
        } catch (error) {
            console.log(error)
        }
    }

    const getNextDueTime = async () => {
        try {
            const res = await readContract({
                address: creditLineAddr as any,
                abi: CreditLine,
                functionName: 'nextDueTime',
                chainId
            })
            setNextDueTime(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getAvailableWithdraw = async (tokenIdsArr: any) => {
        try {
            const res = await readContract({
                address: props.address as any,
                abi: TranchedPool,
                functionName: 'availableToWithdrawMultiple',
                args: [tokenIdsArr]
            })
            setAvailableWithdraw({
                interest: Number(BigNumber((res as any)[0]).div(BigNumber(constants.ONE_MILLION))),
                principal: Number(BigNumber((res as any)[1]).div(BigNumber(constants.ONE_MILLION)))
            })
        } catch (error) {
            console.log(error)
        }
    }

    const getUIDBalanace = async () => {
        try {
            const balance = await readContract({
                address: contractAddr.mumbai.uniqueIdentity as any,
                abi: UniqueIdentity,
                functionName: 'balanceOf',
                args: [address as any, constants.UID_ID],
                chainId: constants.MUMBAI_ID,
            })
            setUidStatus(balance == 0 ? false : true)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getLoanDetailInfo()
        setChainId(chain?.id || 80001)
        if (address != undefined && address != null && address != '0x0000000000000000000000000000000000000000') {
            getUIDBalanace()
        }
        if (creditLineAddr != '') {
            getNextDueTime()
        }
    }, [chain, props, address])

    const domain: Domain = {
        version: '2',
        name: `\'USD Coin\'`,
        chainId: chainId,
        verifyingContract: contractAddr.mumbai.usdc as any
    }
    const signatureDeadline = Math.floor(Date.now() / 1000 + 90000);

    const handleDeposit = async () => {
        setLoadingDeposit(true);
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
                // confirmations: 6,
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
        setLoadingDeposit(false);
    }

    const handleWantInvestAmount = (value: any) => {
        setWantInvestAmount(value)
    }

    const handleWithdraw = async () => {
        setLoadingWithdraw(true)
        try {
            const { hash } = await writeContract({
                address: props.address as any,
                abi: TranchedPool,
                functionName: 'withdrawMaxMultiple',
                args: [tokenIds]
            })

            const { status } = await waitForTransaction({
                hash
            })

            if (status == 'success') {
                toast.success("Withdraw successfully")
            }
            if (status == 'reverted') {
                toast.error("Transaction reverted")
            }
        } catch (error) {
            try {
                toast.error((JSON.parse(JSON.stringify(error)) as any).shortMessage.split(':')[1])
            } catch (error2) {
                console.log(JSON.stringify(error2))
            }
        }
        setLoadingWithdraw(false)
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
                    <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                        <Statistic title="Fundable At" value={dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')} />
                        <Statistic title="Term" value={Number(props.loanTerm)} suffix="months" />
                        <Statistic title="Interest Rate (APR)" value={Number(props.interestRate)} suffix="%" />
                    </div>
                    <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                        <Statistic title="Junior Deposited Amount (USDC)" value={juniorDeposited} precision={2} />
                        <Statistic title="Senior Deposited Amount (USDC)" value={seniorDeposited} precision={2} />
                        <Statistic title="Funding Limit (USDC)" value={fundingLimit} precision={2} />
                    </div>
                    <div style={{ fontSize: '24px', margin: '10px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '80px' }}>
                        <div style={{ textAlign: 'center' }}>Invested ratio </div>
                        <div className="text-sky-600">{(juniorDeposited + seniorDeposited + wantInvestAmount).toLocaleString()} / {fundingLimit.toLocaleString()} USDC ({((juniorDeposited + seniorDeposited + wantInvestAmount) / fundingLimit * 100).toFixed(2)}%)</div>
                    </div>
                    <div style={{ margin: '10px', marginTop: '0px' }} >
                        <Slider
                            value={juniorDeposited + seniorDeposited + wantInvestAmount}
                            max={fundingLimit}
                            step={0.01}
                            disabled={true}
                        />
                    </div>

                    {/* <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}> */}
                    <div style={{ marginTop: '30px' }}>
                        {Number((loanDetailInfo as any).fundableAt) > dayjs().unix() && (
                            <div style={{ margin: '20px', marginTop: '25px' }}>Wait until {dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')}</div>
                        )}
                        {trancheInvestStatus == 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            (uidStatus == true ?
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <div>
                                            <InputNumber
                                                placeholder="Input value"
                                                value={wantInvestAmount}
                                                onChange={handleWantInvestAmount}
                                                max={fundingLimit - juniorDeposited}
                                                style={{ width: 150, marginTop: '10px' }}
                                                precision={2}
                                                min={0}
                                            />
                                        </div>
                                        <Button loading={loadingDeposit} onClick={handleDeposit} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Deposit</Button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <div>My interest amount: {availableWithdraw.interest.toLocaleString()} USDC</div>
                                        <div>My principal amount: {availableWithdraw.principal.toLocaleString()} USDC</div>
                                        <Button disabled={availableWithdraw.interest + availableWithdraw.principal == 0} loading={loadingWithdraw} onClick={handleWithdraw} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Withdraw</Button>
                                    </div>
                                </div>
                                :
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ margin: '10px' }}>You need set up your UID first to invest</div>
                                    <Link href='/account' >
                                        <div style={{ justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }} className="rounded-md btn-sm text-black bg-sky-50 hover:bg-gray-200 hover:text-black ml-3">
                                            Go to my account
                                        </div>
                                    </Link>

                                </div>)
                        )}
                        {trancheInvestStatus != 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ margin: '20px', marginTop: '25px', maxHeight: '35px', fontWeight: 'bold' }} className="btn-sm bg-sky-200 rounded-lg">Locked</div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    <div>My interest amount: {availableWithdraw.interest.toLocaleString()} USDC</div>
                                    <div>My principal amount: {availableWithdraw.principal.toLocaleString()} USDC</div>
                                    <Button disabled={availableWithdraw.interest + availableWithdraw.principal == 0} loading={loadingWithdraw} onClick={handleWithdraw} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Withdraw</Button>
                                </div>
                            </div>

                        )}
                    </div>


                </div>

                <div id="overview" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', padding: '10px' }} className="rounded-lg" >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Overview</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '50px', marginRight: '50px' }}>
                        <div>
                            <Statistic style={{ margin: '30px' }} title="Principal repaid (USDC)" value={principalAmountRepaid.toLocaleString()} precision={2} />
                            <Statistic style={{ margin: '30px' }} title="Interest repaid (USDC)" value={interestAmountRepaid.toLocaleString()} precision={2} />
                        </div>
                        <div>
                            <Statistic style={{ margin: '30px' }} title="Total repaid (USDC)" value={(interestAmountRepaid + principalAmountRepaid).toLocaleString()} precision={2} />
                            <Statistic style={{ margin: '30px' }} title="Repayment status" value={nextDueTime == 0 ? "Done" : "On time"} />
                        </div>
                    </div>
                </div>

                <div id="borrower" style={{ height: 'auto', background: 'rgb(241, 233, 210)', marginBottom: '50px', padding: '10px' }} className="rounded-lg" >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Borrower details</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{props.companyName}</div>
                    <div style={{ margin: '10px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{props.companyIntro}</div>
                    <div style={{ margin: '10px', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', borderRadius: '30%', padding: '5px' }}>
                            <a href={`${props.companyPage}`} target='_blank'>Website</a>
                        </div>
                        <div style={{ margin: '10px', backgroundColor: 'rgb(255,255,255)', borderRadius: '30%', padding: '5px' }}>
                            <a href={`${props.companyContact}`} target='_blank'>Contact</a>
                        </div>
                    </div>
                </div>

                <div id="repayment" style={{ height: 'auto', background: 'rgba(0,0,255,0.02)', marginBottom: '50px', padding: '10px' }} className="rounded-lg" >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Repayment terms</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '50px', marginRight: '50px' }}>
                        <div>
                            <Statistic style={{ margin: '30px' }} suffix="months" title="Loan terms" value={(props as any).loanTerm} />
                            <Statistic style={{ margin: '30px' }} title="Term start date" value={dayjs(Number((loanDetailInfo as any).termStartTime * 1000)).format("DD/MM/YYYY HH:mm:ss").toString()} />
                            <Statistic style={{ margin: '30px' }} title="Term start date" value={dayjs(Number((loanDetailInfo as any).termEndTime * 1000)).format("DD/MM/YYYY HH:mm:ss").toString()} />
                        </div>
                        <div>
                            <Statistic style={{ margin: '30px' }} suffix="months" title="Payment Frequency" value={InterestPaymentFrequency[(props as any).interestPaymentFrequency]} />
                            <Statistic style={{ margin: '30px' }} title="Repayment structure" value="Bullet" />
                            <Statistic style={{ margin: '30px' }} title="Total interest payments (USDC)" value={(juniorDeposited + seniorDeposited) / 100 * Number((loanDetailInfo as any).interestRate) / 365 * Number((props as any).loanTerm) * 100} precision={2} />
                        </div>
                    </div>
                </div>

                <div id="repayment" style={{ height: 'auto', background: 'rgba(0,0,255,0.02)', marginBottom: '50px', padding: '10px' }} className="rounded-lg" >
                    <div style={{ margin: '10px', fontSize: '16px', fontWeight: 'bold' }}>Recent activity</div>
                </div>
            </Col>
            <Col span={5}>
            </Col>
        </Row >
        // </div>
        // </div>
    )
}

LoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });
