import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

export interface AuthUser {
  authId: string;
  userId: number;
  clientId: number;
  role: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    return c.json({ error: 'Server misconfigured: missing JWT secret' }, 500);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { sub: string; role?: string };
    const authId = decoded.sub;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, client_id, rol')
      .eq('auth_id', authId)
      .single();

    if (error || !user) {
      return c.json({ error: 'User not found' }, 401);
    }

    c.set('authUser', {
      authId,
      userId: user.id,
      clientId: user.client_id,
      role: user.rol,
    } as AuthUser);

    await next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return c.json({ error: 'Token expired' }, 401);
    }
    return c.json({ error: 'Invalid token' }, 401);
  }
}
