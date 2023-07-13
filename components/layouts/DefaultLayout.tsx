import { useRouter } from "next/router";
import { FC, ReactNode } from "react"
import Features from "../features";
import Hero from "../hero";
import LandingPageHeader from "../landingPageHeader";
import Newsletter from "../newsletter";
import Testimonials from "../testimonials";
import Zigzag from "../zigzag";
import { Inter, Architects_Daughter } from 'next/font/google'

interface Props {
    children: ReactNode;
}

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap'
})

const architects_daughter = Architects_Daughter({
    subsets: ['latin'],
    variable: '--font-architects-daughter',
    weight: '400',
    display: 'swap'
})


const DefaultLayout: FC<Props> = ({ children }) => {
    const router = useRouter()

    return (
        <div className={`${inter.variable} ${architects_daughter.variable} font-inter antialiased text-gray-9-00 tracking-tight`}>
            <div>
                <LandingPageHeader />
                <Hero />
                <Features />
                <Zigzag />
                <Testimonials />
                <Newsletter />
            </div>
        </div>

    )
}

export default DefaultLayout