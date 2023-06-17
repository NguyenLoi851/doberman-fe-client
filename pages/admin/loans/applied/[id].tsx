import AdminLayout from "@/components/layouts/AdminLayout";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { signMessage, waitForTransaction, writeContract } from "@wagmi/core";
import axios from "axios";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { zeroAddress } from "viem";
import DobermanFactory from "@/abi/DobermanFactory.json";
import { contractAddr } from "@/commons/contractAddress";
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import { constants } from "@/commons/constants";
import { useAccount, useNetwork } from "wagmi";
import jwtDecode from "jwt-decode";

interface Props {
    children: ReactNode;
}

export default function AppliedLoanDetailPage() {
    const router = useRouter()
    const props = router.query
    const [borrowerProxy, setBorrowerProxy] = useState(zeroAddress)
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);

    const tokensQuery = `query BorrowerPage($userId: String!){
        borrowerContracts(where: {user: $userId}) {
          id
        }
    }`

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getBorrowerProxy = async () => {
        if (!props.ownerAddress) {
            return;
        }
        const res = await client.query({
            query: gql(tokensQuery),
            variables: {
                userId: (props.ownerAddress as any).toLowerCase() ?? "",
            },
        })
        if (res.data.borrowerContracts.length > 0) {
            setBorrowerProxy(res.data.borrowerContracts[0].id)
        }
    }

    useEffect(() => {
        getBorrowerProxy()
        setChainId(chain?.id || 80001)
    }, [chain, props])

    const handleDeploy = async () => {
        try {
            const { hash } = await writeContract({
                abi: DobermanFactory,
                address: contractAddr.mumbai.dobermanFactory as any,
                functionName: 'createPool',
                args: [
                    borrowerProxy,
                    BigNumber(props.juniorFeePercent as any),
                    BigNumber(props.targetFunding as any).multipliedBy(BigNumber(10).pow(6)),
                    BigNumber(props.interestRate as any).multipliedBy(BigNumber(10).pow(18)).dividedBy(100),
                    BigNumber(props.interestPaymentFrequency as any),
                    BigNumber(props.loanTerm as any),
                    BigNumber(0),
                    BigNumber(0),
                    BigNumber(props.fundableAt as any),
                    [0, 1],
                ]
            })

            const { status } = await waitForTransaction({
                confirmations: 6,
                hash: hash
            })

            if (status == 'success') {
                let token = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN);
                let exp;
                let jwtAddress;
                if (token) {
                    const decode = jwtDecode(token as any) as any
                    exp = decode.exp
                    jwtAddress = decode.address
                }
                if (!token || exp < (Date.now() / 1000)) {
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

                await axios.put(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/deploy/${props.id}`, {
                    txHash: hash
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                router.push('/admin/loans/applied')
            }
        } catch (error) {
            // toast.error("Deploy process fail")
            console.log(error)
            // console.log(JSON.stringify(error,2,2))
            console.log((error as any).shortMessage)
            alert((error as any).shortMessage)
        }



    }

    return (
        <div>
            Loan Detail Page
            <div>projectName {props.projectName}</div>
            <div>projectIntro {props.projectIntro}</div>
            <div>companyName {props.companyName}</div>
            <div>companyIntro {props.companyIntro}</div>
            <div>companyPage {props.companyPage}</div>
            <div>companyContact {props.companyContact}</div>
            <div>ownerAddress {props.ownerAddress}</div>
            <div>juniorFeePercent {props.juniorFeePercent}</div>
            <div>interestPaymentFrequency {props.interestPaymentFrequency}</div>
            <div>interestRate {props.interestRate}</div>
            <div>loanTerm {props.loanTerm}</div>
            <div>targetFunding {props.targetFunding}</div>
            <div>fundableAt {props.fundableAt}</div>
            <div>Borrower Proxy {borrowerProxy != zeroAddress ? borrowerProxy : 'Not existed'}</div>
            <button onClick={handleDeploy}>Deploy Loan</button>
        </div>
    )
}

AppliedLoanDetailPage.Layout = (props: Props) => AdminLayout({ children: props.children });
