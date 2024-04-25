import { createThirdwebClient } from "thirdweb";

export default createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

