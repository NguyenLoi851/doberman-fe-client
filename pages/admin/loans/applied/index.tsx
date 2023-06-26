import { constants } from "@/commons/constants";
import AdminLayout from "@/components/layouts/AdminLayout";
import { selectAccessTokenState } from "@/store/accessTokenSlice";
import { Button, List } from "antd";
import axios from "axios";
import Router, { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

interface Props {
    children: ReactNode;
}

export default function AdminLoansAppliedPage() {
    const [appliedLoans, setAppliedLoans] = useState([])
    const router = useRouter();

    const getAppliedLoans = async () => {
        const accessToken = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN)

        const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/undeployed')
        setAppliedLoans(res.data.loans)
    }

    useEffect(() => {
        getAppliedLoans()

    }, [])

    const handleDetailLoanInfo = (item: any) => {
        Router.push({
            pathname: `/admin/loans/applied/${item.id}`,
            query: {
                ...item
            }
        })
    }

    return (
        <div>
            <div style={{ textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0 }}>
                Loans / Applied loan
            </div>

            <List
                itemLayout="horizontal"
                dataSource={appliedLoans}
                renderItem={(item, index) => (
                    <List.Item
                        actions={[<Button className="btn-sm border-2 border-black hover:bg-slate-200 rounded-lg" onClick={() => handleDetailLoanInfo(item)}>View Detail</Button>]}
                        style={{ cursor: 'pointer', margin: '24px' }}>
                        <List.Item.Meta
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
