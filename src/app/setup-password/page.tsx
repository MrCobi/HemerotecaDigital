// app/setup-password/page.tsx

import SetupPasswordForm from './setup-password-form';
import PasswordProtection from './PasswordProtection';
import { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Configurar contraseña | Hemeroteca Digital',
  description: 'Configura tu contraseña para completar el registro',
};

export default function SetupPasswordPage() {
  return (
    <PasswordProtection>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full filter blur-3xl opacity-50"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-100 dark:bg-indigo-900/20 rounded-full filter blur-3xl opacity-50"></div>
        </div>
        
        <div className="relative w-full max-w-md z-10">
          {/* Logo or branding element */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          <SetupPasswordForm />
          
          <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Hemeroteca Digital. Todos los derechos reservados.
          </div>
        </div>
      </main>
    </PasswordProtection>
  );
}
