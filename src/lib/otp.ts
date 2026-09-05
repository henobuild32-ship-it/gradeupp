import { randomInt } from 'crypto'

export function generateOTP(): string {
  return randomInt(100000, 999999).toString()
}
