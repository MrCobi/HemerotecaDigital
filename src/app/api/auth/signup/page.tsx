// app/api/auth/signup/page.tsx
import React from 'react';
import SignUpForm from './_components/signup-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro | Hemeroteca Digital',
  description: 'Crea una cuenta para acceder a nuestra colección de periódicos y documentos históricos',
};

export default function SignUpPage() {
  return (
    <main>
      <SignUpForm />
    </main>
  );
}