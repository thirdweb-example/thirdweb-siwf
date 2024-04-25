export const dynamic = "force-dynamic";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

export async function GET(request: Request) {
	const { fid } = await request.json();

	try {
		return Response.json({ isVerifiedUser: false }, { status: 200 });
	} catch (e) {
		console.error(e);
		return Response.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
