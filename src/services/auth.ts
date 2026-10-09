import type { UserRole } from '../types';

export interface StoredUser {
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  createdAt: string;
}

const USERS_KEY = 'm20_users';

function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function setUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to persist users:', err);
  }
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: 'Enter both email and password.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const users = getUsers();
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const passwordHash = await hashPassword(password, salt);
  const role: UserRole = normalized.includes('admin') ? 'admin' : 'user';

  const newUser: StoredUser = {
    email: normalized,
    passwordHash,
    salt: Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
    role,
    createdAt: new Date().toISOString(),
  };

  setUsers([...users, newUser]);
  return { ok: true };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; role?: UserRole }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: 'Enter both email and password.' };
  }

  const users = getUsers();
  const user = users.find((u) => u.email === normalized);
  if (!user) {
    return { ok: false, error: 'No account found with this email.' };
  }

  const salt = new Uint8Array(
    user.salt.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const passwordHash = await hashPassword(password, salt);

  if (passwordHash !== user.passwordHash) {
    return { ok: false, error: 'Incorrect password.' };
  }

  return { ok: true, role: user.role };
}

export function logoutUser(): void {
  localStorage.removeItem('m20_auth');
}

export function getCurrentUser(): { email: string; role: UserRole } | null {
  try {
    const auth = localStorage.getItem('m20_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      if (parsed.loggedIn === true) {
        return { email: parsed.email, role: parsed.role || 'user' };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function setSession(email: string, role: UserRole): void {
  localStorage.setItem(
    'm20_auth',
    JSON.stringify({ email, role, loggedIn: true })
  );
}