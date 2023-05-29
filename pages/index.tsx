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

export default function LandingPage() {
  const router = useRouter();

  return (
    <div>
      <button onClick={() => router.push('/earn')}>Open App</button>
    </div>
  )
}
