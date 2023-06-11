import { constants } from "@/commons/constants";
import AdminLayout from "@/components/layouts/AdminLayout";
import axios from "axios";
import jwtDecode from "jwt-decode";
import { ReactNode, useEffect, useState } from "react";
import { signMessage, waitForTransaction, writeContract } from "@wagmi/core";
import { useAccount, useNetwork } from "wagmi";
import { List } from "antd";
import { encodePacked, keccak256, hexToBytes } from "viem";
import { contractAddr } from "@/commons/contractAddress";
import { toast } from "react-toastify";

interface Props {
    children: ReactNode;
}

export default function AdminUserRegisterPage() {
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);
    const { address } = useAccount()
    const [registerUsers, setRegisterUsers] = useState([])

    const getRegisterUsers = async () => {
        try {
            let token = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN);
            const { exp, address: jwtAddress } = jwtDecode(token as any) as any

            console.log("address", address, jwtAddress)
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

            console.log(res2);
            setRegisterUsers(res2.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        setChainId(chain?.id || 80001)
        getRegisterUsers()
    }, [chain])

    const handleSignForMintUIDToken = async (item: any) => {
        try {
            const msgHash = keccak256(encodePacked(
                ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
                [item.address, BigInt(constants.UID_ID), BigInt(constants.EXPIRES_AT), contractAddr.mumbai.uniqueIdentity as any, BigInt(0), BigInt(chainId)]
            ))

            const mintSignature = await signMessage({ message: hexToBytes(msgHash) as any });

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
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0 }}>
                Users / Register
            </div>
            <List
                itemLayout="horizontal"
                dataSource={registerUsers}
                renderItem={(item, index) => (
                    <List.Item
                        style={{ cursor: 'pointer', margin: '24px' }}
                        actions={[<button onClick={() => handleSignForMintUIDToken(item)}>Accept</button>]}
                    >
                        <List.Item.Meta
                            avatar={index + 1 + '.'}
                            title={(item as any).address}
                        // description={(item as any).address}
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminUserRegisterPage.Layout = (props: Props) => AdminLayout({ children: props.children });
