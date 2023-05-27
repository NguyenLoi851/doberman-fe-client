import { useNetwork, useSignMessage } from "wagmi"

export const SignMessage = () => {
    const {chain} = useNetwork()
    const { data, isError, isLoading, isSuccess, signMessage } = useSignMessage({
        message: process.env.NEXT_PUBLIC_APP_ID+'#'+Math.round(Date.now()/1000)+'#'+chain?.id,
    })
    
    return (
        <div>
            <button disabled={isLoading} onClick={() => signMessage()}>
                Sign message
            </button>
            {isSuccess && <div>Signature: {data}</div>}
            {isError && <div>Error signing message</div>}
        </div>
    )
}
