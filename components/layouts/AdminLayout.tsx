import React, { FC, ReactNode, useState } from 'react';
import {
    DesktopOutlined,
    FileOutlined,
    PieChartOutlined,
    TeamOutlined,
    UserOutlined,
    SettingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import AdminLandingLayout from '@/components/layouts/AdminLandingLayout';
import AdminHeader from '../adminHeader';
import { useRouter } from 'next/router';
import { handleRouter } from '@/commons/functions';

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
    getItem('System', 'sub3', <SettingOutlined />, [
        getItem('Configuration', '5')
    ])
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

    const handleChooseOption = (key: string, e?: any) => {
        if (key == '1') handleRouter('/admin/users/register', e?.domEvent)
        if (key == '2') handleRouter('/admin/loans/applied', e?.domEvent)
        if (key == '3') handleRouter('/admin/loans/deployed', e?.domEvent)
        if (key == '4') handleRouter('/admin/users/accepted', e?.domEvent)
        if (key == '5') handleRouter('/admin/settings/config', e?.domEvent)
    }
    return (
        <div>
            <AdminHeader />
            <Layout style={{ minHeight: '100vh', fontSize: '20px' }}>
                <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} style={{ fontSize: '20px' }}>
                    <div className="demo-logo-vertical" />
                    <Menu theme="dark" mode="inline" items={items} onClick={(e) => handleChooseOption(e.key, e)} />
                </Sider>
                <Layout>
                    <Content style={{ margin: '10px 16px', fontSize: '20px' }}>
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