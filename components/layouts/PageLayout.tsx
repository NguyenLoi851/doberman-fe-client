import { FC, ReactNode } from "react";
import Footer from "../footer";
import Header from "../header";

interface Props {
    children: ReactNode;
}

const PageLayout: FC<Props> = ({ children }) => {
    return (
        <div>
            <Header />
            <div style={{ minHeight: '100vh' }}>{children}</div>
            <Footer />
        </div>
    )
}

export default PageLayout;