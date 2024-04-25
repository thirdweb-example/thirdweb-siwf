import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/app/Providers";
import "@farcaster/auth-kit/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "SIWF by Thirdweb",
	description:
		"Authenticate to an ethereum smart wallet using your Farcaster account to mint an exclusive FarCon NFT.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.className} bg-black text-white`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
