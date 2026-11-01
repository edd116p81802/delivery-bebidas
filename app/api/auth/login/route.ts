import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const inputLogin = email.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: inputLogin },
          { email: inputLogin.toLowerCase() },
          { email: inputLogin.replace('@abacusai.app', '') },
          { email: `${inputLogin}@abacusai.app` },
          { email: `${inputLogin}@gmail.com` }
        ]
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    let isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      isPasswordValid = await bcrypt.compare(password.toLowerCase(), user.password);
    }
    if (!isPasswordValid) {
      const capitalized = password.charAt(0).toUpperCase() + password.slice(1);
      isPasswordValid = await bcrypt.compare(capitalized, user.password);
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}
