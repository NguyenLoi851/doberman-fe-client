import { useRouter } from "next/router";
import { FC, ReactNode } from "react"

interface Props {
    children: ReactNode;
}

const DefaultLayout: FC<Props> = ({ children }) => {
    const router = useRouter()

    return (
        <div>
            <button onClick={() => router.push('/earn')}>Open App</button>
        </div>
    )
}

export default DefaultLayout