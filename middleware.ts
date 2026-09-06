import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const mustChangePassword = req.nextauth.token?.must_change_password;
    const path = req.nextUrl.pathname;

    // Public login routes passthrough
    if (
      path === "/admin/login" ||
      path === "/manager/login" ||
      path === "/branch/login" ||
      path === "/login"
    ) {
      return NextResponse.next();
    }

    // Force password change interception for accounts requiring it
    if (mustChangePassword && !path.startsWith("/api")) {
      if (role === "branch") {
        if (!path.startsWith("/branch/change-password")) {
          return NextResponse.redirect(new URL("/branch/change-password", req.url));
        }
      } else {
        if (!path.startsWith("/force-change-password")) {
          return NextResponse.redirect(new URL("/force-change-password", req.url));
        }
      }
    }

    // Redirect legacy /staff routes to the new /branch/dashboard
    if (path.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/branch/dashboard", req.url));
    }

    // Strict Protection: /admin routes
    if (path.startsWith("/admin")) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
    
    // Strict Protection: /manager routes
    if (path.startsWith("/manager")) {
      const isBranchAllowed = (role === "branch" || role === "manager" || role === "admin") && path.startsWith("/manager/customers");
      if (role !== "manager" && role !== "admin" && !isBranchAllowed) {
        return NextResponse.redirect(new URL("/manager/login", req.url));
      }
    }

    // Strict Protection: /branch routes
    if (path.startsWith("/branch")) {
      if (role !== "branch" && role !== "manager" && role !== "admin") {
        return NextResponse.redirect(new URL("/branch/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Allow unauthenticated access to all dedicated portal login pages
        if (
          path === "/admin/login" ||
          path === "/manager/login" ||
          path === "/branch/login" ||
          path === "/login"
        ) {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    }
  }
);

export const config = {
  matcher: ["/branch/:path*", "/staff/:path*", "/manager/:path*", "/admin/:path*"],
};
