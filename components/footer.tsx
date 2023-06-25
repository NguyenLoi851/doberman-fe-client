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
                <button className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">About</button>
                <button className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">Terms</button>
                <button className="font-medium text-purple-600 hover:text-gray-200 px-4 py-3 flex items-center transition duration-150 ease-in-out">Privacy</button>
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