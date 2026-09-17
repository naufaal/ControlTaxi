import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

export function useRefreshOnFocus() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Al volver a la app, actualizamos las consultas de Supabase y la ruta
        queryClient.invalidateQueries();
        router.invalidate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, queryClient]);
}