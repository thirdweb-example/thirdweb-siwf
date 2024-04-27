"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	StatusAPIResponse,
	SignInButton,
	useSignIn,
} from "@farcaster/auth-kit";
import { Account, inAppWallet } from "thirdweb/wallets";
import thirdwebClient from "@/lib/thirdweb-client";
import Image from "next/image";
import {
	Address,
	defineChain,
	getContract,
	sendAndConfirmTransaction,
} from "thirdweb";
import {
	claimTo,
	tokensClaimedEvent,
	transferFrom,
} from "thirdweb/extensions/erc721";
import classNames from "classnames";
import { CheckIcon, GithubIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import {
	useActiveAccount,
	useConnect,
	useContractEvents,
} from "thirdweb/react";

/**
 * 	This codebase is meant for demo purposes only.
 *
 * 	While you can use it as a starting point for your application, it's not recommended for production use.
 */

type User = {
	username?: string;
	pfp?: string;
	addresses?: Address[];
	preferredAddress?: Address;
};

const NFT_CONTRACT = getContract({
	address: process.env.NEXT_PUBLIC_NFT_ADDRESS as Address,
	chain: defineChain(Number(process.env.NEXT_PUBLIC_CHAIN_ID)),
	client: thirdwebClient,
});

async function mint(account: Account, recipient: Address) {
	const mintTx = claimTo({
		contract: NFT_CONTRACT,
		to: recipient,
		quantity: BigInt(1),
	});

	const res = await sendAndConfirmTransaction({
		account,
		transaction: mintTx,
	});

	return res.transactionHash;
}

async function transfer(account: Account, recipient: Address, tokenId: bigint) {
	const transferTx = transferFrom({
		contract: NFT_CONTRACT,
		from: account.address as Address,
		to: recipient,
		tokenId,
	});

	const res = await sendAndConfirmTransaction({
		account,
		transaction: transferTx,
	});

	return res.transactionHash;
}

async function getFarcasterLinkedAddresses(fid: number) {
	const res = await fetch(
		`https://hub.pinata.cloud/v1/verificationsByFid?fid=${fid}`
	);

	const data = await res.json();

	return data.messages
		.filter(
			(msg: any) =>
				msg.data.type === `MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS`
		)
		.map((msg: any) => msg.data.verificationAddEthAddressBody.address)
		.filter((address: Address) => address !== undefined);
}

async function getFatcasterUser(fid: number) {
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

async function getFarcasterProfile(fid: number): Promise<User> {
	const { username, pfp } = await getFatcasterUser(fid);
	const addresses = await getFarcasterLinkedAddresses(fid);

	return { username, pfp, addresses };
}

export default function Home() {
	const [fid, setFid] = useState<number | undefined>();
	const [user, setUser] = useState<User>({});
	const [mintingStatus, setMintingStatus] = useState<
		"none" | "minting" | "error" | "minted" | "transferring" | "transferred"
	>("none");
	const [tokenId, setTokenId] = useState<bigint | undefined>();
	const [mintTx, setMintTx] = useState<string>("");
	const [transferTx, setTransferTx] = useState<string>("");
	const wallet = useMemo(() => inAppWallet(), []);
	const account = useActiveAccount();
	const { data: events } = useContractEvents({
		contract: NFT_CONTRACT,
		events: [tokensClaimedEvent({ claimer: account?.address })],
	});
	const { isSuccess, data } = useSignIn({});
	const { connect } = useConnect({
		client: thirdwebClient,
		accountAbstraction: {
			gasless: true,
			chain: defineChain(Number(process.env.NEXT_PUBLIC_CHAIN_ID)),
			factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as Address,
		},
	});

	const handleSuccess = useCallback(
		async (res: StatusAPIResponse) => {
			try {
				setFid(res.fid);
				await wallet.connect({
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
					encryptionKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY!,
				});
				await connect(wallet);
			} catch (e) {
				setFid(undefined);
				console.error(e);
			}
		},
		[wallet, connect]
	);

	const startMint = useCallback(async () => {
		try {
			if (!account) return;
			setMintingStatus("minting");
			const tx = await mint(account, account.address as Address);
			setMintTx(tx);
			setMintingStatus("minted");
		} catch (e) {
			console.error(e);
			setMintingStatus("error");
		}
	}, [account]);

	const startTransfer = useCallback(
		async (address: Address) => {
			try {
				if (!account || !tokenId) return;
				setMintingStatus("transferring");
				const tx = await transfer(account, address, tokenId);
				setTransferTx(tx);
				setMintingStatus("transferred");
			} catch (e) {
				console.error(e);
				setMintingStatus("error");
			}
		},
		[account, tokenId]
	);

	useEffect(() => {
		if (fid) {
			getFarcasterProfile(fid).then(setUser);
		}
	}, [fid]);

	useEffect(() => {
		if (data?.fid) {
			handleSuccess(data);
		}
	}, [data, handleSuccess]);

	useEffect(() => {
		if (events) {
			setTokenId(events[events.length - 1].args.startTokenId); // get the *last* tokenId (in case they've minted multiple)
		}
	}, [events]);

	return (
		<div className="min-h-screen flex-col flex items-center gap-8">
			<header className="w-screen flex-row gap-4 items-center h-24 flex justify-between px-4 py-6 mx-auto max-w-7xl">
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
					<SignInButton hideSignOut onSuccess={handleSuccess} />
				)}
			</header>
			<main className="mx-auto w-full flex-1 max-w-3xl mx-auto  px-4 py-16 gap-16">
				<div
					onClick={() => {
						if (account && mintingStatus === "none") {
							startMint();
						}
					}}
					className={classNames(
						"max-w-sm relative w-full mx-auto overflow-hidden flex flex-col gap-4 border border-slate-400/50 hover rounded-xl p-4 transition shadow-farcaster-purple/50 hover:shadow-farcaster-purple/75 shadow-2xl",
						account && mintingStatus === "none"
							? "cursor-pointer hover:scale-105 focus: hover:-translate-y-2 active:scale-95"
							: "cursor-default"
					)}
				>
					{mintingStatus !== "none" && (
						<div className="absolute text-center w-full h-full bg-slate-900/90 top-0 left-0 z-10 inset-0 flex items-center justify-center">
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
								<div className="text-slate-100 flex flex-col items-center gap-12">
									<div className="flex flex-col items-center gap-1">
										<CheckIcon className="w-10 h-10" />
										<p className="text-lg font-semibold">
											Mint successful!
										</p>
										<Link
											href={`${
												process.env
													.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL ??
												"https://etherscan.io/tx/"
											}${mintTx}`}
											target="_blank"
											className="underline"
										>
											View Transaction
										</Link>
									</div>
									{account && tokenId && fid && (
										<div className="flex flex-col gap-3 md:gap-1">
											<p className="text-slate-400 max-w-[150px] text-center text-sm mb-2">
												Select an address to transfer
												your NFT:
											</p>
											{user.addresses?.map((address) => (
												<button
													key={address}
													onClick={() => {
														setUser({
															...user,
															preferredAddress:
																address,
														});
														startTransfer(address);
													}}
													className="hover:before:content-['👉'] before:absolute before:-translate-x-6 before:transition-opacity before:transition-duration-800 hover:before:opacity-100 before:opacity-0 font-semibold text-slate-100"
												>
													{`${address.slice(
														0,
														6
													)}...${address.slice(-4)}`}
												</button>
											))}
										</div>
									)}
								</div>
							)}
							{mintingStatus === "transferring" && (
								<div className="text-slate-100 flex flex-col items-center gap-2">
									<Loader2Icon className="w-10 h-10 animate-spin" />
									{user.preferredAddress && (
										<div className="text-lg font-semibold">
											Transferring to <br />
											{user.preferredAddress.slice(0, 6)}
											...
											{user.preferredAddress.slice(-4)}
										</div>
									)}
								</div>
							)}
							{mintingStatus === "transferred" && (
								<div className="text-slate-100 flex flex-col items-center gap-12">
									<div className="flex flex-col items-center gap-1">
										<CheckIcon className="w-10 h-10" />
										<p className="text-lg font-semibold">
											Transfer complete!
										</p>
										<Link
											href={`${
												process.env
													.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL ??
												"https://etherscan.io/tx/"
											}${transferTx}`}
											target="_blank"
											className="underline"
										>
											View Transaction
										</Link>
									</div>
								</div>
							)}
						</div>
					)}
					<div className="w-full h-72 overflow-hidden border-slate-400/50 border rounded-lg relative">
						<Image
							src="/nft.png"
							fill
							className="object-center object-cover"
							alt="Sign in with Farcaster NFT"
						/>
					</div>
					<div className="py-6 w-full text-center">
						{user.username && fid && (
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
							<div className="w-full mx-auto text-slate-400 font-semibold">
								{!fid &&
									"Sign in with Farcaster to mint a commemorative FarCon NFT"}
								{fid && account && "Click the card to mint ✨"}
								{fid && !account && (
									<div className="flex justify-center items-center gap-2">
										<Loader2Icon className="w-4 h-4 animate-spin" />
										Generating smart wallet...
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</main>
			<footer className="border-t w-full flex items-center justify-center md:justify-end px-4 border-slate-400/50 p-4 text-sm text-slate-400 text-center max-w-7xl mx-auto">
				<Link
					href="https://github.com/thirdweb-example/thirdweb-siwf"
					target="_blank"
					className="flex items-center gap-1 font-semibold hover:underline"
				>
					<GithubIcon className="w-4 h-4 mr-1" /> Fork this project on
					GitHub
				</Link>
			</footer>
		</div>
	);
}
