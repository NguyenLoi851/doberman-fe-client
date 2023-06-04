import AdminLayout from "@/components/layouts/AdminLayout";
import { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function AdminHomePage() {
    return(
        <div>
            Admin Home Page
        </div>
    )
}

AdminHomePage.Layout = (props: Props) => AdminLayout({ children: props.children });
