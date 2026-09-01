import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

const SYSTEM_PROMPT = `Tu es TRAIT IA, l'assistant intelligent de l'application TRAIT — une plateforme fintech innovante.

IDENTITÉ:
- Tu es TRAIT IA, assistant virtuel intégré à l'application TRAIT
- Tu es amical, professionnel et efficace
- Tu parles en français avec un ton chaleureux
- Tu te souviens de ce que l'utilisateur a dit précédemment dans la conversation

CAPACITÉS:
- Tu peux expliquer comment utiliser chaque fonctionnalité de l'app
- Tu peux guider l'utilisateur vers les bonnes pages
- Tu peux répondre sur les frais, les transactions, la carte, l'épargne
- Tu peux expliquer le rôle des agents et des vendeurs
- Tu ne peux PAS effectuer de vraies opérations financières

FRAIS:
- Retrait: 0.7%
- Transfert: 0.7%
- Dépôt: Gratuit

PAGES DISPONIBLES:
home (accueil), send (envoyer), withdraw (retirer), deposit (déposer), history (historique), marketplace (marché), bills (factures), card (carte), savings-goals (épargne), referral (parrainage), settings (paramètres), profile (profil), notifications (notifications), support (support), agent-dashboard, agent-deposit, agent-withdraw-validate, seller-dashboard, seller-products, ussd

STYLE DE RÉPONSE:
- Sois naturel et conversationnel
- Réponds en 2-4 phrases sauf si l'utilisateur demande plus de détails
- Utilise des émojis avec modération
- Propose des actions concrètes avec des boutons quand pertinent
- Si l'utilisateur pose une question hors sujet, redirige poliment vers les fonctionnalités TRAIT

FORMAT JSON: {"message":"réponse","actions":[{"label":"texte du bouton","page":"route"}]}`

