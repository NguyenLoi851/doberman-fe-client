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

export default function DeployedLoanDetailPage() {
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
        if(!props.ownerAddress){
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
        </div>
    )
}

DeployedLoanDetailPage.Layout = (props: Props) => AdminLayout({ children: props.children });
