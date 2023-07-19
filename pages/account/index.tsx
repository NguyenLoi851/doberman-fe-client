import { constants, KycStatus } from "@/commons/constants"
import axios from "axios";
import { useEffect, useState, ReactNode } from "react";
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from "wagmi";
import { useDispatch, useSelector } from "react-redux";
import { setAccessTokenState, selectAccessTokenState } from "../../store/accessTokenSlice"
import { contractAddr } from "@/commons/contractAddress";
import UniqueIdentity from "../../abi/UniqueIdentity.json"
import Router, { useRouter } from "next/router";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { toast } from "react-toastify";
import PageLayout from "@/components/layouts/PageLayout";
import { readContract, signMessage, writeContract, waitForTransaction } from '@wagmi/core'
import jwtDecode from "jwt-decode";
import { Anchor, Button, Card, Col, Empty, List, Modal, Row, Steps, Table } from "antd";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import BigNumber from "bignumber.js";
import dayjs from "dayjs";
import { ColumnsType } from "antd/es/table";
import { shortenAddress } from "@/components/shortenAddress";
import { MonitorOutlined } from '@ant-design/icons';
import SumsubWebSdk from '@sumsub/websdk-react'

interface Props {
    children: ReactNode;
}

export default function AccountPage() {
    const dispatch = useDispatch();
    const router = useRouter();

    const { chain } = useNetwork()
    const { address } = useAccount()
    // const timestamp = Math.round(Date.now() / 1000)
    const [kycStatus, setKycStatus] = useState(KycStatus.INIT)
    const [mintSignature, setMintSignature] = useState('0x')
    const [chainId, setChainId] = useState(constants.MUMBAI_ID)
    const [userUIDBalance, setUserUIDBalance] = useState(0)
    const [accountInvestments, setAccountInvestments] = useState([])
    const [historyTx, setHistoryTx] = useState([])
    const [kycAccessToken, setKycAccessToken] = useState('')
    const [showKycModal, setShowKycModal] = useState(false)
    const [currAction, setCurrAction] = useState(0)
    const [addressClient, setAddressClient] = useState('0x')

    const handleOk = async () => {
        setShowKycModal(false);
    };

    const handleCancel = () => {
        setShowKycModal(false);
    };

    const tokenDetailLoanQuery = `
    query AccountInvesment($userId: String!) {
        user(id: $userId) {
          poolTokens(orderBy: mintedAt, orderDirection: desc) {
            id
            principalAmount
            loan {
              txHash
              address
              juniorDeposited
              seniorDeposited
            }
          }
        }
        transactions(orderBy: timestamp, orderDirection: desc, where: {user: $userId}) {
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
            id
            user {
              id
            }
            loan {
                address
            }
        }
    }`

    const ActionPresentation = {
        TRANCHED_POOL_REPAYMENT: "Repays",
        SENIOR_POOL_REDEMPTION: "Senior redeem",
        TRANCHED_POOL_DRAWDOWN: "Drawdowns",
        SENIOR_POOL_WITHDRAWAL: "Withdraws",
        SENIOR_POOL_DEPOSIT: "Deposits",
        TRANCHED_POOL_DEPOSIT: "Deposits",
        TRANCHED_POOL_WITHDRAWAL: "Withdraws",
        BID: "Bids",
    }

    interface DataType {
        key: React.Key;
        pool: ReactNode;
        action: string;
        amount: string;
        timestamp: string;
        tx: ReactNode;
    }

    const columns: ColumnsType<DataType> = [
        {
            title: 'Pool',
            dataIndex: 'pool',
            width: 150,
        },
        {
            title: 'Action',
            dataIndex: 'action',
            width: 200,
            filters: [
                {
                    text: 'Withdraws',
                    value: 'Withdraws'
                },
                {
                    text: 'Deposits',
                    value: 'Deposits'
                }
            ],
            onFilter: (value: any, record) => record.action.indexOf(value) === 0,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            width: 250,
            sorter: (a, b) => Number(a.amount.slice(2).replace(/\D/g, '')) - Number(b.amount.slice(2).replace(/\D/g, '')),
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

    const getAccountInvestmentInfo = async () => {
        try {
            let totalResult: any[];
            const res = await client.query({
                query: gql(tokenDetailLoanQuery),
                variables: {
                    userId: (address as any).toLowerCase()
                }
            })
            if (res.data && res.data.user && res.data.user.poolTokens && res.data.user.poolTokens.length > 0) {
                const addMetadata = res.data.user.poolTokens.map(async (item: any) => {
                    const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/getLoanByFilter', {
                        params: {
                            txHash: item.loan.txHash
                        }
                    })

                    return {
                        principalAmount: item.principalAmount,
                        ...item.loan,
                        ...res2.data
                    };
                })

                await Promise.all(addMetadata).then((result) => {
                    totalResult = result.filter(item => item.companyName)
                    setAccountInvestments(totalResult as any)
                })
            } else {
                setAccountInvestments([])
            }

            const txData: DataType[] = []
            res.data.transactions.map((item: any) => {
                let poolDetail
                if (item.loan != null && totalResult) {
                    poolDetail = (totalResult).filter(pool => (pool as any).address.toLowerCase() == item.loan.address)
                    if (poolDetail.length > 0) {
                        poolDetail = poolDetail[0]
                    }
                }

                let amount = '$ ';
                if (item.category == 'SENIOR_POOL_DEPOSIT') {
                    amount = '$ ' + Number(BigNumber(item.sentAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()
                } else if (item.category == 'SENIOR_POOL_WITHDRAWAL') {
                    amount = '$ ' + Number(BigNumber(item.receivedAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()
                } else {
                    amount = '$ ' + Number(BigNumber(item.receivedAmount || item.sentAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()
                }
                txData.push({
                    key: item.id,
                    pool: item.loan == null ? <div style={{ cursor: 'pointer' }} className="hover:underline hover:text-sky-500 underline-offset-4" onClick={() => router.push('/earn/senior')}>Senior Pool</div> : <div style={{ cursor: 'pointer' }} className="hover:underline hover:text-sky-500 underline-offset-4" onClick={() => router.push(`/earn/${item.loan.address}`)}>{(poolDetail as any).projectName}</div>,
                    action: (ActionPresentation as any)[item.category as any],
                    amount,
                    timestamp: dayjs(Number(item.timestamp) * 1000).format('DD/MM/YYYY HH:mm:ss'),
                    tx: <div><MonitorOutlined style={{ padding: '5px' }} /><a href={`https://mumbai.polygonscan.com/tx/${item.transactionHash}`} target='_blank' className="underline underline-offset-2">Tx</a></div>,
                })
            })
            setHistoryTx(txData as any)
        } catch (error) {
            console.log(error)
        }
    }

    const handleMintUIDToken = async () => {
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.uniqueIdentity as any,
                abi: UniqueIdentity,
                functionName: 'mint',
                args: [constants.UID_ID, constants.EXPIRES_AT, mintSignature],
                value: constants.MINT_COST as any,
                chainId: chainId,
            })

            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })
            if (status == 'success') {
                toast.success("Mint UID token successfully")
            }
            if (status == 'reverted') {
                toast.error("Mint UID token fail")
            }
            await getKYCInfo()
        } catch (error) {
            console.log(error)
            try {
                if (JSON.parse(JSON.stringify(error)).cause.details.includes('insufficient funds')) {
                    toast.error("You do not have enough MATIC token")
                }
            } catch (error2) {
                console.log(error2)
            }

        }
    }

    const getUserUIDBalance = async () => {
        try {
            const data2: any = await readContract({
                address: contractAddr.mumbai.uniqueIdentity as any,
                abi: UniqueIdentity,
                functionName: 'balanceOf',
                args: [address, constants.UID_ID]
            })
            setUserUIDBalance(data2)
            if (data2 == 1) {
                setCurrAction(2)
            }
        } catch (error) {
            console.log(error)
        }

    }

    const handleVerifyKycInformation = async () => {
        let token = localStorage.getItem(constants.ACCESS_TOKEN);
        try {
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }
            if (!token || exp < Date.now() / 1000 || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                console.log('signature', signature);

                const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
                    address: (address as string).toLowerCase(),
                    sign: signature,
                    timestamp,
                    chainId: chainId
                })

                localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
                // dispatch(setAccessTokenState(res.data.accessToken))
                token = localStorage.getItem(constants.ACCESS_TOKEN);
            }
        } catch (error) {
            console.log(error)
            return;
        }

        await requestKycSumSubAccessToken()
        setShowKycModal(true)
        // // check whether KYCed or not
        // const resKYCed = true;
        // setKycStatus(resKYCed)

        // // check whether approved by admin or not (get mint signature)
        // try {
        //     const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/info', {
        //         headers: { Authorization: `Bearer ${token}` }
        //     })
        //     if (res2.data != '') {
        //         setKycVerifiedStatus(true);
        //         setMintSignature(res2.data.mintSignature)
        //     } else {
        //         await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/requestMintUIDSignature', {
        //             userAddr: (address as string).toLowerCase()
        //         }, {
        //             headers: { Authorization: `Bearer ${token}` }
        //         }
        //         )
        //     }
        // } catch (error) {
        //     console.log(error)
        // }

    }

    // const handleRequestMintUID = async () => {
    //     let token = localStorage.getItem(constants.ACCESS_TOKEN);
    //     try {
    //         let exp;
    //         let jwtAddress;
    //         if (token) {
    //             const decode = jwtDecode(token as any) as any
    //             exp = decode.exp
    //             jwtAddress = decode.address
    //         }
    //         if (!token || exp < Date.now() / 1000 || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
    //             // sign again
    //             const timestamp = Math.round(Date.now() / 1000)
    //             const signature = await signMessage({
    //                 message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
    //             })
    //             console.log('signature', signature);

    //             const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
    //                 address: (address as string).toLowerCase(),
    //                 sign: signature,
    //                 timestamp,
    //                 chainId: chainId
    //             })

    //             localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
    //             // dispatch(setAccessTokenState(res.data.accessToken))
    //             token = localStorage.getItem(constants.ACCESS_TOKEN);
    //         }
    //     } catch (error) {
    //         console.log(error)
    //         return;
    //     }

    //     try {
    //         await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/requestMintUIDSignature', {
    //             userAddr: (address as string).toLowerCase()
    //         }, {
    //             headers: { Authorization: `Bearer ${token}` }
    //         })
    //     } catch (error) {
    //         console.log(error)
    //     }
    // }

    const getKYCInfo = async () => {
        let token = localStorage.getItem(constants.ACCESS_TOKEN);
        try {
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }
            if (!token || exp < Date.now() / 1000 || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                console.log('signature', signature);

                const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
                    address: (address as string).toLowerCase(),
                    sign: signature,
                    timestamp,
                    chainId: chainId
                })

                localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
                // dispatch(setAccessTokenState(res.data.accessToken))
                token = localStorage.getItem(constants.ACCESS_TOKEN);
            }
        } catch (error) {
            console.log(error)
            return;
        }
        try {
            const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/info', {
                headers: { Authorization: `Bearer ${token}` }
            })
            console.log("349", res)
            if (!res.data || res.data == '') {
                setKycStatus(KycStatus.INIT)
                setCurrAction(currAction == 2 ? 2 : 0)
            } else if (res.data.kycStatus == "completed") {
                setKycStatus(KycStatus.SUCCESS)
                setCurrAction(currAction == 2 ? 2 : 1)
                if (res.data.mintSignature != '' && res.data.mintSignature != null) {
                    setMintSignature(res.data.mintSignature)
                    setCurrAction(currAction == 2 ? 2 : 1)
                }
            }
            // if (res.data.id != '' && res.data.id != null) {
            // }
            // if (res.data.mintSignature != '' && res.data.mintSignature != null) {
            //     setMintSignature(res.data.mintSignature)
            // }
        } catch (error) {
            console.log(error)
        }

    }

    const handleDetailLoanInfo = async (item: any) => {
        Router.push({
            pathname: `/earn/${item.address}`,
            query: {
                ...item
            }
        })
    }

    useEffect(() => {
        setChainId(chain?.id || constants.MUMBAI_ID)
        if (address) {
            getAccountInvestmentInfo()
            getKYCInfo()
            getUserUIDBalance()
            setAddressClient(address)
        }
        // if (isSuccess == true) {
        //     router.reload()
        // }

    }, [chain, address])

    const requestKycSumSubAccessToken = async () => {
        let token = localStorage.getItem(constants.ACCESS_TOKEN);
        try {
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }
            if (!token || exp < Date.now() / 1000 || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                console.log('signature', signature);

                const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
                    address: (address as string).toLowerCase(),
                    sign: signature,
                    timestamp,
                    chainId: chainId
                })

                localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
                // dispatch(setAccessTokenState(res.data.accessToken))
                token = localStorage.getItem(constants.ACCESS_TOKEN);
            }
        } catch (error) {
            console.log(error)
            return;
        }
        try {
            const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/requestKyc', {
                headers: { Authorization: `Bearer ${token}` }
            })
            console.log("422 res", res)
            setKycAccessToken(res.data.token)
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div>
            <div>
                <Row>
                    <Col span={1}>
                    </Col>
                    <Col span={4}>
                        <Anchor
                            bounds={100}

                            items={[
                                {
                                    key: 'uid-and-wallet',
                                    href: '#uid-and-wallet',
                                    title: 'UID and Wallet',
                                    className: "hover:font-bold my-4",
                                },
                                {
                                    key: 'my-investment',
                                    href: '#my-investment',
                                    title: 'My investment',
                                    className: "hover:font-bold my-4",
                                },
                                {
                                    key: 'my-activities',
                                    href: '#my-activities',
                                    title: 'My activities',
                                    className: "hover:font-bold my-4",
                                },
                            ]} />
                    </Col>
                    <Col span={14}>
                        {kycAccessToken && <Modal open={showKycModal} onOk={handleOk} onCancel={handleCancel} okText={<div className="text-black hover:text-white">OK</div>}>
                            <SumsubWebSdk
                                accessToken={kycAccessToken}
                                expirationHandler={() => Promise.resolve(kycAccessToken)}
                                config={{
                                    lang: 'en',
                                }}
                                options={{ addViewportTag: false, adaptIframeHeight: true }}
                                onMessage={(data: any, payload: any) => console.log('onMessage', data, payload)}
                                onError={(data: any) => console.log('onError', data)}
                            />
                        </Modal>
                        }
                        <div>
                            <div style={{ height: '15vh', display: 'flex', alignItems: 'end', fontSize: '50px', fontWeight: 'bold' }}>Account</div>
                        </div>

                        <div id="uid-and-wallet">
                            <div className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>
                                UID and Wallet
                            </div>
                            {chainId != constants.MUMBAI_ID || addressClient == '0x' ? (
                                <div className="text-red-500">Wrong network or not connect wallet</div>
                            ) : (
                                // old logic
                                // <div>
                                //     {userUIDBalance != 0 ? (
                                //         <div id="uid-and-wallet" className="text-lime-500">You already own UID token</div>
                                //     ) :
                                //         userUIDBalance != 0 ? (
                                //             <div id="uid-and-wallet">
                                //                 Successfully minted your UID token
                                //                 {/* <div>
                                //                 <a href={`https://sepolia.etherscan.io/tx/${data?.hash}`}>Etherscan</a>
                                //             </div> */}
                                //             </div>
                                //         ) : (
                                //             kycStatus ? (
                                //                 kycVerifiedStatus ?
                                //                     (<div id='uid-and-wallet'>
                                //                         <div className="btn-sm bg-sky-400" style={{ cursor: 'pointer' }} onClick={handleMintUIDToken}>Mint UID token</div>
                                //                     </div>) : (
                                //                         <div id="uid-and-wallet" className="text-lime-500">
                                //                             Wait to be validated KYC info by admin
                                //                         </div>
                                //                     )
                                //             ) : (
                                //                 <Button className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" style={{ cursor: 'pointer' }} onClick={handleSetUpUID}>Begin UID setup</Button>
                                //             )
                                //         )
                                //     }
                                // </div>

                                // new logic
                                // <div>
                                //     {userUIDBalance != 0 ? (
                                //         <div id="uid-and-wallet" className="text-lime-500">You already own UID token</div>
                                //     ) : (kycStatus == KycStatus.INIT ? (
                                //         <div>
                                //             <Button className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" style={{ cursor: 'pointer' }} onClick={handleSetUpUID}>Begin UID setup</Button>
                                //         </div>
                                //     ) : (
                                //         <div>Processing</div>
                                //     ))
                                //     }
                                // </div>

                                <div>
                                    <Steps
                                        direction="vertical"
                                        current={userUIDBalance == 1 ? 2 : currAction}
                                        items={[
                                            {
                                                title: <div>Verify KYC information</div>,
                                                description: <Button disabled={currAction != 0} className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" onClick={handleVerifyKycInformation}>KYC off-chain information</Button>,
                                            },
                                            // {
                                            //     title: <div>Request Mint Unique Identity token</div>,
                                            //     description: <Button disabled={currAction != 1} className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" onClick={handleRequestMintUID}>Request Mint NFT</Button>,
                                            // },
                                            {
                                                title: <div>Mint Unique Identity token</div>,
                                                description: <Button disabled={userUIDBalance == 1 || currAction != 1 || mintSignature == '0x'} className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" onClick={handleMintUIDToken}>Mint NFT</Button>,
                                            },
                                        ]}
                                    />
                                </div>
                            )}
                        </div>

                        <div id="my-investment" className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>
                            My invested pool tokens
                        </div>

                        <List
                            itemLayout="horizontal"
                            grid={{ gutter: 16, column: 3 }}
                            dataSource={accountInvestments}
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
                                        className='hover:bg-amber-300 border-2 border-amber-300 shadow-lg hover:shadow-2xl'
                                        onClick={() => handleDetailLoanInfo(item)}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <div>
                                                Invested Amount:
                                            </div>
                                            <div style={{ fontWeight: 'bold' }}>
                                                $ {Number(BigNumber((item as any).juniorDeposited).plus(BigNumber((item as any).seniorDeposited)).div(BigNumber(constants.ONE_MILLION))).toLocaleString()}
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

                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <div>
                                                My Invested:
                                            </div>
                                            <div style={{ fontWeight: 'bold' }}>
                                                $ {Number(BigNumber((item as any).principalAmount).div(BigNumber(constants.ONE_MILLION))).toLocaleString()}
                                            </div>
                                        </div>
                                    </Card>
                                </List.Item>
                            )}
                        />

                        <div id="my-activities" className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>
                            My activities
                        </div>
                        {historyTx.length > 0 ? <Table
                            columns={columns}
                            dataSource={historyTx}
                            pagination={{ pageSize: 10 }}
                            scroll={{ y: 500 }}
                            className="rounded-lg border-2 border-slate-300 shadow-2xl"
                        // showHeader={false}
                        /> :
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }


                    </Col>
                    <Col span={5}></Col>
                </Row>
            </div>
        </div >
    )
}

AccountPage.Layout = (props: Props) => PageLayout({ children: props.children });
