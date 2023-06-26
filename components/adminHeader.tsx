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
    <div style={{ padding: '10px' }}>
      <div style={{ margin: '10px' }}>

        <div className="shrink-0 mr-4">

          <div style={{ display: 'flex', flexDirection: 'row' }} className="flex grow justify-between flex-wrap items-center">
            <div></div>
            <Image src={Logo} alt="Logo" className='rounded-full w-8 h-8' onClick={() => router.push('/earn')} />
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>

            <div style={{ float: 'right' }} className="btn-sm text-white bg-purple-600 hover:bg-purple-900 ml-3">
              <ConnectWallet />
            </div>
            <div></div>

          </div>
        </div>
      </div>
      <hr />
    </div>
  )
}
