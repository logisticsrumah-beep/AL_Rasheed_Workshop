interface ImportMetaEnv {
  readonly VITE_GOOGLE_SCRIPT_URL: string;
  // Agar yahan GEMINI_API_KEY likha hai to usey mita dein
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}