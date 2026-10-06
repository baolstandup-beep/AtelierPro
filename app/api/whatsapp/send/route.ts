import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { checkRateLimitShared } from '@/lib/rate-limiter';

const MAX_MESSAGE_LENGTH = 4096;
const MAX_MESSAGES_PER_HOUR = 60;

export async function POST(req: Request) {
  try {
    // Seuls les utilisateurs connectés peuvent envoyer depuis le numéro de l'atelier
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitShared(user.id, 'whatsapp_send', MAX_MESSAGES_PER_HOUR, 60 * 60 * 1000);
    if (!rateLimit.isAllowed) {
      return NextResponse.json(
        { error: 'Trop de messages envoyés. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || '').replace(/[^0-9]/g, '');
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (phone.length < 8 || phone.length > 15) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message vide ou trop long.' }, { status: 400 });
    }

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Les clés API WhatsApp Business ne sont pas configurées.' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erreur lors de l\'envoi du message WhatsApp');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
