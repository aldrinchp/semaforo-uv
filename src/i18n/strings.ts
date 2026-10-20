const es = {
  signInSubtitle: "Inicia sesión",
  registerSubtitle: "Crea tu cuenta",
  email: "Correo",
  password: "Contraseña (mínimo 6 caracteres)",
  show: "Mostrar",
  hide: "Ocultar",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  signInButton: "Entrar",
  registerButton: "Registrarme",
  toRegister: "¿No tienes cuenta? Regístrate",
  toSignIn: "¿Ya tienes cuenta? Inicia sesión",
  missingTitle: "Faltan datos",
  missingBody: "Escribe tu correo y tu contraseña.",
  errorTitle: "No se pudo continuar",
  signedInAs: "Sesión iniciada como:",
  signOut: "Cerrar sesión",
  otherLanguage: "🌐 English",
  changeLanguage: "Cambiar idioma a inglés",
  uvIndex: "Índice UV",
  recommendations: "Recomendaciones",
  pullToRefresh: "Desliza hacia abajo para actualizar",
  profile: "Perfil",
  openSettings: "Abrir ajustes",
  uvErrors: {
    permission: "Necesitamos tu ubicación para consultar el índice UV de tu zona. Actívala en los ajustes.",
    location: "No pudimos obtener tu ubicación. Revisa que el GPS esté activado.",
    network: "No pudimos consultar el índice UV. Revisa tu conexión a internet.",
  },
  // Niveles de la escala de la OMS con sus recomendaciones de protección.
  levels: {
    low: {
      name: "Bajo",
      tips: [
        "Riesgo bajo: puedes estar al aire libre con seguridad.",
        "Usa gafas de sol si el día está muy brillante.",
        "Si tu piel es muy sensible, usa protector solar.",
      ],
    },
    moderate: {
      name: "Moderado",
      tips: [
        "Busca sombra entre las 10:00 y las 16:00.",
        "Usa camiseta, sombrero y gafas de sol.",
        "Aplica protector solar FPS 30+ cada 2 horas.",
      ],
    },
    high: {
      name: "Alto",
      tips: [
        "Reduce el tiempo al sol entre las 10:00 y las 16:00.",
        "Busca sombra y usa ropa que cubra brazos y piernas.",
        "Usa sombrero de ala ancha y gafas con filtro UV.",
        "Aplica protector solar FPS 30+ cada 2 horas y después de nadar o sudar.",
      ],
    },
    veryHigh: {
      name: "Muy alto",
      tips: [
        "Evita el sol entre las 10:00 y las 16:00.",
        "La piel sin protección se quema rápidamente.",
        "Ropa que cubra, sombrero de ala ancha y gafas con filtro UV son imprescindibles.",
        "Aplica protector solar FPS 50+ cada 2 horas.",
      ],
    },
    extreme: {
      name: "Extremo",
      tips: [
        "Evita salir entre las 10:00 y las 16:00.",
        "La piel sin protección puede quemarse en minutos.",
        "Si sales: sombra, ropa que cubra, sombrero, gafas con filtro UV y FPS 50+.",
        "Cuidado con la arena, el agua y la nieve: reflejan los rayos UV.",
      ],
    },
  },
  // Códigos de error de Supabase Auth; los demás se muestran tal cual llegan.
  authErrors: {
    invalid_credentials: "Correo o contraseña incorrectos.",
    user_already_exists: "Ya existe una cuenta con ese correo.",
    weak_password: "La contraseña debe tener al menos 6 caracteres.",
    validation_failed: "El correo no tiene un formato válido.",
  } as Record<string, string>,
};

// `typeof es` obliga a que inglés tenga exactamente las mismas claves que español.
const en: typeof es = {
  signInSubtitle: "Sign in",
  registerSubtitle: "Create your account",
  email: "Email",
  password: "Password (at least 6 characters)",
  show: "Show",
  hide: "Hide",
  showPassword: "Show password",
  hidePassword: "Hide password",
  signInButton: "Sign in",
  registerButton: "Sign up",
  toRegister: "Don't have an account? Sign up",
  toSignIn: "Already have an account? Sign in",
  missingTitle: "Missing information",
  missingBody: "Enter your email and password.",
  errorTitle: "Something went wrong",
  signedInAs: "Signed in as:",
  signOut: "Sign out",
  otherLanguage: "🌐 Español",
  changeLanguage: "Change language to Spanish",
  uvIndex: "UV index",
  recommendations: "Recommendations",
  pullToRefresh: "Pull down to refresh",
  profile: "Profile",
  openSettings: "Open settings",
  uvErrors: {
    permission: "We need your location to get the UV index for your area. Enable it in settings.",
    location: "We couldn't get your location. Make sure GPS is turned on.",
    network: "We couldn't get the UV index. Check your internet connection.",
  },
  levels: {
    low: {
      name: "Low",
      tips: [
        "Low risk: you can safely enjoy being outside.",
        "Wear sunglasses on bright days.",
        "If your skin is very sensitive, use sunscreen.",
      ],
    },
    moderate: {
      name: "Moderate",
      tips: [
        "Seek shade between 10 am and 4 pm.",
        "Wear a shirt, a hat and sunglasses.",
        "Apply SPF 30+ sunscreen every 2 hours.",
      ],
    },
    high: {
      name: "High",
      tips: [
        "Reduce time in the sun between 10 am and 4 pm.",
        "Seek shade and wear clothing that covers your arms and legs.",
        "Wear a wide-brimmed hat and UV-blocking sunglasses.",
        "Apply SPF 30+ sunscreen every 2 hours and after swimming or sweating.",
      ],
    },
    veryHigh: {
      name: "Very high",
      tips: [
        "Avoid the sun between 10 am and 4 pm.",
        "Unprotected skin burns quickly.",
        "Covering clothing, a wide-brimmed hat and UV-blocking sunglasses are a must.",
        "Apply SPF 50+ sunscreen every 2 hours.",
      ],
    },
    extreme: {
      name: "Extreme",
      tips: [
        "Avoid going outside between 10 am and 4 pm.",
        "Unprotected skin can burn in minutes.",
        "If you go out: shade, covering clothing, a hat, UV-blocking sunglasses and SPF 50+.",
        "Beware of sand, water and snow: they reflect UV rays.",
      ],
    },
  },
  authErrors: {
    invalid_credentials: "Incorrect email or password.",
    user_already_exists: "An account with this email already exists.",
    weak_password: "Password must be at least 6 characters.",
    validation_failed: "The email format is not valid.",
  },
};

export const strings = { es, en };
export type Lang = keyof typeof strings;
