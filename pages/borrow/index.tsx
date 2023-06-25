import Footer from "@/components/footer";
import Header from "@/components/header";
import Router, { useRouter } from "next/router";
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { useAccount, useContractWrite, useNetwork } from "wagmi";
import { contractAddr } from "@/commons/contractAddress";
import DobermanFactory from "../../abi/DobermanFactory.json";
import { useState, ReactNode, useEffect } from "react";
import { Anchor, Button, Col, List, Modal, Row } from 'antd';
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import PageLayout from "@/components/layouts/PageLayout";
import axios from "axios";
import { writeContract } from "@wagmi/core";

interface Props {
    children: ReactNode;
}

export default function BorrowPage() {
    const router = useRouter()
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [borrowerCreated, setBorrowerCreated] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userLoans, setUserLoans] = useState([])

    const showModal = async () => {
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        setIsModalOpen(false);
        try {
            await handleCreateBorrower();
            toast.success("Link proxy successfully")
        } catch (error) {
            console.log(error)
            toast.error("Link proxy fail")
        }
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

    const handleCreateBorrower = async () => {
        await writeContract({
            address: contractAddr.mumbai.dobermanFactory as any,
            abi: DobermanFactory,
            functionName: 'createBorrower',
            args: [address],
            chainId: chain?.id
        })
    }

    // const { write, data } = useContractWrite({
    //     address: contractAddr.mumbai.dobermanFactory as any,
    //     abi: DobermanFactory,
    //     functionName: 'createBorrower',
    //     args: [address],
    //     chainId: chain?.id,
    //     onSuccess() {
    //         toast.success("Link proxy successfully")
    //     },
    //     onError() {
    //         toast.error("Link proxy fail")
    //     }
    // })

    const getLoansByOwnerAddress = async () => {
        const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/getLoanByFilter`, {
            params: {
                address: address
            }
        })
        setUserLoans(res.data.loans)
    }

    useEffect(() => {
        getLoansByOwnerAddress();
    }, [address])


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

    const handleDetailLoanInfo = (item: any, index: any) => {
        Router.push({
            pathname: `/borrow/loans/${item.id}`,
            query: {
                ...item,
                index
            }
        })
    }

    return (
        <div style={{ height: 'calc(100vh - 64px - 30px)' }}>
            <div>
                <Row>
                    <Col span={5}></Col>
                    <Col span={14}>
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ height: '15vh', display: 'flex', alignItems: 'end', fontSize: '50px', fontWeight: 'bold' }}>Borrow</div>
                                <div className="btn-sm bg-lime-400 hover:font-bold m-16" style={{ cursor: 'pointer' }} onClick={handleApplyLoan}>Apply a new loan</div>

                            </div>
                            <Anchor
                                direction="horizontal"
                                items={[
                                    {
                                        key: 'my-loans',
                                        href: '#my-loans',
                                        title: 'My Loans'
                                    }
                                ]} />
                        </div>
                        <div style={{ margin: '10px' }}>
                        </div>
                        <div id="my-loans">
                            <List
                                itemLayout="horizontal"
                                dataSource={userLoans}
                                renderItem={(item, index) => (
                                    <List.Item
                                        style={{ cursor: 'pointer', marginTop: '12px', marginBottom: '12px' }}
                                        actions={[<div className='btn-sm bg-slate-300 text-black rounded-md hover:font-bold bg-sky-300' onClick={() => handleDetailLoanInfo(item, index + 1)}>View Detail</div>]}
                                        className='bg-white rounded-lg border-amber-300'>
                                        <List.Item.Meta
                                            avatar={index + 1 + '.'}
                                            title={(item as any).projectName}
                                            description={(item as any).projectIntro}
                                            style={{ alignItems: 'justify' }}
                                        />
                                        {(item as any).deployed ?
                                            <div className="text-lime-600" style={{ border: 'solid' }}>
                                                Deployed
                                            </div>
                                            : <div className="text-amber-300" style={{ border: 'solid' }}>
                                                Undeployed
                                            </div>}
                                    </List.Item>
                                )}
                            />
                        </div>
                        <Modal title="Link Proxy Wallet" open={isModalOpen && !borrowerCreated} onOk={handleOk} onCancel={handleCancel} okText="Link Proxy">
                            <div>Link your wallet address to a HELIX proxy wallet smart contract in order to create a loan.
                                <ul>
                                    <li>Proxy wallet will help you interact indirectly with smart contracts across all your loans and save gas fee.</li>
                                    <li>Proxy Wallet linking is a one-time transaction only.</li>
                                </ul>
                            </div>
                        </Modal>

                    </Col>
                    <Col span={5}></Col>
                </Row>



            </div>
        </div>
    )
}

BorrowPage.Layout = (props: Props) => PageLayout({ children: props.children });
