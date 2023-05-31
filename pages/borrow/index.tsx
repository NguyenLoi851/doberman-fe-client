import Footer from "@/components/footer";
import Header from "@/components/header";
import { useRouter } from "next/router";

export default function BorrowPage() {
    const router = useRouter()

    return (
        <div>
            <Header />
            <div style={{ height: 'calc(100vh - 64px - 30px)' }}>
                <div>
                    Borrow
                </div>

                <div style={{ display: 'flex', flexDirection: 'row'}}>
                    <div>My loans</div>
                    <button onClick={() => router.push('/borrow/apply')}>Apply a new loan</button>
                </div>
            </div>
            <Footer />
        </div>
    )
}
