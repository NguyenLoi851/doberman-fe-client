import { Router, useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function RouteChange(props: any) {
    const router = useRouter()
    const [auth, setAuth] = useState(false)

    useEffect(() => {
        console.log("auth", auth)
        console.log(Router.events)
        router.events.on('routeChangeStart', (url, { shallow }) => {
            console.log(`routing to ${url}`, `is shallow routing: ${shallow}`);
        });
        console.log("auth", auth)

        router.events.on('routeChangeComplete', () => setAuth(false))
        console.log("auth", auth)
        console.log("router", router)

    }, [])

    return !auth && props?.children
}
