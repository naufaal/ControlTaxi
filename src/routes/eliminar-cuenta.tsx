import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client'

export const Route = createFileRoute('/eliminar-cuenta')({
  component: EliminarCuentaPage,
})

function EliminarCuentaPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setMessage(null)

    try {
      // 1. Verificar credenciales estrictamente (si fallan, salta al catch y muestra el error de login)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw new Error('Correo electrónico o contraseña incorrectos.')
      }

      // 2. Ejecutar la función RPC en Supabase para borrar todos los datos y el usuario
      const { error: rpcError } = await supabase.rpc('delete_user_account')

      if (rpcError) {
        throw new Error('Error al eliminar los datos: ' + rpcError.message)
      }

      // 3. Cerrar sesión tras el borrado exitoso
      await supabase.auth.signOut()

      setMessage({
        text: 'Tu cuenta y todos tus datos asociados han sido eliminados correctamente.',
        error: false,
      })
      setEmail('')
      setPassword('')
    } catch (err: any) {
      setMessage({
        text: err.message || 'Correo electrónico o contraseña incorrectos.',
        error: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEmail('')
    setPassword('')
    setMessage(null)
    window.location.href = '/'
  }

  return (
    <div style={{ maxWidth: '450px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Eliminar cuenta de ControlTaxi</h1>
      <p style={{ color: '#666', lineHeight: '1.5', fontSize: '14px' }}>
        De acuerdo con las políticas de Google Play, puedes solicitar la eliminación permanente de tu cuenta y todos tus datos asociados. Ingresa tus datos para verificar tu identidad.
      </p>

      <div style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginTop: '20px' }}>
        <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Usuario (Correo electrónico):
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

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tu contraseña actual"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                background: '#d9534f',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verificando...' : 'Borrar'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '4px',
            background: message.error ? '#f8d7da' : '#d4edda',
            color: message.error ? '#721c24' : '#155724',
            fontSize: '14px',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
