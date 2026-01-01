import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;
  const isRTL = currentLanguage === 'ar';

  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  }, [currentLanguage, i18n]);

  const setLanguage = useCallback((lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  return {
    currentLanguage,
    isRTL,
    toggleLanguage,
    setLanguage,
  };
};
