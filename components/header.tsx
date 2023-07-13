import { SignMessage } from '@/components/signMessage'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSignMessage,
} from 'wagmi'
import { useRouter } from 'next/router';
import ConnectWallet from './connectWallet';
import Logo from '../public/logo.jpg'
import Image from 'next/image';
import styles from './header.module.css'
import { Dropdown, Space } from 'antd';
import { DownOutlined, SmileOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

export default function Header() {
  const router = useRouter()

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: (
        // <a rel="noopener noreferrer" href="/borrow" >
        <div onClick={() => router.push('/borrow')}>
          <div className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">
            Borrow
          </div>
        </div>
        // </a>
      ),
    },
    {
      key: '2',
      label: (
        // <a rel="noopener noreferrer" href="/account" >
        <div onClick={() => router.push('/account')}>
          <div className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">
            Dashboard
          </div>
        </div>
        // </a>
      )
    },
  ];

  return (
    <div style={{ padding: '10px' }}
    //  className="bg-amber-100"
    >
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', margin: '10px' }}>
        <div className="shrink-0 mr-4">
          <div style={{ display: 'flex', flexDirection: 'row' }} className="flex grow justify-end flex-wrap items-center">
            <Image src={Logo} alt="Logo" className='rounded-full w-8 h-8' onClick={() => router.push('/earn')} />
            <div>
              <button className="font-medium text-purple-600 px-4 py-3 flex items-center transition duration-150 ease-in-out" onClick={() => router.push('/earn')}>Deals</button>
            </div>
            <Dropdown menu={{ items }}>
              <a onClick={(e) => e.preventDefault()}>
                <Space className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">
                  Manage
                  <DownOutlined />
                </Space>
              </a>
            </Dropdown>
          </div>
        </div>
        <div style={{ float: 'right' }} className="btn-sm text-white bg-purple-600 hover:bg-purple-900 ml-3">
          <ConnectWallet />
        </div>
      </div>
      <hr />
    </div>
  )
}
