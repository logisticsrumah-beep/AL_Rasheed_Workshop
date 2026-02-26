// @google/genai import ko hata diya gaya hai
export async function translateText(text: string, targetLanguage: string = 'English'): Promise<string> {
  try {
    // Filhal ke liye ye function wahi text wapas kar dega bina translate kiye
    // Taaki aapki app crash na ho
    return text.trim();
  } catch (error) {
    console.error('Error translating text:', error);
    return 'Translation error';
  }
}
