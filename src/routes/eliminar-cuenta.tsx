import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'form' // o usa React normal según prefieras
import React from 'react'
import { createClient } from '@supabase/supabase-js'

// Inicializa Supabase con tus variables de entorno públicas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const Route = createFileRoute('/eliminar-cuenta')({
  component: EliminarCuentaPage,
})

function EliminarCuentaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setMessage(null)

    try {
      // Llamada a la función RPC de Supabase que configuramos en la base de datos
      const { error } = await supabase.rpc('delete_user_account', { 
        // Dependiendo de cómo reciba el parámetro tu función SQL, ajústalo aquí. 
        // Si borras la cuenta del usuario autenticado actual, asegúrate de que esté logueado,
        // o adapta la función SQL para que busque por email si es un formulario público.
      })

      if (error) throw error

      setMessage({
        text: 'Tu cuenta y todos tus datos asociados han sido eliminados correctamente.',
        error: false,
      })
    } catch (err: any) {
      setMessage({
        text: 'Hubo un error al procesar la solicitud: ' + (err.message || 'Inténtalo de nuevo.'),
        error: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Eliminar cuenta de ControlTaxi</h1>
      <p style={{ color: '#666', lineHeight: '1.5' }}>
        De acuerdo con las políticas de Google Play, puedes solicitar la eliminación completa de tu cuenta y de todos los datos asociados (ingresos, gastos y perfil). Esta acción es irreversible.
      </p>

      <form onSubmit={handleDeleteAccount} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Correo electrónico de tu cuenta:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tucorreo@example.com"
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#d9534f',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Eliminando...' : 'Eliminar mi cuenta y datos'}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '4px',
            background: message.error ? '#f8d7da' : '#d4edda',
            color: message.error ? '#721c24' : '#155724',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
