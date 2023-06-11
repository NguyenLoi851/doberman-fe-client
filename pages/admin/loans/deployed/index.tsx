import { constants } from "@/commons/constants";
import AdminLayout from "@/components/layouts/AdminLayout";
import { selectAccessTokenState } from "@/store/accessTokenSlice";
import { List } from "antd";
import axios from "axios";
import Router, { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

interface Props {
    children: ReactNode;
}

export default function AdminLoansDeployedPage() {
    const [deployedLoans, setDeployedLoans] = useState([])
    const router = useRouter();

    const getDeployedLoans = async () => {
        const accessToken = localStorage.getItem(constants.ACCESS_TOKEN_ADMIN)

        const res = await axios.get(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/deployed')
        setDeployedLoans(res.data.loans)
    }

    useEffect(() => {
        getDeployedLoans()

    }, [])

    const handleDetailLoanInfo = (item: any) => {
        Router.push({
            pathname: `/admin/loans/deployed/${item.id}`,
            query: {
                ...item
            }
        })
    }

    return (
        <div>
            <div style={{textAlign: 'center', fontSize: '30px', backgroundColor: '#f5f5f5', paddingLeft: 0}}>
                Loans / Applied loan
            </div>
            
            <List
                itemLayout="horizontal"
                dataSource={deployedLoans}
                renderItem={(item, index) => (
                    <List.Item
                    actions={[<button onClick={() => handleDetailLoanInfo(item)}>View Detail</button>]}
                    style={{cursor: 'pointer', margin: '24px'}}>
                        <List.Item.Meta
                            avatar={index+1+'.'}
                            title={(item as any).projectName}
                            description={(item as any).projectIntro}
                        />
                    </List.Item>
                )}
            />
        </div>
    )
}

AdminLoansDeployedPage.Layout = (props: Props) => AdminLayout({ children: props.children });
