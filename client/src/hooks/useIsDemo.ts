import { useAppStore } from '@/store/appStore'

export function useIsDemo() {
  const user = useAppStore((s) => s.user)
  return user?.id === 'demo'
}
