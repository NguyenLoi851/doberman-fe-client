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
import { Descriptions, Upload } from "antd";
import dayjs from "dayjs";

interface Props {
    children: ReactNode;
}

const InterestPaymentFrequency = [1, 3, 6, 12]

export default function DeployedLoanDetailPage() {
    const router = useRouter()
    const props = router.query
    const [borrowerProxy, setBorrowerProxy] = useState(zeroAddress)
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [chainId, setChainId] = useState(0);
    const dateFormat = "DD/MM/YYYY HH:mm:ss";
    const [link, setLink] = useState('')

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
        try {
            const res = await client.query({
                query: gql(tokensQuery),
                variables: {
                    userId: (props.ownerAddress as any).toLowerCase() ?? "",
                },
            })
            if (res.data.borrowerContracts.length > 0) {
                setBorrowerProxy(res.data.borrowerContracts[0].id)
            }
        } catch (error) {
            console.log(error)
        }

    }

    useEffect(() => {
        if (address == null) {
            router.push('/admin')
        }
        getBorrowerProxy()
        setChainId(chain?.id || 80001)
        if (props.fileKey) {
            setLink(process.env.NEXT_PUBLIC_S3_BASE_URL as any + props.fileKey)
        }
    }, [chain, props])

    return (
        <div style={{ padding: '20px' }}>
            <Descriptions title="Loan Detail Page" layout="vertical" bordered>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Project Name">{props.projectName}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Company Name" span={2}>{props.companyName}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Project Intro" span={3}>{props.projectIntro}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Company Intro" span={3}>{props.companyIntro}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Company Webpage">{props.companyPage}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Company Contact" span={2}>{props.companyContact}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Junior Fee Percent">{props.juniorFeePercent} %</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Interest Payment Frequency">{InterestPaymentFrequency[props.interestPaymentFrequency as any]} months</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Interest Rate">{props.interestRate} %</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Loan Term">{props.loanTerm} months</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Target Funding">$ {props.targetFunding?.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Fundable At">{dayjs(dayjs.unix(Number(props.fundableAt)), dateFormat).toString()}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Borrower Proxy">{borrowerProxy != zeroAddress ? borrowerProxy : 'Not existed'}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Owner Address">{props.ownerAddress}</Descriptions.Item>
                <Descriptions.Item style={{ fontSize: '18px' }} label="Legal Documents">
                    {/* {process.env.NEXT_PUBLIC_S3_BASE_URL as any + props.fileKey} */}
                    {link && <Upload
                        defaultFileList={[{
                            url: link,
                            uid: link.slice(53, 89),
                            name: link.slice(90),
                        }]}
                        showUploadList={
                            {
                                showRemoveIcon: false
                            }
                        }
                    />}
                </Descriptions.Item>
            </Descriptions>
        </div>
    )
}

DeployedLoanDetailPage.Layout = (props: Props) => AdminLayout({ children: props.children });
