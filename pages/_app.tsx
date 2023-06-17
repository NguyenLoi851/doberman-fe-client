import { config } from '@/commons/connectors'
import type { AppProps } from 'next/app'
import { WagmiConfig } from 'wagmi'
import { wrapper } from "../store/store";
import { Provider } from "react-redux";
import Header from '@/components/header';
import Footer from '@/components/footer';
import DefaultLayout from '@/components/layouts/DefaultLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../globals.css'

type ComponentWithLayout = AppProps & {
  Component: AppProps['Component'] & {
    Layout: React.ComponentType;
  };
};

export default function App({ Component, ...rest }: ComponentWithLayout) {
  const { store, props } = wrapper.useWrappedStore(rest);
  const { pageProps } = props;
  const SingleLayout: any = Component.Layout || DefaultLayout

  return (
    <Provider store={store}>
      <WagmiConfig config={config}>
        <ToastContainer />
        <SingleLayout>
          <Component {...pageProps} />
        </SingleLayout>
      </WagmiConfig>
    </Provider>
  )
}
