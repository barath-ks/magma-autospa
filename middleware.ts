import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const mustChangePassword = req.nextauth.token?.must_change_password;
    const path = req.nextUrl.pathname;

    // Force password change interception
    if (mustChangePassword && !path.startsWith("/force-change-password") && !path.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/force-change-password", req.url));
    }

    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    if (path.startsWith("/manager") && role !== "manager") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/staff") && role !== "staff") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    }
  }
);

export const config = {
  matcher: ["/staff/:path*", "/manager/:path*", "/admin/:path*"],
};
