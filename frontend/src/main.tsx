import React from "react";
import ReactDOM from "react-dom/client";
import { WalletProvider, NetworkType } from "stellar-wallet-kit";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider
      config={{
        network: NetworkType.TESTNET,
        appName: "zkPay",
        autoConnect: true,
      }}
    >
      <App />
    </WalletProvider>
  </React.StrictMode>
);
