import { constants } from "@/commons/constants"
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
import { Anchor, Button, Card, Col, List, Row } from "antd";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import BigNumber from "bignumber.js";
import dayjs from "dayjs";

interface Props {
    children: ReactNode;
}

export default function AccountPage() {
    const dispatch = useDispatch();
    const router = useRouter();

    const { chain } = useNetwork()
    const { address } = useAccount()
    // const timestamp = Math.round(Date.now() / 1000)
    const [kycStatus, setKycStatus] = useState(false)
    const [kycVerifiedStatus, setKycVerifiedStatus] = useState(false)
    const [mintSignature, setMintSignature] = useState('0x')
    const [chainId, setChainId] = useState(0)
    const [userUIDBalance, setUserUIDBalance] = useState(0)
    const [accountInvestments, setAccountInvestments] = useState([])

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
      }
    `

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getAccountInvestmentInfo = async () => {
        try {
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

                Promise.all(addMetadata).then((result) => {
                    result = result.filter(item => item.companyName)
                    setAccountInvestments(result as any)
                })
            } else {
                setAccountInvestments([])
            }
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
        } catch (error) {
            console.log(error)
        }

    }

    const handleSetUpUID = async () => {
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


        // check whether KYCed or not
        const resKYCed = true;
        setKycStatus(resKYCed)

        // check whether approved by admin or not (get mint signature)
        try {
            const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/info', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res2.data != '') {
                setKycVerifiedStatus(true);
                setMintSignature(res2.data.mintSignature)
            } else {
                await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/requestMintUIDSignature', {
                    userAddr: (address as string).toLowerCase()
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }
                )
            }
        } catch (error) {
            console.log(error)
        }

    }

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
            if (res.data.id != '' && res.data.id != null) {
                setKycStatus(true)
                setKycVerifiedStatus(false)
            }
            if (res.data.mintSignature != '' && res.data.mintSignature != null) {
                setKycVerifiedStatus(true)
                setMintSignature(res.data.mintSignature)

            }
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
        setChainId(chain?.id || 0)
        if (address) {
            getUserUIDBalance()
            getAccountInvestmentInfo()
        }
        // if (isSuccess == true) {
        //     router.reload()
        // }
        getKYCInfo()
    }, [chain, address])

    return (
        <div style={{ height: 'calc(100% - 64px - 30px)' }}>
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
                                    title: 'UID and Wallet'
                                },
                                {
                                    key: 'my-investment',
                                    href: '#my-investment',
                                    title: 'My investment'
                                }
                            ]} />
                    </Col>
                    <Col span={14}>
                        <div>
                            <div style={{ height: '15vh', display: 'flex', alignItems: 'end', fontSize: '50px', fontWeight: 'bold' }}>Account</div>
                        </div>

                        <div id="uid-and-wallet">
                            <div className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>
                                UID and Wallet
                            </div>
                            {chainId != constants.MUMBAI_ID ? (
                                <div className="text-red-500">Wrong network or not connect wallet</div>
                            ) : (
                                <div>
                                    {userUIDBalance != 0 ? (
                                        <div id="uid-and-wallet" className="text-lime-500">You already own UID token</div>
                                    ) :
                                        userUIDBalance != 0 ? (
                                            <div id="uid-and-wallet">
                                                Successfully minted your UID token
                                                {/* <div>
                                                <a href={`https://sepolia.etherscan.io/tx/${data?.hash}`}>Etherscan</a>
                                            </div> */}
                                            </div>
                                        ) : (
                                            kycStatus ? (
                                                kycVerifiedStatus ?
                                                    (<div id='uid-and-wallet'>
                                                        <div className="btn-sm bg-sky-400" style={{ cursor: 'pointer' }} onClick={handleMintUIDToken}>Mint UID token</div>
                                                    </div>) : (
                                                        <div id="uid-and-wallet" className="text-lime-500">
                                                            Wait to be validated KYC info by admin
                                                        </div>
                                                    )
                                            ) : (
                                                <Button className="btn-sm bg-white rounded-lg hover:bg-amber-200 border-2 border-black" style={{ cursor: 'pointer' }} onClick={handleSetUpUID}>Begin UID setup</Button>
                                            )
                                        )
                                    }
                                </div>
                            )}
                        </div>

                        <div className='font-bold' style={{ fontSize: '20px', marginBottom: '50px', marginTop: '30px' }}>
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
                                        className='bg-amber-200 hover:bg-amber-300 border-2 border-amber-300'
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

                    </Col>
                    <Col span={5}></Col>
                </Row>
            </div>
        </div >
    )
}

AccountPage.Layout = (props: Props) => PageLayout({ children: props.children });
