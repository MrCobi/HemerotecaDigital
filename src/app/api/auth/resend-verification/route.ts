import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { sendEmailVerification } from "@/lib/mail";
import { isProduction } from "@/lib/environment";

export async function POST(request: NextRequest): Promise<NextResponse>  {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true }
    });

    if (!user) {
      // Don't reveal if the user exists or not for security
      return NextResponse.json({ success: true });
    }

    // If email is already verified, no need to send again
    if (user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    // Only send verification emails in production
    if (isProduction()) {
      // Generate verification token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.AUTH_SECRET!,
        { expiresIn: "24h" }
      );

      // Send verification email
      await sendEmailVerification(user.email, token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

