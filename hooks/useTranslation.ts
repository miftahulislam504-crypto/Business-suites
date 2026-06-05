import { useAppStore } from '@/store/useAppStore'
import { t } from '@/lib/translations'

export function useTranslation() {
  const language = useAppStore((s) => s.language)
  return {
    tr: t[language],
    language,
  }
}
