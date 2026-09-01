import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

const SYSTEM_PROMPT = `Tu es TRAIT IA, l'assistant de l'app TRAIT fintech.

RÈGLES:
- Tu n'effectues JAMAIS d'opérations financières. Tu guides uniquement.
- Réponds en français, sois concis (2-3 phrases max).
- Connais le rôle de l'utilisateur et adapte-toi.
- Propose des boutons d'action quand pertinent.

FRAIS: Retrait 0.7%, Transfert 0.7%, Dépôt gratuit.

RÔLES:
- Client: transfert, portefeuille, historique, paiements, factures, carte, épargne
- Agent: dépôt, retrait, commission, caisse
- Vendeur: produits, paiements reçus
- Admin: gestion users, validation, transactions

NAVIGATION (routes valides): home, send, withdraw, deposit, history, marketplace, bills, card, savings-goals, referral, settings, profile, notifications, support, agent-dashboard, agent-deposit, agent-withdraw-validate, seller-dashboard, seller-products, ussd

RÉPONSE JSON: {"message":"texte","actions":[{"label":"bouton","page":"route"}]}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userName, userRole, history } = body

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message requis' }, { status: 400 })
    }

    if (!GLM_API_KEY) {
      return NextResponse.json({ success: false, message: 'Clé API non configurée' }, { status: 500 })
    }

    const roleCtx = userRole ? `Utilisateur: "${userName || 'Utilisateur'}", Rôle: "${userRole}".` : ''

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${roleCtx}` },
      ...(history || []).slice(-6).map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4.7-flash',
        messages,
        temperature: 0.5,
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      console.error('GLM API error:', response.status)
      return NextResponse.json(
        { success: false, message: 'Service IA temporairement indisponible.' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let actions: Array<{ label: string; page: string }> = []
    let cleanMessage = content

    try {
      const jsonMatch = content.match(/\{[\s\S]*"message"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        cleanMessage = parsed.message || content
        actions = parsed.actions || []
      }
    } catch {
      cleanMessage = content
    }

    const allowed = ['home','send','withdraw','deposit','history','marketplace','bills','card','savings-goals','referral','settings','profile','notifications','support','agent-dashboard','agent-deposit','agent-withdraw-validate','seller-dashboard','seller-products','ussd']
    actions = actions.filter((a) => allowed.includes(a.page))

    return NextResponse.json({ success: true, message: cleanMessage, actions })
  } catch (error) {
    console.error('Trait AI error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne.' },
      { status: 500 }
    )
  }
}
