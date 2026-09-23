import { db } from '@/lib/db';

export function normalizeAgentIdentifier(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function agentIdentifierCandidates(identifier: string): string[] {
  const raw = normalizeAgentIdentifier(identifier);
  if (!raw) return [];

  const digits = raw.replace(/\D/g, '');
  const candidates = new Set<string>([raw]);

  if (raw.startsWith('AGT-')) {
    const bare = raw.slice(4);
    candidates.add(bare);
    if (bare) candidates.add(`AGT-${bare}`);
  }

  if (digits) {
    candidates.add(`AGT-${digits}`);
    candidates.add(digits);
    if (digits.length >= 6) {
      candidates.add(`AGT-${digits.slice(-6)}`);
      candidates.add(digits.slice(-6));
    }
    if (digits.startsWith('228') && digits.length >= 11) {
      candidates.add(`+228${digits.slice(3)}`);
      candidates.add(digits.slice(3));
    }
    candidates.add(`+${digits}`);
  }

  return [...candidates].filter(Boolean);
}

const agentWhereFromIdentifier = (identifier: string) => {
  const candidates = agentIdentifierCandidates(identifier);
  if (!candidates.length) return null;

  const digit = identifier.replace(/\D/g, '');

  return {
    role: 'agent' as const,
    OR: [
      { agentCode: { in: candidates } },
      { agentNumber: { in: candidates } },
      { phone: { in: candidates } },
      ...(digit.length >= 6
        ? [
            { phone: { endsWith: digit.slice(-9) } },
            { phone: { endsWith: digit } },
          ]
        : []),
    ],
  };
};

export async function findAgentByIdentifier(identifier: string) {
  const where = agentWhereFromIdentifier(identifier);
  if (!where) return null;

  const agent = await db.user.findFirst({ where });
  if (agent) return agent;

  const digit = identifier.replace(/\D/g, '');
  if (digit.length >= 6) {
    return db.user.findFirst({
      where: {
        role: 'agent',
        OR: [
          { agentCode: { contains: digit } },
          { agentNumber: { contains: digit } },
        ],
      },
    });
  }

  return null;
}

export async function findActiveAgentByIdentifier(identifier: string) {
  const agent = await findAgentByIdentifier(identifier);
  if (!agent) return null;
  if (agent.suspended || agent.validationStatus !== 'validated') return null;
  return agent;
}
