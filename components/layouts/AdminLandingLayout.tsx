import { FC, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

const AdminLandingLayout: FC<Props> = ({ children }) => {
    return (
        <div>
            <div>{children}</div>
        </div>
    )
}

export default AdminLandingLayout;