import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useRefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresca la página en Next.js para volver a consultar los datos frescos al servidor
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);
}