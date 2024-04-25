import thirdwebClient from "@/lib/thirdweb-client";
import { useEffect, useState } from "react";
import { defineChain } from "thirdweb";
import { Account, smartWallet } from "thirdweb/wallets";

export default function useSmartAccount({ account }: { account?: Account }) {
	const [smartAccount, setSmartAccount] = useState<Account | undefined>();

	const wallet = smartWallet({
		factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ADDRESS!,
		chain: defineChain(Number(process.env.NEXT_PUBLIC_CHAIN_ID)),
		gasless: true,
	});

	useEffect(() => {
		if (!account) return;
		wallet
			.connect({
				client: thirdwebClient,
				personalAccount: account,
			})
			.then(setSmartAccount);
	}, [account, wallet]);

	return { smartAccount };
}
