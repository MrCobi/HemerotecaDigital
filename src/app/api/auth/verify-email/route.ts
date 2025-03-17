import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    try {
      // Verify the token
      const payload = jwt.verify(token, process.env.AUTH_SECRET!) as { 
        email: string;
        exp: number;
      };

      // Update the user's email verification status
      await prisma.user.update({
        where: { email: payload.email },
        data: { emailVerified: new Date() }
      });

      // Redirect to success page
      return NextResponse.redirect(new URL('/auth/verify-success', request.url));
    } catch (error) {
      console.error("Token verification error:", error);
      
      // Redirect to error page
      return NextResponse.redirect(new URL('/auth/verify-error', request.url));
    }
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
