import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex bg-[#f0f9ff] dark:bg-[#0b1329] transition-colors duration-200 font-sans">
      
      {/* LEFT COLUMN: AUTH FORM */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white dark:bg-[#0b1329] z-10 shadow-xl lg:shadow-none">
        
        {/* LOGO SECTION */}
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10 text-[#185a7d] dark:text-sky-400" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Left door/rectangle */}
            <path d="M6 6H18V34H6V6Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Right window/arch */}
            <path d="M22 34V6H28C32.4183 6 36 9.58172 36 14V34H22Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
          </svg>
          <span className="text-2xl font-bold text-[#185a7d] dark:text-sky-400 tracking-tight">Habitia</span>
        </div>

        {/* MIDDLE SECTION: FORM CONTAINER */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          
          <h1 className="text-3xl font-bold text-[#185a7d] dark:text-sky-400 mb-2">
            {isRegister ? 'Création de compte' : 'Connexion'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            {isRegister 
              ? 'Enregistrez-vous pour configurer votre accès administrateur' 
              : 'Connectez-vous pour accéder à votre compte'
            }
          </p>

          {/* TAB SELECTOR */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`pb-3 text-sm font-semibold transition-all relative ${!isRegister ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`ml-6 pb-3 text-sm font-semibold transition-all relative ${isRegister ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Créer un compte
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 rounded-lg flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* FULL NAME (ONLY ON REGISTER) */}
            {isRegister && (
              <div className="relative">
                <input
                  type="text"
                  id="nom"
                  className={`block px-4 py-3.5 w-full text-sm text-slate-900 dark:text-white bg-transparent border rounded-md focus:outline-none focus:ring-0 peer ${errors.nom ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-sky-500'}`}
                  placeholder=" "
                  {...register('nom')}
                />
                <label
                  htmlFor="nom"
                  className="absolute text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0b1329] px-1 duration-200 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-sky-600 dark:peer-focus:text-sky-400 pointer-events-none"
                >
                  Nom complet
                </label>
                {errors.nom && (
                  <p className="mt-1 text-xs text-red-500">{errors.nom.message}</p>
                )}
              </div>
            )}

            {/* EMAIL FIELD */}
            <div className="relative">
              <input
                type="email"
                id="email"
                className={`block px-4 py-3.5 w-full text-sm text-slate-900 dark:text-white bg-transparent border rounded-md focus:outline-none focus:ring-0 peer ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-sky-500'}`}
                placeholder=" "
                {...register('email')}
              />
              <label
                htmlFor="email"
                className="absolute text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0b1329] px-1 duration-200 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-sky-600 dark:peer-focus:text-sky-400 pointer-events-none"
              >
                E-mail
              </label>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* PASSWORD FIELD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className={`block px-4 py-3.5 pr-10 w-full text-sm text-slate-900 dark:text-white bg-transparent border rounded-md focus:outline-none focus:ring-0 peer ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-sky-500'}`}
                placeholder=" "
                {...register('password')}
              />
              <label
                htmlFor="password"
                className="absolute text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0b1329] px-1 duration-200 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-sky-600 dark:peer-focus:text-sky-400 pointer-events-none"
              >
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD */}
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <span>Se souvenir de moi</span>
              </label>
              <button
                type="button"
                onClick={() => alert("Fonctionnalité indisponible en mode de démonstration.")}
                className="text-xs text-red-400 hover:text-red-500 hover:underline font-medium"
              >
                Mot de passe oublié
              </button>
            </div>

            {/* BUTTON SUBMIT */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#185a7d] hover:bg-[#134966] text-white font-semibold py-3.5 px-4 rounded-md transition-colors duration-150 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-sky-900/10"
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
              </button>
            </div>

          </form>

          {/* HELP HINT FOR TEST ACCOUNTS */}
          {!isRegister && (
            <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800/60 pt-6">
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                Comptes de test pré-installés : <br />
                <span className="font-bold text-slate-500 dark:text-slate-400">admin@habitia.com</span> / <span className="font-bold text-slate-500 dark:text-slate-400">admin123</span>
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="text-center lg:text-left">
          <p className="text-3xs text-slate-400 dark:text-slate-600">
            &copy; 2026 Habitia. Tous droits réservés.
          </p>
        </div>

      </div>

      {/* RIGHT COLUMN: BEAUTIFUL RUSTIC BACKGROUND IMAGE */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative overflow-hidden bg-sky-100">
        <img
          src="/login_bg.png"
          className="absolute inset-0 w-full h-full object-cover select-none"
          alt="Cozy room window look"
        />
        {/* Soft elegant gradient overlay to match sky blue atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#185a7d]/10 to-transparent pointer-events-none" />
      </div>

    </div>
  );
};

export default Login;
