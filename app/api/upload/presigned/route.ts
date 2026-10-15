import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType, isPublic = true } = await req.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName e contentType são obrigatórios" }, { status: 400 });
    }
    const result = await generatePresignedUploadUrl(fileName, contentType, isPublic);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Presigned URL error:", e);
    return NextResponse.json({ error: "Erro ao gerar URL" }, { status: 500 });
  }
}