function getLocalResponse(message: string, userRole?: string): string | null {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (lower.match(/^(bonjour|salut|hello|hey|coucou|bonsoir|bonne nuit)/)) {
    return "Bonjour ! 👋 Je suis TRAIT IA, votre assistant personnel. Je peux vous aider avec vos transferts, dépôts, retraits, ou vous guider dans l'application. Que souhaitez-vous faire ?"
  }

  if (lower.match(/^(merci|thanks|ok|d'accord|c'est bon)/)) {
    return "Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions. Je suis toujours là pour vous aider."
  }

  if (lower.match(/^(au revoir|bye|a plus|ciao|tchao)/)) {
    return "Au revoir ! 👋 Passez une bonne journée et n'hésitez pas à revenir si vous avez besoin d'aide."
  }

  if (lower.includes('frais') || lower.includes('commiss') || lower.includes('coute')) {
    return "Les frais sur TRAIT sont très avantageux 💰\n\n• Dépôt : Gratuit\n• Retrait : 0.7%\n• Transfert : 0.7%\n\nVoulez-vous effectuer une opération ?"
  }

  if (lower.includes('transfert') || lower.includes('envoyer') || lower.includes('envoie')) {
    return "Pour envoyer de l'argent sur TRAIT 📤\n\n1. Allez dans la page Envoyer\n2. Entrez le montant et le destinataire\n3. Confirmez avec votre PIN\n\nLe transfert est instantané ! Voulez-vous y aller ?"
  }

  if (lower.includes('retrait') || lower.includes('retirer') || lower.includes('cash')) {
    return "Pour retirer de l'argent 💵\n\n1. Allez dans la page Retirer\n2. Choisissez le montant\n3. Sélectionnez un agent proche de vous\n4. Confirmez avec votre PIN\n\nLe retrait coûte 0.7%. Voulez-vous retirer ?"
  }

  if (lower.includes('depot') || lower.includes('deposer') || lower.includes('recharge')) {
    return "Pour déposer de l'argent 🏦\n\n1. Allez dans la page Dépôt\n2. Choisissez le montant\n3. Sélectionnez un agent ou un mode de paiement\n4. Confirmez\n\nLe dépôt est 100% gratuit ! Voulez-vous déposer ?"
  }

  if (lower.includes('solde') || lower.includes('balance') || lower.includes('combien')) {
    return "Pour vérifier votre solde 💳\n\nVotre solde s'affiche en haut de l'écran d'accueil. Vous pouvez aussi aller dans la page Portefeuille pour voir le détail.\n\nVoulez-vous y aller ?"
  }

  if (lower.includes('carte') || lower.includes('card') || lower.includes('virtuelle')) {
    return "La carte TRAIT 💳\n\n• Carte virtuelle sécurisée\n• Utilisable en ligne et en magasin\n• Code CCV visible au dos\n• Gestion directement dans l'app\n\nVoulez-vous voir votre carte ?"
  }

  if (lower.includes('epargne') || lower.includes('savings') || lower.includes('objectif')) {
    return "L'épargne TRAIT 🎯\n\n• Créez des objectifs d'épargne\n• Suivez vos progrès\n• Épargnez automatiquement\n\nVoulez-vous créer un objectif d'épargne ?"
  }

  if (lower.includes('facture') || lower.includes('bill') || lower.includes('payer') || lower.includes('electricite') || lower.includes('eau')) {
    return "Pour payer vos factures 📄\n\n1. Allez dans la page Factures\n2. Choisissez le type de facture\n3. Entrez votre numéro client\n4. Payez directement depuis votre portefeuille\n\nC'est simple et rapide ! Voulez-vous payer une facture ?"
  }

  if (lower.includes('marche') || lower.includes('marketplace') || lower.includes('acheter') || lower.includes('produit')) {
    return "Le marché TRAIT 🛒\n\n• Parcourez les produits des vendeurs locaux\n• Payez directement depuis l'app\n• Livraison ou retrait sur place\n\nVoulez-vous explorer le marché ?"
  }

  if (lower.includes('agent') || lower.includes('agence')) {
    return "Les agents TRAIT 🏪\n\n• Les agents sont des partenaires vérifiés\n• Ils facilitent vos dépôts et retraits\n• Commission attractive pour les agents\n\nVoulez-vous trouver un agent ?"
  }

  if (lower.includes('parrainage') || lower.includes('referral') || lower.includes('ami') || lower.includes('inviter')) {
    return "Le parrainage TRAIT 🎁\n\n• Partagez votre code de parrainage\n• Gagnez des bonus pour chaque ami inscrit\n• Voir dans la page Parrainage\n\nVoulez-vous voir votre code ?"
  }

  if (lower.includes('securite') || lower.includes('pin') || lower.includes('code')) {
    return "La sécurité TRAIT 🔒\n\n• Code PIN à 4 chiffres\n• Authentification par empreinte/visage\n• Chiffrement de toutes les données\n• Bloquer/débloquer la carte en 1 clic\n\nVoulez-vous modifier votre PIN ?"
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userName, userRole, history } = body

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message requis' }, { status: 400 })
    }

    const localResponse = getLocalResponse(message, userRole)
    if (localResponse) {
      const actions: Array<{ label: string; page: string }> = []
      const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (lower.match(/transfert|envoyer|envoie/)) actions.push({ label: 'Envoyer maintenant', page: 'send' })
      else if (lower.match(/retrait|retirer|cash/)) actions.push({ label: 'Retirer', page: 'withdraw' })
      else if (lower.match(/depot|deposer|recharge/)) actions.push({ label: 'Déposer', page: 'deposit' })
      else if (lower.match(/solde|balance/)) actions.push({ label: 'Voir mon solde', page: 'home' })
      else if (lower.match(/carte|card/)) actions.push({ label: 'Voir ma carte', page: 'card' })
      else if (lower.match(/epargne|savings/)) actions.push({ label: "Créer un objectif", page: 'savings-goals' })
      else if (lower.match(/facture|bill|payer/)) actions.push({ label: 'Payer une facture', page: 'bills' })
      else if (lower.match(/marche|marketplace|produit/)) actions.push({ label: 'Explorer le marché', page: 'marketplace' })
      else if (lower.match(/parrainage|referral/)) actions.push({ label: 'Voir mon code', page: 'referral' })

      return NextResponse.json({ success: true, message: localResponse, actions })
    }

    if (!GLM_API_KEY) {
      return NextResponse.json({
        success: true,
        message: "Je suis TRAIT IA, votre assistant. Comment puis-je vous aider aujourd'hui ?",
        actions: [],
      })
    }

    const roleCtx = userRole
      ? `\n\nCONTEXTE: L'utilisateur s'appelle "${userName || 'Utilisateur'}" et a le rôle "${userRole}". Adapte tes réponses à son rôle.`
      : ''

    const conversationHistory = (history || []).slice(-8).map((h: { role: string; content: string }) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    }))

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}${roleCtx}` },
      ...conversationHistory,
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
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('GLM API error:', response.status, errText.slice(0, 300))
      return NextResponse.json({
        success: true,
        message: "Je rencontre un petit souci technique. En attendant, vous pouvez naviguer dans l'app avec les boutons ci-dessous. Que souhaitez-vous faire ?",
        actions: [
          { label: '🏠 Accueil', page: 'home' },
          { label: '📤 Envoyer', page: 'send' },
          { label: '💵 Retirer', page: 'withdraw' },
        ],
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: true,
        message: "Je suis TRAIT IA, votre assistant. Je suis là pour vous aider avec toutes vos questions sur TRAIT. N'hésitez pas à me demander !",
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

    cleanMessage = cleanMessage
      .replace(/^(Réponse:|Response:|Answer:)/i, '')
      .trim()

    const allowed = ['home','send','withdraw','deposit','history','marketplace','bills','card','savings-goals','referral','settings','profile','notifications','support','agent-dashboard','agent-deposit','agent-withdraw-validate','seller-dashboard','seller-products','ussd']
    actions = actions.filter((a) => allowed.includes(a.page))

    return NextResponse.json({ success: true, message: cleanMessage, actions })
  } catch (error: any) {
    console.error('Trait AI error:', error?.message || error)
    let msg = "Je suis TRAIT IA, votre assistant. Comment puis-je vous aider ?"
    let actions: Array<{ label: string; page: string }> = []

    if (error?.name === 'AbortError') {
      msg = "La requête a pris trop de temps. Voici ce que je peux faire pour vous :"
      actions = [
        { label: '🏠 Accueil', page: 'home' },
        { label: '📤 Envoyer', page: 'send' },
        { label: '💵 Retirer', page: 'withdraw' },
        { label: '📄 Factures', page: 'bills' },
      ]
    }

    return NextResponse.json({ success: true, message: msg, actions })
  }
}
