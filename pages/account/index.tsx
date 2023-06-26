import { constants } from "@/commons/constants"
import axios from "axios";
import { useEffect, useState, ReactNode } from "react";
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from "wagmi";
import { useDispatch, useSelector } from "react-redux";
import { setAccessTokenState, selectAccessTokenState } from "../../store/accessTokenSlice"
import { contractAddr } from "@/commons/contractAddress";
import UniqueIdentity from "../../abi/UniqueIdentity.json"
import { useRouter } from "next/router";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { toast } from "react-toastify";
import PageLayout from "@/components/layouts/PageLayout";
import { readContract, signMessage, writeContract, waitForTransaction } from '@wagmi/core'
import jwtDecode from "jwt-decode";
import { Anchor, Col, Row } from "antd";

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

    // const { signMessage, signMessageAsync } = useSignMessage({
    //     message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chain?.id,
    // })

    // const { write, data } = useContractWrite({
    //     address: contractAddr.mumbai.uniqueIdentity as any,
    //     abi: UniqueIdentity,
    //     functionName: 'mint',
    //     args: [constants.UID_ID, constants.EXPIRES_AT, mintSignature],
    //     value: constants.MINT_COST as any,
    //     chainId: chainId,
    //     onSuccess() {
    //     },
    //     onError() {
    //     }
    // })

    // const { isSuccess } = useWaitForTransaction({
    //     confirmations: 6,
    //     hash: data?.hash
    // })

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
                confirmations: 6,
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
        const data2: any = await readContract({
            address: contractAddr.mumbai.uniqueIdentity as any,
            abi: UniqueIdentity,
            functionName: 'balanceOf',
            args: [address, constants.UID_ID]
        })
        setUserUIDBalance(data2)
    }


    // const { data: data2 } = useContractRead({
    //     address: contractAddr.mumbai.uniqueIdentity as any,
    //     abi: UniqueIdentity,
    //     functionName: 'balanceOf',
    //     args: [address, constants.UID_ID]
    // })

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

    useEffect(() => {
        setChainId(chain?.id || 0)
        if (address) {
            getUserUIDBalance()
        }
        // if (isSuccess == true) {
        //     router.reload()
        // }
        getKYCInfo()
    }, [chain, address])

    return (
        <div style={{ height: 'calc(100vh - 64px - 30px)' }}>
            <div>
                <Row>
                    <Col span={5}></Col>
                    <Col span={14}>
                        <div>
                            <div style={{ height: '15vh', display: 'flex', alignItems: 'end', fontSize: '50px', fontWeight: 'bold' }}>Account</div>
                            <Anchor
                                direction="horizontal"
                                items={[
                                    {
                                        key: 'uid-and-wallet',
                                        href: '#uid-and-wallet',
                                        title: 'UID and Wallet'
                                    }
                                ]} />
                        </div>
                        <div style={{ margin: '10px' }}>

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
                                            <div className="btn-sm bg-white hover:font-bold" style={{ cursor: 'pointer' }} onClick={handleSetUpUID}>Begin UID setup</div>
                                        )
                                    )
                                }
                            </div>
                        )}
                    </Col>
                    <Col span={5}></Col>
                </Row>
            </div>
        </div >
    )
}

AccountPage.Layout = (props: Props) => PageLayout({ children: props.children });
