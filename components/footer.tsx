import Discord from '../public/discord.jpg'
import Twitter from '../public/twitter.jpg'
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Footer() {
    const router = useRouter()

    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '10px', marginLeft: '280px', marginRight: '280px' }} className="">
            <div style={{ display: 'flex', flexDirection: 'row', marginRight: '50px' }}>
                <button className="text-purple-600 px-4 py-3 flex font-mono items-center border-0" style={{ fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', backgroundColor: '#f9f9f9' }} >About</button>
                <button className="text-purple-600 px-4 py-3 flex font-mono items-center border-0" style={{ fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', backgroundColor: '#f9f9f9' }} >Terms</button>
                <button className="text-purple-600 px-4 py-3 flex font-mono items-center border-0" style={{ fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', backgroundColor: '#f9f9f9' }} >Privacy</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Link href='https://discord.gg/7FHgxdyW' target='_blank'>
                    <Image src={Discord} alt="Discord" className='w-8 h-8 m-3' />
                </Link>
                <Link href="https://twitter.com/" target='_blank'>
                    <Image src={Twitter} alt="Twitter" className='w-8 h-8 m-3' />
                </Link>
            </div>
        </div>
    )
}