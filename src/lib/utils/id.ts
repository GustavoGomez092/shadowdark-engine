import { nanoid } from 'nanoid';

export function generateId(size = 12): string {
  return nanoid(size);
}

export function generateRoomCode(): string {
  // 8 character alphanumeric code, lowercase for PeerJS compatibility
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No i, l, o, 0, 1 to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
