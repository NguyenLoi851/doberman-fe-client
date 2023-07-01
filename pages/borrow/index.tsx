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
import { writeContract, waitForTransaction } from "@wagmi/core";
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

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
    const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
    const [linkProxyLoading, setLinkProxyLoading] = useState(false)

    const showModal = async () => {
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        try {
            await handleCreateBorrower();
        } catch (error) {
            console.log(error)
        }
        setIsModalOpen(false);
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
        setLinkProxyLoading(true)
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.dobermanFactory as any,
                abi: DobermanFactory,
                functionName: 'createBorrower',
                args: [address],
                chainId: chain?.id
            })
            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })
            if (status == 'success') {
                try {
                    await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/proxies/link-proxy', {
                        userAddress: (address as string).toLowerCase()
                    })
                } catch (error) {
                    console.log(error)
                }
                toast.success("Link proxy successfully")
            }
            if (status == 'reverted') {
                toast.error("Link proxy fail")
            }
        } catch (error) {
            console.log(error)
        }
        setLinkProxyLoading(false)
    }

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
        try {
            const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + `/proxies/${address?.toLowerCase()}`)
            if (res.data == '0x0' || res.data == '') {
                setBorrowerCreated(false)
                showModal()
            } else {
                try {
                    await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/proxies/link-proxy', {
                        userAddress: (address as string).toLowerCase()
                    })
                } catch (error) {
                    console.log(error)
                }
                router.push('/borrow/apply')
            }

        } catch (error) {
            console.log(error)
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
                                <div className="btn-sm bg-lime-400 hover:bg-lime-500 m-16 rounded-lg border-2" style={{ cursor: 'pointer' }} onClick={handleApplyLoan}>Apply a new loan</div>

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
                                        actions={[<div className='btn-sm border-2 border-black text-black rounded-md hover:bg-slate-200' onClick={() => handleDetailLoanInfo(item, index + 1)}>View Detail</div>]}
                                        className='bg-white rounded-lg border-amber-300'>
                                        <List.Item.Meta
                                            avatar={index + 1 + '.'}
                                            title={(item as any).projectName}
                                            description={(item as any).projectIntro}
                                            style={{ alignItems: 'justify' }}
                                        />
                                        {(item as any).deployed ?
                                            <div className="text-lime-600 rounded-lg" style={{ border: 'solid', padding: '5px' }}>
                                                Deployed
                                            </div>
                                            : <div className="text-amber-300 rounded-lg" style={{ border: 'solid', padding: '5px' }}>
                                                Undeployed
                                            </div>}
                                    </List.Item>
                                )}
                            />
                        </div>
                        <Modal title="Link Proxy Wallet" open={isModalOpen && !borrowerCreated} onOk={handleOk} onCancel={handleCancel}
                            okText=<div className="text-black">
                                {linkProxyLoading == true && <Spin indicator={antIcon} style={{ marginRight: '5px' }} />}
                                Link proxy
                            </div>
                        >
                            <div style={{ margin: '10px' }}>
                                <div style={{ margin: '10px' }}>
                                    Link your wallet address to a DOBERMAN proxy wallet smart contract in order to create a loan.
                                </div>
                                <ul>
                                    <li style={{ margin: '10px' }}>Proxy wallet will help you interact indirectly with smart contracts across all your loans and save gas fee.</li>
                                    <li style={{ margin: '10px' }}>Proxy Wallet linking is a one-time transaction only.</li>
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
