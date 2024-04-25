"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusAPIResponse, SignInButton } from "@farcaster/auth-kit";
import { Account, inAppWallet } from "thirdweb/wallets";
import thirdwebClient from "@/lib/thirdweb-client";
import Image from "next/image";
import useSmartAccount from "@/hooks/useSmartAccount";
import {
	Address,
	defineChain,
	getContract,
	sendAndConfirmTransaction,
} from "thirdweb";
import { claimTo, mintTo } from "thirdweb/extensions/erc721";
import classNames from "classnames";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";

type User = {
	username?: string;
	pfp?: string;
};

async function mint(account: Account, recipient: Address) {
	const contract = getContract({
		address: process.env.NEXT_PUBLIC_NFT_ADDRESS as Address,
		chain: defineChain(Number(process.env.NEXT_PUBLIC_CHAIN_ID)),
		client: thirdwebClient,
	});

	const mintTx = claimTo({
		contract,
		to: recipient,
		quantity: BigInt(1),
	});
	console.log("Minting", mintTx);

	const res = await sendAndConfirmTransaction({
		account,
		transaction: mintTx,
	});
	console.log(res);

	return res.transactionHash;
}

async function getFarcasterProfile(fid: number): Promise<User> {
	const res = await fetch(
		`https://hub.pinata.cloud/v1/userDataByFid?fid=${fid}`
	);

	const data = await res.json();

	const username = data.messages.find(
		(msg: any) => msg.data.userDataBody.type === "USER_DATA_TYPE_USERNAME"
	).data.userDataBody.value;
	const pfp = data.messages.find(
		(msg: any) => msg.data.userDataBody.type === "USER_DATA_TYPE_PFP"
	).data.userDataBody.value;

	return { username, pfp };
}

export default function Home() {
	const [inAppAccount, setInAppAccount] = useState<Account | undefined>();
	const [fid, setFid] = useState<number | undefined>();
	const [user, setUser] = useState<User>({});
	const [mintingStatus, setMintingStatus] = useState<
		"none" | "minting" | "error" | "minted"
	>("none");
	const [mintTx, setMintTx] = useState<string>("");
	const { smartAccount } = useSmartAccount({ account: inAppAccount });
	const wallet = useMemo(() => inAppWallet(), []);

	const handleSuccess = useCallback(
		async (res: StatusAPIResponse) => {
			try {
				setFid(res.fid);
				const account = await wallet.connect({
					client: thirdwebClient,
					chain: defineChain(
						Number(process.env.NEXT_PUBLIC_CHAIN_ID)
					),
					strategy: "auth_endpoint",
					payload: JSON.stringify({
						signature: res.signature,
						message: res.message,
						nonce: res.nonce,
					}),
					encryptionKey: `0x${res.signature}`,
				});
				setInAppAccount(account);
			} catch (e) {
				setFid(undefined);
				console.error(e);
			} finally {
			}
		},
		[wallet]
	);

	const startMint = useCallback(async () => {
		try {
			if (!smartAccount) return;
			setMintingStatus("minting");
			const tx = await mint(
				smartAccount,
				smartAccount.address as Address
			);
			setMintingStatus("minted");
			setMintTx(tx);
		} catch (e) {
			setMintingStatus("error");
		}
	}, [smartAccount]);

	useEffect(() => {
		if (fid) {
			getFarcasterProfile(fid).then(setUser);
		}
	}, [fid]);

	return (
		<main className="flex min-h-screen flex-col items-center gap-8">
			<div className="w-screen flex-row gap-4 items-center h-24 flex justify-between px-4 py-6 mx-auto max-w-7xl">
				<Image
					src="/thirdweb.png"
					width={1825}
					height={296}
					className="w-auto h-6"
					alt="Thirdweb"
				/>
				{fid ? (
					<Link
						href={`https://warpcast.com/${user.username ?? ""}`}
						target="_blank"
						className="py-2 cursor-pointer transition hover:scale-105 px-3 bg-slate-500/20 border border-slate-400/50 rounded-xl items-center flex gap-3"
					>
						<div className="relative w-11 h-11 overflow-hidden rounded-full border border-slate-400/50">
							{user.pfp && (
								<Image
									fill
									src={user.pfp}
									alt=""
									className="object-cover object-center"
								/>
							)}
						</div>
						<div className="flex font-semibold flex-col items-start justify-center gap-0.5">
							<div>{user.username}</div>
							<div className="text-slate-400 text-sm">
								Fid: {fid}
							</div>
						</div>
					</Link>
				) : (
					<SignInButton onSuccess={handleSuccess} />
				)}
			</div>
			<div className="mx-auto w-full max-w-3xl mx-auto h-full px-4 mt-16 flex-col gap-16 items-center text-center">
				<button
					onClick={startMint}
					className={classNames(
						"max-w-sm relative w-full mx-auto overflow-hidden flex flex-col gap-4 border border-slate-400/50 hover rounded-xl p-4 transition shadow-farcaster-purple/50 hover:shadow-farcaster-purple/75 shadow-2xl",
						fid && mintingStatus === "none"
							? "cursor-pointer hover:scale-105 focus: hover:-translate-y-2 active:scale-95"
							: "cursor-default"
					)}
				>
					{mintingStatus !== "none" && (
						<div className="absolute w-full h-full bg-slate-900/75 top-0 left-0 z-10 inset-0 flex items-center justify-center">
							{mintingStatus === "minting" && (
								<div className="text-slate-100 flex flex-col items-center gap-2">
									<Loader2Icon className="w-10 h-10 animate-spin" />
									<p className="text-lg font-semibold">
										Minting...
									</p>
								</div>
							)}
							{mintingStatus === "error" && (
								<div className="text-slate-100 flex flex-col items-center gap-2">
									<XIcon className="w-10 h-10" />
									<p className="text-lg font-semibold">
										Something went wrong!
										<br />
										Try again?
									</p>
								</div>
							)}
							{mintingStatus === "minted" && (
								<div className="text-slate-100 flex flex-col items-center gap-2">
									<CheckIcon className="w-10 h-10" />
									<p className="text-lg font-semibold">
										Mint successful!
									</p>
									<Link
										href={`${
											process.env
												.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL ??
											"https://etherscan.io/tx"
										}/${mintTx}`}
										target="_blank"
										className="underline"
									>
										View Transaction
									</Link>
								</div>
							)}
						</div>
					)}
					<div className="w-full h-[300px] overflow-hidden border-slate-400/50 border h-auto rounded-lg relative">
						<Image
							src="/nft.png"
							fill
							className="object-center object-cover"
							alt="Sign in with Farcaster NFT"
						/>
					</div>
					<div className="py-6 w-full">
						{user.username && (
							<>
								<p className="w-full text-slate-100 font-semibold mb-1 text-sm text-center">
									You&apos;re signed in as
								</p>
								<p className="w-full text-slate-100 font-semibold mb-4 text-xl text-center">
									@{user.username}
								</p>
							</>
						)}
						{mintingStatus === "none" && (
							<p className="w-full mx-auto text-slate-400 font-semibold">
								{!fid &&
									"Sign in with Farcaster to mint a commemorative FarCon NFT"}
								{fid &&
									smartAccount &&
									"Click the card to mint ✨"}
								{fid &&
									!smartAccount &&
									"Generating a smart wallet using your Farcaster account..."}
							</p>
						)}
					</div>
				</button>
			</div>
		</main>
	);
}
