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

export default function AdminLoansAppliedPage() {
    const [appliedLoans, setAppliedLoans] = useState([])
    const router = useRouter();
    const { address } = useAccount()

    const getAppliedLoans = async () => {
        try {
            const accessToken = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN)

            const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/undeployed')
            setAppliedLoans(res.data.loans.reverse())
        } catch (error) {
            console.log(error)
        }

    }

    useEffect(() => {
        if (address == null) {
            router.push('/admin')
            return;
        } else {
            getAppliedLoans()
        }

    }, [address])

    const handleDetailLoanInfo = (item: any) => {
        Router.push({
            pathname: `/admin/loans/applied/${item.id}`,
            query: {
                ...item,
                fileKeys: JSON.stringify(item.legalDocuments || "")
            }
        })
    }

    return (
        <div>
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0, marginTop: '30px' }}>
                Loans / Applied loan
            </div>

            <List
                itemLayout="horizontal"
                dataSource={appliedLoans}
                style={{ fontSize: '18px' }}
                className="rounded-lg"
                renderItem={(item, index) => (
                    <List.Item
                        actions={[<Button style={{ fontSize: '18px' }} className="btn-sm border-2 border-black hover:bg-slate-200 rounded-lg" onClick={() => handleDetailLoanInfo(item)}>View Detail</Button>]}
                        style={{ cursor: 'pointer', margin: '24px', fontSize: '18px' }}
                        className="rounded-lg"
                    >
                        <List.Item.Meta
                            style={{ fontSize: '18px' }}
                            avatar={index + 1 + '.'}
                            title={(item as any).projectName}
                            description={(item as any).projectIntro}
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminLoansAppliedPage.Layout = (props: Props) => AdminLayout({ children: props.children });
