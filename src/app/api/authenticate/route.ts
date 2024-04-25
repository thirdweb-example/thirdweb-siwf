export const dynamic = "force-dynamic";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

export async function POST(request: Request) {
	const { payload } = await request.json();
	const { signature, message, nonce } = JSON.parse(payload);

	try {
		if (!signature || !message || !nonce) {
			return Response.json({ error: "Invalid request" }, { status: 400 });
		}

		const appClient = createAppClient({
			ethereum: viemConnector(),
		});

		const verifyResponse = await appClient.verifySignInMessage({
			message: message as string,
			signature: signature as `0x${string}`,
			domain: process.env.NEXT_PUBLIC_DOMAIN!,
			nonce,
		});

		const { fid } = verifyResponse;

		if (fid) {
			return Response.json(
				{
					userId: String("siwf-" + fid),
					isVerifiedUser: true,
					exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
				},
				{ status: 200 }
			);
		}

		return Response.json({ isVerifiedUser: false }, { status: 200 });
	} catch (e) {
		console.error(e);
		return Response.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
