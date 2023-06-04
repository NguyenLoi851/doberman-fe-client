import Footer from "@/components/footer";
import Header from "@/components/header";
import { useRouter } from "next/router";
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { useAccount, useContractWrite, useNetwork } from "wagmi";
import { contractAddr } from "@/commons/contractAddress";
import DobermanFactory from "../../abi/DobermanFactory.json";
import { useState, ReactNode, useEffect } from "react";
import { Button, Modal } from 'antd';
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import PageLayout from "@/components/layouts/PageLayout";
import axios from "axios";

interface Props {
    children: ReactNode;
}

export default function BorrowPage() {
    const router = useRouter()
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [borrowerCreated, setBorrowerCreated] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = async () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
        write();
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const tokensQuery = `query BorrowerPage($userId: String!){
        borrowerContracts(where: {user: $userId}) {
          id
        }
    }`

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const { write, data } = useContractWrite({
        address: contractAddr.mumbai.dobermanFactory as any,
        abi: DobermanFactory,
        functionName: 'createBorrower',
        args: [address],
        chainId: chain?.id,
        onSuccess() {
            toast.success("Link proxy successfully")
        },
        onError() {
            toast.error("Link proxy fail")
        }
    })

    const getLoansByOwnerAddress = async () => {
        await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/')
    }

    useEffect(() => {
      
    
    }, [])
    

    const handleApplyLoan = async () => {
        const res = await client.query({
            query: gql(tokensQuery),
            variables: {
                userId: address?.toLowerCase() ?? "",
            },
        })
        console.log(res.data.borrowerContracts)
        if (res.data.borrowerContracts.length > 0) {
            try {
                await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/proxies/link-proxy', {
                    userAddress: (address as string).toLowerCase()
                })
            } catch (error) {
                console.log(error)
            }
            router.push('/borrow/apply')
        } else {
            setBorrowerCreated(false)
            showModal()
        }
    }

    return (
        <div>
            <div style={{ height: 'calc(100vh - 64px - 30px)' }}>
                <div>
                    Borrow
                </div>

                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <div>My loans</div>
                    <button onClick={handleApplyLoan}>Apply a new loan</button>
                </div>
                <Modal title="Link Proxy Wallet" open={isModalOpen && !borrowerCreated} onOk={handleOk} onCancel={handleCancel} okText="Link Proxy">
                    <div>Link your wallet address to a HELIX proxy wallet smart contract in order to create a loan.
                        <ul>
                            <li>Proxy wallet will help you interact indirectly with smart contracts across all your loans and save gas fee.</li>
                            <li>Proxy Wallet linking is a one-time transaction only.</li>
                        </ul>
                    </div>
                </Modal>
            </div>
        </div>
    )
}

BorrowPage.Layout = (props: Props) => PageLayout({ children: props.children });
