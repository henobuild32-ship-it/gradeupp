import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

const SYSTEM_PROMPT = `Tu es TRAIT IA, l'assistant intelligent de l'application TRAIT — une plateforme fintech innovante.

IDENTITÉ:
- Tu es TRAIT IA, assistant virtuel intégré à l'application TRAIT
- Tu es amical, professionnel et efficace
- Tu parles en français avec un ton chaleureux

RÈGLES ABSOLUES:
- Tu n'effectues JAMAIS d'opérations financières réelles. Tu guides et informes uniquement.
- Sois concis: 2-3 phrases maximum par réponse
- Propose des boutons d'action quand pertinent
- Adapte-toi au rôle de l'utilisateur

FRAIS DE L'APPLICATION:
- Retrait: 0.7%
- Transfert: 0.7%
- Dépôt: Gratuit

NAVIGATION: home, send, withdraw, deposit, history, marketplace, bills, card, savings-goals, referral, settings, profile, notifications, support, agent-dashboard, agent-deposit, agent-withdraw-validate, seller-dashboard, seller-products, ussd

RÉPONSE JSON: {"message":"texte","actions":[{"label":"bouton","page":"route"}]}`

const FALLBACK_RESPONSES: Record<string, string> = {
  default: "Je suis TRAIT IA, votre assistant. Comment puis-je vous aider avec vos transactions ou la navigation dans l'application ?",
  greeting: "Bonjour ! Je suis TRAIT IA, votre assistant personnel. Je peux vous aider avec vos transferts, dépôts, retraits et bien plus. Que souhaitez-vous faire ?",
  help: "Je peux vous guider pour : envoyer de l'argent, effectuer un dépôt ou retrait, consulter votre historique, gérer votre carte, ou naviguer dans l'application. Que voulez-vous faire ?",
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.match(/^(bonjour|salut|hello|hey|coucou|bonsoir)/)) return FALLBACK_RESPONSES.greeting
  if (lower.match(/(aide|help|comment|comment)/)) return FALLBACK_RESPONSES.help
  return FALLBACK_RESPONSES.default
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userName, userRole, history } = body

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message requis' }, { status: 400 })
    }

    if (!GLM_API_KEY) {
      return NextResponse.json({
        success: true,
        message: getFallbackResponse(message),
        actions: [],
      })
    }

    const roleCtx = userRole
      ? `L'utilisateur s'appelle "${userName || 'Utilisateur'}" et a le rôle "${userRole}".`
      : ''

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
        temperature: 0.6,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('GLM API error:', response.status, errText.slice(0, 200))
      return NextResponse.json({
        success: true,
        message: getFallbackResponse(message),
        actions: [],
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: true,
        message: getFallbackResponse(message),
        actions: [],
      })
    }

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
  } catch (error: any) {
    console.error('Trait AI error:', error?.message || error)
    const msg = error?.name === 'AbortError'
      ? 'La requête a pris trop de temps. Réessayez.'
      : getFallbackResponse('default')
    return NextResponse.json({ success: true, message: msg, actions: [] })
  }
}
