import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, message } = body;

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
  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
