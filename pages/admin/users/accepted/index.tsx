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
import { useRouter } from "next/router";

interface Props {
    children: ReactNode;
}

export default function AdminUserAcceptedPage() {
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(constants.MUMBAI_ID);
    const { address } = useAccount()
    const [registerUsers, setRegisterUsers] = useState([])
    const router = useRouter()

    const getAcceptedUsers = async () => {
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

            const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/accepted-kyc-users', {
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
        getAcceptedUsers()
    }, [chain])

    return (
        <div>
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0, paddingBottom: '30px' }}>
                Users / Accepted
            </div>
            <List
                itemLayout="horizontal"
                dataSource={registerUsers}
                renderItem={(item, index) => (
                    <List.Item
                        style={{ cursor: 'auto', padding: '20px', paddingTop: '40px' }}
                        className="shadow-lg hover:shadow-xl rounded-lg"
                    >
                        <List.Item.Meta
                            style={{ fontSize: '20px' }}
                            className="rounded-lg"
                            avatar={index + 1 + '.'}
                            title=<div style={{ fontSize: '20px' }}>{(item as any).address}</div>
                        // description={(item as any).address}
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminUserAcceptedPage.Layout = (props: Props) => AdminLayout({ children: props.children });
