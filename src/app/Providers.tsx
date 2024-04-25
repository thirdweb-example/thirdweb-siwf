"use client";
import { AuthKitProvider } from "@farcaster/auth-kit";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<AuthKitProvider
			config={{
				rpcUrl: "https://10.rpc.thirdweb.com",
				domain: process.env.NEXT_PUBLIC_DOMAIN!,
			}}
		>
			{children}
		</AuthKitProvider>
	);
}
