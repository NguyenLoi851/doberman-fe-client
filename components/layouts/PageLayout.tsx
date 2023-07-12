import { FC, ReactNode } from "react";
import Footer from "../footer";
import Header from "../header";

interface Props {
    children: ReactNode;
}

const PageLayout: FC<Props> = ({ children }) => {
    return (
        <div className="bg-amber-100">
            <Header />
            <div style={{ minHeight: '100vh' }}>{children}</div>
            <Footer />
        </div>
    )
}

export default PageLayout;