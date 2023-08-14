import { constants } from "@/commons/constants";
import AdminLayout from "@/components/layouts/AdminLayout";
import axios from "axios";
import jwtDecode from "jwt-decode";
import { ReactNode, useEffect, useState } from "react";
import { signMessage, waitForTransaction, writeContract } from "@wagmi/core";
import { useAccount, useNetwork } from "wagmi";
import { Button, List } from "antd";
import { encodePacked, keccak256, hexToBytes } from "viem";
import { contractAddr } from "@/commons/contractAddress";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { shortenAddress } from "@/components/shortenAddress";
import { buildMintUIDAllowanceSignature, Domain } from "@/commons/functions";

interface Props {
    children: ReactNode;
}

export default function AdminUserRegisterPage() {
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(constants.MUMBAI_ID);
    const { address } = useAccount()
    const [registerUsers, setRegisterUsers] = useState([])
    const router = useRouter()

    const getRegisterUsers = async () => {
        try {
            let token = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN);
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }

            if (!token || exp < (Date.now() / 1000) || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                console.log('signature', signature);
                try {
                    const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/admin-signin', {
                        address: (address as string).toLowerCase(),
                        sign: signature,
                        timestamp,
                        chainId: chainId
                    })

                    // toast.success("Login successfully");
                    localStorage.setItem(constants.ACCESS_TOKEN_ADMIN, res.data.accessToken)
                    // dispatch(setAccessTokenState(res.data.accessToken))
                    token = res.data.accessToken
                } catch (error) {
                    console.log(error)
                }
            }

            const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/register-users', {
                headers: { Authorization: `Bearer ${token}` }
            })

            setRegisterUsers(res2.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (address == null) {
            router.push('/admin')
        }
        setChainId(chain?.id || constants.MUMBAI_ID)
        getRegisterUsers()
    }, [chain])

    const domain: Domain = {
        version: '1',
        name: "Unique Identity",
        chainId: chainId,
        verifyingContract: contractAddr.mumbai.uniqueIdentity as any
    }

    const handleSignForMintUIDToken = async (item: any) => {
        try {
            // const msgHash = keccak256(encodePacked(
            //     ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
            //     [item.address, BigInt(constants.UID_ID), BigInt(constants.EXPIRES_AT), contractAddr.mumbai.uniqueIdentity as any, BigInt(0), BigInt(chainId)]
            // ))

            // const mintSignature = await signMessage({ message: hexToBytes(msgHash) as any });

            const mintSignature = await buildMintUIDAllowanceSignature({ ...domain }, item.address, BigInt(constants.UID_ID), BigInt(constants.EXPIRES_AT), BigInt(0))

            let token = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN);
            const { exp, address: jwtAddress } = jwtDecode(token as any) as any

            if (!token || exp < (Date.now() / 1000) || (address as any).toLowerCase() != jwtAddress.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                console.log('signature', signature);
                try {
                    const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/admin-signin', {
                        address: (address as string).toLowerCase(),
                        sign: signature,
                        timestamp,
                        chainId: chainId
                    })

                    // toast.success("Login successfully");
                    localStorage.setItem(constants.ACCESS_TOKEN_ADMIN, res.data.accessToken)
                    // dispatch(setAccessTokenState(res.data.accessToken))
                    token = res.data.accessToken
                } catch (error) {
                    console.log(error)
                    token = ""
                }
            }

            await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/insertMintUIDSignature', {
                userAddr: item.address.toLowerCase(),
                mintSignature,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success("Update signature successfully")
        } catch (error) {
            console.log(error)
            toast.error("Fail to accept")
        }

    }

    return (
        <div>
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0, paddingBottom: '30px' }}>
                Users / Register
            </div>
            <List
                itemLayout="horizontal"
                dataSource={registerUsers}
                renderItem={(item, index) => (
                    <List.Item
                        style={{ cursor: 'auto', margin: '30px' }}
                        actions={[
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Button style={{ fontSize: '18px', margin: '10px' }} ><a href={`https://cockpit.sumsub.com/checkus#/applicant/${(item as any).kycId}/basicInfo?clientId=${process.env.NEXT_PUBLIC_S3_CLIENT_ID}`} target='_blank'>Check KYC info</a></Button>
                                <Button style={{ fontSize: '18px', margin: '10px' }} onClick={() => handleSignForMintUIDToken(item)}>Accept</Button>
                            </div>
                        ]}
                    >
                        <List.Item.Meta
                            style={{ fontSize: '20px' }}
                            avatar={index + 1 + '.'}
                            title=<div style={{ fontSize: '20px' }} className="hover:underline hover:underline-offset-2"><a href={`https://mumbai.polygonscan.com/address/${(item as any).address}`}>{shortenAddress((item as any).address)}</a></div>
                        // description={(item as any).address}
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminUserRegisterPage.Layout = (props: Props) => AdminLayout({ children: props.children });
