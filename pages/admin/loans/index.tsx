import AdminLayout from "@/components/layouts/AdminLayout";
import { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function PoolPage() {
    return (
        <div>
            PoolPage
        </div>
    )
}

PoolPage.Layout = (props: Props) => AdminLayout({ children: props.children });
