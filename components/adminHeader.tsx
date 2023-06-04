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

export default function AdminHeader() {
  const router = useRouter()
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Image src={Logo} alt="Logo" width='30' height='30' onClick={() => router.push('/earn')} />
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <div>
            <button onClick={() => router.push('/admin/users')}>Users</button>
          </div>
          <div>
            <button onClick={() => router.push('/admin/pools')}>Pools</button>
          </div>
        </div>
        <div style={{ float: 'right' }}>
          <ConnectWallet />
        </div>
      </div>
      <hr />
    </div>
  )
}
