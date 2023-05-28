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

export default function Header() {
  const router = useRouter()
  return (
    <div>
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <Image src={Logo} alt="Logo" width='30' height='30' onClick={() => router.push('/earn')} />
      <div>
        <button onClick={() => router.push('/earn')}>Deals</button>
      </div>
      <div>
        <button onClick={() => router.push('/borrow')}>Borrow</button>
      </div>
      <div>
        <button onClick={() => router.push('/dashboard')}>Dashboard</button>
      </div>
      <div style={{float: 'right'}}>
      <ConnectWallet />
      </div>
    </div>
    <hr />
    </div>
  )
}
