import { config } from '@/commons/connectors'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { WagmiConfig } from 'wagmi'
import { wrapper } from "../store/store";
import { Provider } from "react-redux";

export default function App({ Component, ...rest }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(rest);
  const { pageProps } = props;

  return (
    <Provider store={store}>
      <WagmiConfig config={config}>
        <Component {...pageProps} />
      </WagmiConfig>
    </Provider>
  )
}
