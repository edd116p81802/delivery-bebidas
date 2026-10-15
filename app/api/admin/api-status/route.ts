import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { checkLLMAvailability } from '@/lib/llm-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar provedores disponíveis
    const llmStatus = await checkLLMAvailability();
    
    const status = {
      storage: {
        abacusS3: !!(process.env.AWS_BUCKET_NAME && process.env.AWS_FOLDER_PREFIX),
        cloudinary: false, // Será verificado no frontend
      },
      llm: {
        abacus: llmStatus.abacus,
        openaiEnv: llmStatus.openaiEnv,
        openaiDb: llmStatus.openaiDb,
      },
      activeProvider: {
        storage: process.env.AWS_BUCKET_NAME ? 'Abacus S3' : 'Não configurado',
        llm: llmStatus.abacus ? 'Abacus AI' : 
             (llmStatus.openaiEnv || llmStatus.openaiDb) ? 'OpenAI' : 'Não configurado',
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
