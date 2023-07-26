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
import { handleRouter } from '@/commons/functions';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div>
      <button onClick={(e) => handleRouter('/earn', e)}>Open App</button>
    </div>
  )
}
