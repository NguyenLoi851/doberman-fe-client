import React, { FC, ReactNode, useState } from 'react';
import {
    DesktopOutlined,
    FileOutlined,
    PieChartOutlined,
    TeamOutlined,
    UserOutlined,

} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import AdminLandingLayout from '@/components/layouts/AdminLandingLayout';
import AdminHeader from '../adminHeader';
import { useRouter } from 'next/router';

const { Header, Content, Footer, Sider } = Layout;

interface Props {
    children: ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
    } as MenuItem;
}

const items: MenuItem[] = [

    getItem('User', 'sub1', <UserOutlined />, [
        getItem('Register', '1'),
        getItem('Accepted KYC', '4'),
        // getItem('User', '2'),
        // getItem('Bill', '4'),
        // getItem('Alex', '5'),
    ]),
    getItem('Loan', 'sub2', <TeamOutlined />, [
        getItem('Applied', '2'), 
        getItem('Deployed', '3'),
    ]),
    // getItem('Option 1', '1', <PieChartOutlined />),
    // getItem('Option 2', '2', <DesktopOutlined />),
    // getItem('Files', '9', <FileOutlined />),
];

const AdminLayout: FC<Props> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer },
    } = theme.useToken();
    const router = useRouter();

    const handleChooseOption = (key: string) => {
        if(key == '1') router.push('/admin/users/register')
        if(key == '2') router.push('/admin/loans/applied')
        if(key == '3') router.push('/admin/loans/deployed')
        if(key == '4') router.push('/admin/users/accepted')
    }
    return (
        <div>
        <AdminHeader />
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <div className="demo-logo-vertical" />
                <Menu theme="dark" mode="inline" items={items} onClick={(e)=>handleChooseOption(e.key)}/>
            </Sider>
            <Layout>
                <Content style={{ margin: '10px 16px' }}>
                    {/* <Breadcrumb style={{ margin: '16px 0' }}>
                        <Breadcrumb.Item>User</Breadcrumb.Item>
                        <Breadcrumb.Item>Bill</Breadcrumb.Item>
                    </Breadcrumb> */}
                    <div style={{ background: colorBgContainer }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
        </div>
    );
};

export default AdminLayout;