import { constants } from "@/commons/constants"
import axios from "axios";
import { useEffect, useState } from "react";
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from "wagmi";
import { useDispatch, useSelector } from "react-redux";
import { setAccessTokenState, selectAccessTokenState } from "../../store/accessTokenSlice"
import { contractAddr } from "@/commons/contractAddress";
import UniqueIdentity from "../../abi/UniqueIdentity.json"
import { useRouter } from "next/router";
import Header from "@/components/header";

export default function AccountPage() {
    const dispatch = useDispatch();
    const router = useRouter();

    const { chain } = useNetwork()
    const { address } = useAccount()
    const timestamp = Math.round(Date.now() / 1000)
    const [kycStatus, setKycStatus] = useState(false)
    const [kycVerifiedStatus, setKycVerifiedStatus] = useState(false)
    const [mintSignature, setMintSignature] = useState('0x')

    const { signMessage, signMessageAsync } = useSignMessage({
        message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chain?.id,
    })

    // const {config} = usePrepareContractWrite({
    //     address: contractAddr.sepolia.uniqueIdentity as any,
    //     abi: UniqueIdentity,
    //     functionName: 'mint',
    //     args: [constants.UID_ID, constants.EXPIRES_AT, mintSignature],

    // })

    const { write, data } = useContractWrite({
        address: contractAddr.sepolia.uniqueIdentity as any,
        abi: UniqueIdentity,
        functionName: 'mint',
        args: [constants.UID_ID, constants.EXPIRES_AT, mintSignature],
        value: constants.MINT_COST as any,
        chainId: chain?.id
    })

    const { isSuccess } = useWaitForTransaction({
        confirmations: 6,
        hash: data?.hash
    })

    const { data: data2 } = useContractRead({
        address: contractAddr.sepolia.uniqueIdentity as any,
        abi: UniqueIdentity,
        functionName: 'balanceOf',
        args: [address, constants.UID_ID]
    })

    const handleSetUpUID = async () => {
        // const token = localStorage.getItem(constants.ACCESS_TOKEN);

        // if(!token) {
        // setTimestemp(Math.round(Date.now()/1000))
        const signature = await signMessageAsync()
        console.log('signature', signature);

        const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
            address,
            sign: signature,
            timestamp,
            chainId: chain?.id
        })

        localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
        // }
        dispatch(setAccessTokenState(res.data.accessToken))

        // check whether KYCed or not
        const resKYCed = true;
        setKycStatus(resKYCed)

        // check whether approved by admin or not (get mint signature)
        try {
            const res2 = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/kyc/info', {
                headers: { Authorization: `Bearer ${res.data.accessToken}` }
            })
            if (res2.data != '') {
                setKycVerifiedStatus(true);
                setMintSignature(res2.data.mintSignature)
            }
        } catch (error) {
            console.log(error)
        }

    }

    return (
        <div>
            <Header />
            <div>Account</div>
            <div>UID and Wallet</div>
            {data2 != 0 ? (
                <div>You already own UID token</div>
            ) :
                isSuccess ? (
                    <div>
                        Successfully minted your UID token
                        <div>
                            <a href={`https://sepolia.etherscan.io/tx/${data?.hash}`}>Etherscan</a>
                        </div>
                    </div>
                ) : (
                    kycStatus ? (
                        kycVerifiedStatus ?
                            (<div>
                                <button onClick={write as any}>Mint UID token</button>
                            </div>) : (
                                <div>
                                    Wait to be validate KYC info by admin
                                </div>
                            )
                    ) : (
                        <button onClick={handleSetUpUID}>Begin UID setup</button>
                    )
                )
            }

        </div>
    )
}