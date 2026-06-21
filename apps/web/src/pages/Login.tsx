import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Card } from '../components/ui';
import { fetchWithRetry } from '../utils/api';

const authSchema = z.object({
  nom: z.string().optional(),
  email: z.string().email("Veuillez saisir un e-mail valide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      nom: '',
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isRegister) {
        if (!data.nom || data.nom.trim() === '') {
          setError("Le nom est obligatoire pour créer un compte");
          setIsLoading(false);
          return;
        }

        // Register API call
        const response = await fetchWithRetry('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            nom: data.nom,
            email: data.email,
            password: data.password
          }),
        });

        const resData = await response.json();

        if (response.ok) {
          // Registration automatically logs in and provides JWT token
          login(resData.user, resData.token);
          navigate('/dashboard');
        } else {
          setError(resData.error || 'Erreur lors de la création du compte.');
        }
      } else {
        // Login API call
        const response = await fetchWithRetry('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: data.email,
            password: data.password
          }),
        });

        const resData = await response.json();

        if (response.ok) {
          login(resData.user, resData.token);
          navigate('/dashboard');
        } else {
          setError(resData.error || 'Adresse email ou mot de passe incorrect.');
        }
      }
    } catch (e) {
      console.error("Auth error:", e);
      setError("Impossible de joindre le serveur. Assurez-vous que l'API est démarrée et que Supabase est connecté.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      
      {/* BACKGROUND GRADIENT DECORATION */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-primary-600 to-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/20 mb-3 text-3xl">
            🏢
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
            Habitia
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            Portail de gestion immobilière premium
          </p>
        </div>

        {/* LOGIN / REGISTER CARD */}
        <Card className="p-8 shadow-2xl relative border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
            {isRegister ? 'Créer un compte administrateur' : 'Ravi de vous revoir'}
          </h2>

          {error && (
            <div className="mb-5 p-3.5 bg-danger-50 border border-danger-100 dark:bg-danger-950/20 dark:border-danger-900/30 rounded-lg flex items-start gap-2.5 text-danger-600 dark:text-danger-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* NAME (REGISTER ONLY) */}
            {isRegister && (
              <div>
                <Input
                  label="Nom complet"
                  type="text"
                  placeholder="Ex: Sadio Diallo"
                  error={errors.nom?.message}
                  {...register('nom')}
                />
              </div>
            )}

            {/* EMAIL */}
            <div>
              <Input
                label="Adresse Email"
                type="email"
                placeholder="Ex: sadio@habitia.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            {/* BUTTON SUBMIT */}
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Traitement en cours...
                  </>
                ) : (
                  isRegister ? 'Créer mon compte' : 'Se connecter'
                )}
              </Button>
            </div>

          </form>

          {/* TOGGLE LINK */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-primary-500 hover:text-primary-600 font-semibold focus:outline-none"
            >
              {isRegister ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? Créer un compte"}
            </button>
          </div>

          {/* HELP HINT */}
          {!isRegister && (
            <div className="mt-5 text-center border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                Comptes de test pré-installés : <br />
                <span className="font-bold text-slate-500 dark:text-slate-400">admin@habitia.com</span> / <span className="font-bold text-slate-500 dark:text-slate-400">admin123</span>
              </p>
            </div>
          )}

        </Card>

      </div>
    </div>
  );
};

export default Login;
