import { constants } from "@/commons/constants";
import AdminLandingLayout from "@/components/layouts/AdminLandingLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import { signMessage } from "@wagmi/core";
import axios from "axios";
import { useRouter } from "next/router";
// import { connect } from "@wagmi/core";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAccount, useConnect, useNetwork, useSwitchNetwork } from "wagmi";
import 'react-toastify/dist/ReactToastify.css';
import { Button } from "antd";

interface Props {
    children: ReactNode;
}

export default function AdminSignInPage() {
    const { connector, address } = useAccount();
    const { connectors, connect } = useConnect();
    const [chainId, setChainId] = useState(constants.MUMBAI_ID);
    const { chain } = useNetwork();
    const { switchNetwork } = useSwitchNetwork()
    const router = useRouter()
    const [signInFail, setSignInFail] = useState(false);

    useEffect(() => {
        connectors.map((connector) => {
            connect({ connector })
        })
        setChainId(chain?.id || constants.MUMBAI_ID)

        if (chainId != constants.MUMBAI_ID) {
            switchNetwork?.(constants.MUMBAI_ID)
        }
        if (address) {
            setSignInFail(false)
        }
    }, [chain, address])

    const handleSignIn = async () => {
        try {
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
                    chainId: chain?.id
                })

                toast.success("Login successfully");
                localStorage.setItem(constants.ACCESS_TOKEN_ADMIN, res.data.accessToken)
                // dispatch(setAccessTokenState(res.data.accessToken))

                router.push('/admin/loans/applied')
            } catch (error) {
                toast.error("Login fail");
                setSignInFail(true)
            }
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', justifyItems: 'center', alignContent: 'center', alignItems: 'center',
            marginTop: '300px'
        }}>
            <div >
                <Button onClick={handleSignIn} style={{ margin: '10px', padding: '30px', fontSize: '30px' }} className="btn-sm rounded-lg border-2 border-slate-200">
                    Sign in
                </Button>
            </div>
            {signInFail && (
                <div style={{ color: 'red' }}>
                    Wrong admin wallet, please change to admin wallet
                </div>
            )}
        </div>
    )
}

AdminSignInPage.Layout = (props: Props) => AdminLandingLayout({ children: props.children });
