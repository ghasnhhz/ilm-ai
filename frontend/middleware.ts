import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/profile/:path*",
    "/library/:path*",
    "/chat/:path*",
    "/quiz/:path*",
    "/plan/:path*",
    "/gaps/:path*",
    "/billing/:path*",
  ],
};
