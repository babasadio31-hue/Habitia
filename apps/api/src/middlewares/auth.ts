import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { db } from '../services/db';
import { UserRole } from '@habitia/types';

const JWT_SECRET = process.env.JWT_SECRET || 'habitia-super-secret-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nom: string;
    email: string;
    role: UserRole;
    permissions?: any;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé : Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
    const user = await db.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.actif) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou inactif' });
    }

    const personnel = await db.personnel.findUnique({ where: { email: user.email } });
    const permissions = (personnel?.permissions) || (user.permissions) || null;

    req.user = {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role as any,
      permissions: permissions as any
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Accès non autorisé' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Droits insuffisants pour accéder à cette ressource' });
    }

    next();
  };
};
