"use client";

import { constants } from "@/commons/constants";
import AdminLayout from "@/components/layouts/AdminLayout";
import { selectAccessTokenState } from "@/store/accessTokenSlice";
import { Button, List } from "antd";
import axios from "axios";
import Router, { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface Props {
    children: ReactNode;
}

export default function AdminLoansDeployedPage() {
    const [deployedLoans, setDeployedLoans] = useState([])
    const router = useRouter();
    const { address } = useAccount()
    const getDeployedLoans = async () => {
        try {
            const accessToken = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN)

            const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/deployed')
            setDeployedLoans(res.data.loans.reverse())
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (address == null) {
            router.push('/admin')
        }
        getDeployedLoans()

    }, [])

    const handleDetailLoanInfo = (item: any) => {
        Router.push({
            pathname: `/admin/loans/deployed/${item.id}`,
            query: {
                ...item,
                fileKeys: JSON.stringify(item.legalDocuments || "")
            }
        })
    }

    return (
        <div>
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0, marginTop: '30px', paddingBottom: '30px' }}>
                Loans / Deployed loan
            </div>

            <List
                itemLayout="horizontal"
                dataSource={deployedLoans}
                renderItem={(item, index) => (
                    <List.Item
                        actions={[<Button style={{ fontSize: '18px' }} className="btn-lg border-2 border-black rounded-lg" onClick={() => handleDetailLoanInfo(item)}>View Detail</Button>]}
                        className="rounded-lg shadow-lg hover:shadow-xl"
                        style={{ cursor: 'auto', fontSize: '20px', padding: '20px' }}>
                        <List.Item.Meta
                            avatar={index + 1 + '.'}
                            description={(item as any).projectIntro}
                            title=<div style={{ fontSize: '20px' }}>{(item as any).projectName}</div>
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminLoansDeployedPage.Layout = (props: Props) => AdminLayout({ children: props.children });
