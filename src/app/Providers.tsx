"use client";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { ThirdwebProvider } from "thirdweb/react";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThirdwebProvider>
			<AuthKitProvider
				config={{
					rpcUrl: "https://10.rpc.thirdweb.com",
					domain: process.env.NEXT_PUBLIC_DOMAIN!,
				}}
			>
				{children}
			</AuthKitProvider>
		</ThirdwebProvider>
	);
}
