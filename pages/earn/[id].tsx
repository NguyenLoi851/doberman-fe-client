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
import { Anchor, Button, Col, Descriptions, Empty, InputNumber, Row, Slider, Statistic, Table, Upload } from "antd";
import { toast } from "react-toastify";
import { MonitorOutlined, LinkOutlined } from '@ant-design/icons';
import UniqueIdentity from "@/abi/UniqueIdentity.json"
import Link from "next/link";
import CreditLine from "../../abi/CreditLine.json";
import { ColumnsType } from "antd/es/table";
import { shortenAddress } from "@/components/shortenAddress";
import axios from "axios";

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
    // const props = router.query
    const loanAddr = router.asPath.split('/earn/')[1].split('#')[0]
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(constants.MUMBAI_ID);
    const [loanDetailInfo, setLoanDetailInfo] = useState({
        creditLine: {
            balance: 0,
            termEndTime: 0,
            paymentPeriodInDays: 0,
            auctionWinner: '0x',
            auctionLivePrice: 0,
            auctionEnd: 0,
        }
    })
    const [uidStatus, setUidStatus] = useState(false)
    const [tokenIds, setTokenIds] = useState([])
    const [fundingLimit, setFundingLimit] = useState(0)
    const [juniorDeposited, setJuniorDeposited] = useState(0)
    const [seniorDeposited, setSeniorDeposited] = useState(0)
    const [interestAmountRepaid, setInterestAmountRepaid] = useState(0)
    const [principalAmountRepaid, setPrincipalAmountRepaid] = useState(0)
    const [wantInvestAmount, setWantInvestAmount] = useState(0)
    const [wantBidAmount, setWantBidAmount] = useState(0)
    const [nextDueTime, setNextDueTime] = useState(0)
    const [creditLineAddr, setCreditLineAddr] = useState('')
    const [trancheInvestStatus, setTrancheInvestStatus] = useState(TrancheInvestStatus.OPEN)
    const [loadingDeposit, setLoadingDeposit] = useState(false)
    const [loadingWithdraw, setLoadingWithdraw] = useState(false)
    const [loadingBid, setLoadingBid] = useState(false)
    const [historyTx, setHistoryTx] = useState([])
    const [availableWithdraw, setAvailableWithdraw] = useState({
        interest: 0,
        principal: 0
    })
    const [interestOwe, setInterestOwe] = useState(0)
    const [principleOwe, setPrincipleOwe] = useState(0)
    const [links, setLinks] = useState('')

    const getInterestAndPrincipalOwedAsOfCurrent = async () => {
        try {
            const res = await readContract({
                address: creditLineAddr as any,
                abi: CreditLine,
                functionName: 'getInterestAndPrincipalOwedAsOfCurrent',
                chainId
            })
            setInterestOwe(Number(BigNumber((res as any)[0]).div(BigNumber(constants.ONE_MILLION))))
            setPrincipleOwe(Number(BigNumber((res as any)[1]).div(BigNumber(constants.ONE_MILLION))))
        } catch (error) {
            console.log(error)
        }
    }


    const InterestPaymentFrequency = [1, 3, 6, 12]

    const ActionPresentation = {
        TRANCHED_POOL_REPAYMENT: "Borrower repays",
        SENIOR_POOL_REDEMPTION: "Senior redeems",
        TRANCHED_POOL_DEPOSIT: "Investor deposits",
        TRANCHED_POOL_DRAWDOWN: "Borrower drawdowns",
        TRANCHED_POOL_WITHDRAWAL: "Investor withdraws",
        BID: "User bids",
    }
    interface DataType {
        key: React.Key;
        user: string;
        action: string;
        amount: string;
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
            title: 'Amount',
            dataIndex: 'amount',
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
            creditLine {
                paymentPeriodInDays
                termEndTime
                auctionWinner
                auctionLivePrice
                auctionEnd
                balance
              }
        }

        user(id: $userId) {
            poolTokens(where: {loan: $poolId}) {
              id
              principalAmount
            }
        }

        transactions(
            where: {loan: $poolId}
            orderBy: timestamp
            orderDirection: desc
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

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getLoanDetailInfo = async () => {
        try {
            if (!loanAddr || loanAddr == "[id]") {
                return;
            }
            const res = await client.query({
                query: gql(tokenDetailLoanQuery),
                variables: {
                    poolId: (loanAddr as any).toLowerCase() ?? "",
                    userId: address ? (address as any).toLowerCase() : "",
                }
            })
            const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/getLoanByFilter', {
                params: {
                    txHash: res.data.tranchedPool.txHash
                }
            })

            try {
                if (res2.data.legalDocuments != '' && res2.data.legalDocuments != null && res2.data.legalDocuments != undefined) {
                    const fileKeysParse = res2.data.legalDocuments as any
                    const fileURLs = fileKeysParse.map((item: any) => {
                        return process.env.NEXT_PUBLIC_S3_BASE_URL as any + item.fileKey
                    })
                    setLinks(fileURLs)
                }
            } catch (error) {
                console.log(error)
            }

            try {
                setLoanDetailInfo({ ...res.data.tranchedPool, ...res2.data })
                setFundingLimit(Number((res.data.tranchedPool as any).fundingLimit) / constants.ONE_MILLION)
                setJuniorDeposited(Number((res.data.tranchedPool as any).juniorDeposited) / constants.ONE_MILLION)
                setSeniorDeposited(Number((res.data.tranchedPool as any).seniorDeposited) / constants.ONE_MILLION)
                setInterestAmountRepaid(Number((res.data.tranchedPool as any).interestAmountRepaid) / constants.ONE_MILLION)
                setPrincipalAmountRepaid(Number((res.data.tranchedPool as any).principalAmountRepaid) / constants.ONE_MILLION)
                setCreditLineAddr((res.data.tranchedPool as any).creditLineAddress)
            } catch (error) {
                console.log(error)
            }

            if (res && res.data && res.data.tranchedPool) {
                if ((res.data.tranchedPool as any).seniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.SENIOR_LOCK)
                } else if ((res.data.tranchedPool as any).juniorLocked == true) {
                    setTrancheInvestStatus(TrancheInvestStatus.JUNIOR_LOCK)
                }
            }

            if (res.data.user && res.data.user.poolTokens && res.data.user.poolTokens.length > 0) {
                const tokenIdsArr: string[] = []
                res.data.user.poolTokens.map((item: any) => {
                    tokenIdsArr.push(item.id)
                })
                setTokenIds(tokenIdsArr as any)
                await getAvailableWithdraw(tokenIdsArr)
            }

            const txData: DataType[] = []
            res.data.transactions.map((item: any) => {
                txData.push({
                    key: item.id,
                    user: (item.user.id == contractAddr.mumbai.seniorPool ? "Senior Pool" : shortenAddress(item.user.id)),
                    action: ((item.user.id == contractAddr.mumbai.seniorPool && item.category == 'TRANCHED_POOL_DEPOSIT') ? "Senior deposits" : (ActionPresentation as any)[item.category as any]),
                    // action: item.category,
                    amount: (Number(item.receivedAmount || item.sentAmount) / constants.ONE_MILLION).toLocaleString() + ' USDC',
                    timestamp: dayjs(Number(item.timestamp) * 1000).format('DD/MM/YYYY HH:mm:ss'),
                    tx: <div><MonitorOutlined style={{ padding: '5px' }} /><a href={`https://mumbai.polygonscan.com/tx/${item.transactionHash}`} target='_blank' className="underline underline-offset-2">Tx</a></div>,
                })
            })
            setHistoryTx(txData as any)
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
        if (tokenIdsArr.length == 0) {
            return;
        }
        try {
            const res = await readContract({
                address: loanAddr as any,
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
        setChainId(chain?.id || constants.MUMBAI_ID)
        if (address != undefined && address != null && address != '0x0000000000000000000000000000000000000000') {
            getUIDBalanace()
        }
        if (creditLineAddr != '') {
            getNextDueTime()
            getInterestAndPrincipalOwedAsOfCurrent()
        }
    }, [chain, loanAddr, address, creditLineAddr])

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
                loanAddr as any,
                BigNumber(wantInvestAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
                signatureDeadline,
                nonces as any
            )

            const { hash } = await writeContract({
                address: loanAddr as any,
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

    const handleBid = async () => {
        setLoadingBid(true);
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
                creditLineAddr as any,
                BigNumber(wantBidAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
                signatureDeadline,
                nonces as any
            )

            const { hash } = await writeContract({
                address: creditLineAddr as any,
                abi: CreditLine,
                functionName: 'bidWithPermit',
                args: [BigNumber(wantBidAmount).multipliedBy(BigNumber(constants.ONE_MILLION)), signatureDeadline, splitedSignature.v, splitedSignature.r, splitedSignature.s],
            })

            const { status } = await waitForTransaction({
                hash: hash,
                // confirmations: 6,
            })

            if (status == 'success') {
                toast.success("Bid auction successfully")
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
        setLoadingBid(false)
    }

    const handleWantInvestAmount = (value: any) => {
        setWantInvestAmount(value)
    }

    const handleWantBidAmount = (value: any) => {
        setWantBidAmount(value)
    }

    const handleWithdraw = async () => {
        setLoadingWithdraw(true)
        try {
            const { hash } = await writeContract({
                address: loanAddr as any,
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

    const handleBidNextSmallestLivePrice = async () => {
        setWantBidAmount((loanDetailInfo as any).creditLine.auctionLivePrice == '0' ? Number((interestOwe + principleOwe)) : Number((loanDetailInfo as any).creditLine.auctionLivePrice) * 1.1)
    }

    return (
        <Row >
            <Col span={1}>
            </Col>
            <Col span={4}>
                <Anchor
                    bounds={100}
                    items={[
                        {
                            key: 'invest',
                            href: '#invest',
                            title: 'Invest',
                            className: "hover:font-bold my-4",
                        },
                        {
                            key: 'overview',
                            href: '#overview',
                            title: 'Overview',
                            className: "hover:font-bold my-4",
                        },
                        {
                            key: 'document',
                            href: '#document',
                            title: 'Legal Documents',
                            className: "hover:font-bold my-4",
                        },
                        {
                            key: 'borrower',
                            href: '#borrower',
                            title: 'Borrower',
                            className: "hover:font-bold my-4",
                        },
                        {
                            key: 'repayment',
                            href: '#repayment',
                            title: 'Repayment',
                            className: "hover:font-bold my-4",
                        },
                        {
                            key: 'history',
                            href: '#history',
                            title: 'Recent activity',
                            className: "hover:font-bold my-4",
                        }
                    ]}
                />
            </Col>
            <Col span={14}>
                <div id="invest" style={{ marginBottom: '50px', padding: '0px', paddingBottom: '5px' }} className="bg-white rounded-lg shadow-2xl">
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }} className="bg-sky-900 rounded-t-lg text-sky-200">
                        <div style={{ margin: '10px', fontSize: '24px', fontWeight: 'bold' }}>{(loanDetailInfo as any).companyName}</div>
                        <a style={{ margin: '10px' }} href={`https://mumbai.polygonscan.com/address/${loanAddr}#code`} target="_blank" className="text-sky-400 hover:underline hover:underline-offset-2 hover:text-sky-200"><MonitorOutlined style={{ marginRight: '5px', fontSize: '20px' }} />MumbaiScan </a>
                    </div>
                    <div style={{ margin: '20px', fontSize: '16px', fontWeight: 'bold' }}>{(loanDetailInfo as any).projectName}</div>
                    <div style={{ margin: '20px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{(loanDetailInfo as any).projectIntro}</div>
                    <div className="border-2 border-slate-400 rounded-lg" style={{ margin: '20px' }}>
                        {/* <div className="flex justify-between" style={{ marginTop: '20px', marginBottom: '50px', marginLeft: '20px', marginRight: '20px', fontSize: '16px' }}>
                            <Statistic title="Fundable At" value={dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')} />
                            <Statistic title="Term" value={Number((loanDetailInfo as any).loanTerm)} suffix="months" />
                            <Statistic title="Interest Rate (APR)" value={Number((loanDetailInfo as any).interestRate)} suffix="%" />
                        </div>
                        <div className="flex justify-between" style={{ marginTop: '50px', marginLeft: '20px', marginRight: '20px', marginBottom: '20px', fontSize: '16px' }}>
                            <Statistic title="Junior Deposited Amount (USDC)" value={juniorDeposited} precision={2} />
                            <Statistic title="Senior Deposited Amount (USDC)" value={seniorDeposited} precision={2} />
                            <Statistic title="Funding Limit (USDC)" value={fundingLimit} precision={2} />
                        </div> */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="grid grid-cols-3 gap-12" style={{ marginTop: '30px', fontSize: '16px' }}>
                                <Statistic title="Fundable At" value={dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')} />
                                <Statistic title="Term" value={Number((loanDetailInfo as any).loanTerm)} suffix="months" />
                                <Statistic title="Interest Rate (APR)" value={Number((loanDetailInfo as any).interestRate)} suffix="%" />
                                <Statistic title="Junior Deposited Amount (USDC)" value={juniorDeposited} precision={2} />
                                <Statistic title="Senior Deposited Amount (USDC)" value={seniorDeposited} precision={2} />
                                <Statistic title="Funding Limit (USDC)" value={fundingLimit} precision={2} />
                            </div>
                        </div>

                        <div style={{ margin: '20px' }}>
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
                                    className="bg-sky-400 rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        {Number((loanDetailInfo as any).fundableAt) > dayjs().unix() && (
                            <div style={{ margin: '20px', marginTop: '25px' }}>Wait until {dayjs(Number((loanDetailInfo as any).fundableAt) * 1000).format('DD/MM/YYYY hh:mm:ss')}</div>
                        )}
                        {trancheInvestStatus == 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            (uidStatus == true ?
                                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '80px', marginTop: '50px', marginBottom: '30px' }}>
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
                                                addonAfter="USDC"
                                            />
                                        </div>
                                        <Button loading={loadingDeposit} onClick={handleDeposit} style={{ margin: '20px', marginTop: '35px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Deposit</Button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ width: '250px', display: 'flex', alignContent: 'end', alignItems: 'end', justifyContent: 'end', justifyItems: 'end' }}>
                                            <Descriptions>
                                                <Descriptions.Item span={3} label="My interest amount">{availableWithdraw.interest.toLocaleString()} USDC</Descriptions.Item>
                                                <Descriptions.Item span={3} label="My principal amount">{availableWithdraw.principal.toLocaleString()} USDC</Descriptions.Item>
                                            </Descriptions>
                                        </div>
                                        <Button disabled={availableWithdraw.interest + availableWithdraw.principal == 0} loading={loadingWithdraw} onClick={handleWithdraw} style={{ margin: '20px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Withdraw</Button>
                                    </div>
                                </div>
                                :
                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginLeft: '100px', marginRight: '100px', marginBottom: '20px', padding: '20px' }} className='rounded-lg text-white bg-sky-700 shadow-md'>
                                    <div style={{ margin: '10px' }}>You need set up your UID first to invest</div>
                                    <Link href='/account' >
                                        <div style={{ justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }} className="rounded-md btn-sm text-black bg-sky-50 hover:bg-gray-200 hover:text-black ml-3">
                                            Go to my account
                                        </div>
                                    </Link>
                                </div>)
                        )}
                        {trancheInvestStatus != 0 && Number((loanDetailInfo as any).fundableAt) <= dayjs().unix() && (
                            <div style={{ marginLeft: '60px', marginRight: '60px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }} className="border-2 border-black rounded-lg">
                                    <div style={{ marginTop: '30px', maxHeight: '35px', fontWeight: 'bold' }} className="btn-sm bg-lime-400 rounded-lg">Locked</div>
                                    <div style={{ width: '30vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <Descriptions>
                                            <Descriptions.Item span={3} label="My interest amount">{availableWithdraw.interest.toLocaleString()} USDC</Descriptions.Item>
                                            <Descriptions.Item span={3} label="My principal amount">{availableWithdraw.principal.toLocaleString()} USDC</Descriptions.Item>
                                        </Descriptions>
                                        <Button disabled={availableWithdraw.interest + availableWithdraw.principal == 0} loading={loadingWithdraw} onClick={handleWithdraw} style={{ margin: '20px', marginTop: '25px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg">Withdraw</Button>
                                    </div>
                                </div>
                                {(Number((loanDetailInfo as any).creditLine.balance) > 0 && Math.floor(Date.now() / 1000) > Number((loanDetailInfo as any).creditLine.termEndTime) + Number((loanDetailInfo as any).creditLine.paymentPeriodInDays * 60)) &&
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', fontWeight: 'bold', fontSize: '24px' }}>Auction Info</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', marginBottom: '30px' }} className="border-2 border-black rounded-lg">
                                            <div style={{ marginTop: '10px' }}>
                                                <Descriptions style={{ margin: '15px' }}>
                                                    <Descriptions.Item span={3} label="Current Winner">
                                                        {(loanDetailInfo as any).creditLine.auctionWinner == '0x0000000000000000000000000000000000000000' ? "No one" :
                                                            <a className="text-sky-700 hover:text-sky-900 hover:underline hover:underline-offset-4" href={`https://mumbai.polygonscan.com/address/${(loanDetailInfo as any).creditLine.auctionWinner}`} target="_blank">
                                                                {shortenAddress((loanDetailInfo as any).creditLine.auctionWinner)}
                                                            </a>
                                                        }
                                                    </Descriptions.Item>
                                                    <Descriptions.Item span={3} label="Current Live Price">{Number((loanDetailInfo as any).creditLine.auctionLivePrice).toLocaleString()} USDC</Descriptions.Item>
                                                    <Descriptions.Item span={3} label="Next Smallest  Price">{(loanDetailInfo as any).creditLine.auctionLivePrice == 0 ? (interestOwe + principleOwe).toLocaleString() : (Number((loanDetailInfo as any).creditLine.auctionLivePrice) * 1.1).toLocaleString()} USDC</Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'end' }}>
                                                <div>
                                                    <InputNumber
                                                        placeholder="Input value"
                                                        value={wantBidAmount}
                                                        onChange={handleWantBidAmount}
                                                        // max={fundingLimit - juniorDeposited}
                                                        style={{ width: 200, marginTop: '10px' }}
                                                        precision={2}
                                                        min={0}
                                                        addonAfter="USDC"
                                                    />
                                                </div>
                                                <div onClick={handleBidNextSmallestLivePrice} style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <Button size="small" className="border-2 border-black rounded-lg hover:bg-sky-100" style={{ padding: '3px', marginTop: '1px', marginBottom: '20px', cursor: 'pointer', fontSize: '10px' }}>
                                                        Next Smallest Price
                                                    </Button>
                                                </div>
                                                {Math.floor(Date.now() / 1000) > Number((loanDetailInfo as any).creditLine.auctionEnd) ?
                                                    <Button loading={loadingBid} onClick={handleBid} style={{ marginLeft: '50px', marginRight: '50px', marginBottom: '25px', cursor: 'default' }} className="btn-sm border-2 border-black rounded-lg">Auction Ended</Button>
                                                    :
                                                    <Button loading={loadingBid} onClick={handleBid} style={{ marginLeft: '50px', marginRight: '50px', marginBottom: '25px', cursor: 'pointer' }} className="btn-sm border-2 border-black hover:bg-sky-100 rounded-lg">Bid</Button>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                }

                            </div>
                        )}
                    </div>


                </div>

                <div id="overview" style={{ marginBottom: '50px', padding: '0px', paddingBottom: '10px' }} className="rounded-lg bg-white shadow-2xl" >
                    <div style={{ padding: '10px', fontSize: '24px', fontWeight: 'bold' }} className="bg-sky-900 rounded-t-lg text-sky-200">Overview</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '100px', marginRight: '100px', marginTop: '30px', marginBottom: '20px' }} className="border-2 border-slate-400 rounded-lg">
                        <div>
                            <Statistic style={{ margin: '30px' }} title="Principal repaid (USDC)" value={principalAmountRepaid.toLocaleString()} precision={2} />
                            <Statistic style={{ margin: '30px' }} title="Interest repaid (USDC)" value={interestAmountRepaid.toLocaleString()} precision={2} />
                        </div>
                        <div>
                            <Statistic style={{ margin: '30px' }} title="Total repaid (USDC)" value={(interestAmountRepaid + principalAmountRepaid).toLocaleString()} precision={2} />
                            <Statistic style={{ margin: '30px' }} title="Repayment status"
                                value={
                                    Number((loanDetailInfo as any).creditLine.balance) == 0 ? "Done" : (
                                        (Number((loanDetailInfo as any).creditLine.balance) > 0 && Math.floor(Date.now() / 1000) > Number((loanDetailInfo as any).creditLine.termEndTime) + Number((loanDetailInfo as any).creditLine.paymentPeriodInDays * 60)) ? "Auction" : "On time"
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>

                <div id="document" style={{ height: 'auto', marginBottom: '50px', padding: '0px', paddingBottom: '20px' }} className="rounded-lg bg-white shadow-2xl" >
                    <div style={{ padding: '10px', fontSize: '24px', fontWeight: 'bold' }} className="bg-sky-900 rounded-t-lg text-sky-200">Legal Documents</div>

                    {links ?
                        <div style={{ marginLeft: '50px', marginRight: '50px', marginTop: '10px', marginBottom: '20px' }}>
                            <Upload
                                listType="picture"
                                defaultFileList={(links as any).map((item: any) => {
                                    return {
                                        url: item,
                                        uid: item.slice(53, 89),
                                        name: item.slice(90),
                                    }
                                })}
                                showUploadList={
                                    {
                                        showRemoveIcon: false
                                    }
                                }
                            />
                        </div>
                        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    }
                </div>

                <div id="borrower" style={{ height: 'auto', marginBottom: '50px', padding: '0px', paddingBottom: '10px' }} className="rounded-lg bg-white shadow-2xl" >
                    <div style={{ padding: '10px', fontSize: '24px', fontWeight: 'bold' }} className="bg-sky-900 rounded-t-lg text-sky-200">Borrower details</div>
                    <div style={{ margin: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'justify', lineHeight: 1.5 }}>{(loanDetailInfo as any).companyName}</div>
                    <div style={{ margin: '20px', fontSize: '14px', textAlign: 'justify', lineHeight: 1.5 }}>{(loanDetailInfo as any).companyIntro}</div>
                    <div style={{ margin: '20px', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ margin: '10px', padding: '5px' }} className="rounded-full bg-slate-300 hover:bg-slate-300">
                            <a href={`${(loanDetailInfo as any).companyPage}`} target='_blank'>
                                <div style={{ display: 'flex' }}>
                                    <LinkOutlined style={{ margin: '5px', marginTop: '3px' }} />
                                    <div>
                                        Website
                                    </div>
                                </div>
                            </a>
                        </div>
                        <div style={{ margin: '10px', padding: '5px' }} className="rounded-full bg-slate-300 hover:bg-slate-300">
                            <a href={`${(loanDetailInfo as any).companyContact}`} target='_blank'>
                                <div style={{ display: 'flex' }}>
                                    <LinkOutlined style={{ margin: '5px', marginTop: '3px' }} />
                                    <div>
                                        Contact
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                <div id="repayment" style={{ height: 'auto', marginBottom: '50px', padding: '0px', paddingBottom: '10px' }} className="rounded-lg bg-white shadow-2xl" >
                    <div style={{ padding: '10px', fontSize: '24px', fontWeight: 'bold' }} className="bg-sky-900 rounded-t-lg text-sky-200">Repayment terms</div>

                    <div className="grid grid-cols-3 border-2 border-slate-400 rounded-lg" style={{ margin: '20px' }}>
                        <Statistic style={{ margin: '30px' }} suffix="months" title="Loan terms" value={(loanDetailInfo as any).loanTerm} />
                        <Statistic style={{ margin: '30px' }} title="Term start date" value={dayjs(Number((loanDetailInfo as any).termStartTime * 1000)).format("DD/MM/YYYY HH:mm:ss").toString()} />
                        <Statistic style={{ margin: '30px' }} title="Term start date" value={dayjs(Number((loanDetailInfo as any).termEndTime * 1000)).format("DD/MM/YYYY HH:mm:ss").toString()} />
                        <Statistic style={{ margin: '30px' }} suffix="months" title="Payment Frequency" value={InterestPaymentFrequency[(loanDetailInfo as any).interestPaymentFrequency]} />
                        <Statistic style={{ margin: '30px' }} title="Repayment structure" value="Bullet" />
                        <Statistic style={{ margin: '30px' }} title="Total interest payments (USDC)" value={(juniorDeposited + seniorDeposited) / 100 * Number((loanDetailInfo as any).interestRate) / 365 * Number((loanDetailInfo as any).loanTerm) * 100} precision={2} />
                    </div>
                </div>

                <div id="history" style={{ marginBottom: '50px', padding: '0px', paddingBottom: '10px' }} className="rounded-lg bg-white shadow-2xl" >
                    <div style={{ padding: '10px', fontSize: '24px', fontWeight: 'bold' }} className="bg-sky-900 rounded-t-lg text-sky-200">Recent activity</div>
                    <div className="border-2 border-slate-400 rounded-lg" style={{ margin: '20px' }}>
                        <Table
                            columns={columns}
                            dataSource={historyTx}
                            pagination={{ pageSize: 10 }}
                            scroll={{ y: 500 }}
                        // showHeader={false}
                        />
                    </div>
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
