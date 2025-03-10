import { object, string } from "zod"
 
export const loginSchema = object({
  email: string({ required_error: "Se necesita un email" })
    .min(1, "Escribe tu email")
    .email("Email no valido"),
  password: string({ required_error: "Password is required" })
    .min(1, "Escribe la contraseña")
    .min(6, "Longitud mínima de 6 caracteres")
    .max(32, "Longitud máxima de 32 caracteres"),
})

export const SignUpSchema = object({
  name: string({ required_error: "Se necesita un nombre" })
    .min(1, "Escribe tu nombre")
    .max(50, "El nombre no puede tener más de 50 caracteres"),

  username: string({ required_error: "Se necesita un nombre de usuario" })
    .min(1, "Escribe tu nombre de usuario")
    .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Solo letras, números y guiones bajos (_) permitidos"
    ),

  email: string({ required_error: "Se necesita un email" })
    .min(1, "Escribe tu email")
    .email("Email no válido"),

  password: string({ required_error: "Se necesita una contraseña" })
    .min(6, "Mínimo 6 caracteres")
    .max(32, "Máximo 32 caracteres"),

    image: string().optional().default("/images/AvatarPredeterminado.webp"),
});