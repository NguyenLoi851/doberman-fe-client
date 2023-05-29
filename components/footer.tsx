import Discord from '../public/discord.jpg'
import Twitter from '../public/twitter.jpg'
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function Footer() {
    const router = useRouter()

    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <button>About</button>
                <button>Terms</button>
                <button>Privacy</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Image src={Discord} alt="Discord" width='30' height='30' onClick={() => router.push('/earn')} />
                <Image src={Twitter} alt="Twitter" width='30' height='30' onClick={() => router.push('/earn')} />
            </div>
        </div>
    )
}