import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Inicializa tu cliente de Supabase usando las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function Route() {
  const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
      const [mensaje, setMensaje] = useState('')

        const handleEliminar = async (e: React.FormEvent) => {
            e.preventDefault()
                if (!email) return

                    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de ${email} y todos sus datos en Supabase? Esta acción no se puede deshacer.`)
                        if (!confirmar) return

                            setLoading(true)
                                setMensaje('')

                                    try {
                                          // Llama a la función que creamos en Supabase
                                                const { error } = await supabase.rpc('delete_user_account', { user_email: email })

                                                      if (error) throw error

                                                            setMensaje('Tu cuenta y todos tus datos asociados han sido eliminados correctamente de forma permanente.')
                                                                  setEmail('')
                                                                      } catch (error) {
                                                                            console.error('Error al eliminar:', error)
                                                                                  setMensaje('Hubo un error al procesar la solicitud o el correo no existe en el sistema. También puedes escribir directamente a txtransfer@hotmail.com.')
                                                                                      } finally {
                                                                                            setLoading(false)
                                                                                                }
                                                                                                  }

                                                                                                    return (
                                                                                                        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "40px auto", padding: "20px", color: "#333" }}>
                                                                                                              <h1 style={{ color: "#d9534f" }}>Eliminar cuenta y datos</h1>
                                                                                                                    <p>
                                                                                                                            Lamentamos que quieras marcharte. Si deseas eliminar permanentemente tu cuenta de <strong>ControlTaxi</strong>, tus ingresos, gastos y datos asociados en Supabase, introduce tu correo electrónico:
                                                                                                                                  </p>
                                                                                                                                        
                                                                                                                                              <form onSubmit={handleEliminar}>
                                                                                                                                                      <label htmlFor="email" style={{ display: "block", marginBottom: "5px" }}>Correo electrónico de la cuenta:</label>
                                                                                                                                                              <input 
                                                                                                                                                                        type="email" 
                                                                                                                                                                                  id="email" 
                                                                                                                                                                                            value={email}
                                                                                                                                                                                                      onChange={(e) => setEmail(e.target.value)}
                                                                                                                                                                                                                required 
                                                                                                                                                                                                                          placeholder="ejemplo@correo.com" 
                                                                                                                                                                                                                                    style={{ width: "100%", padding: "10px", boxSizing: "border-box", marginBottom: "15px" }}
                                                                                                                                                                                                                                            />
                                                                                                                                                                                                                                                    <button 
                                                                                                                                                                                                                                                              type="submit" 
                                                                                                                                                                                                                                                                        disabled={loading}
                                                                                                                                                                                                                                                                                  style={{ width: "100%", padding: "10px", backgroundColor: "#d9534f", color: "white", border: "none", cursor: "pointer", fontSize: "16px" }}
                                                                                                                                                                                                                                                                                          >
                                                                                                                                                                                                                                                                                                    {loading ? 'Eliminando datos...' : 'Eliminar mi cuenta y datos permanentemente'}
                                                                                                                                                                                                                                                                                                            </button>
                                                                                                                                                                                                                                                                                                                  </form>

                                                                                                                                                                                                                                                                                                                        {mensaje && (
                                                                                                                                                                                                                                                                                                                                <p style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f9f9f9", borderLeft: "4px solid #d9534f" }}>
                                                                                                                                                                                                                                                                                                                                          {mensaje}
                                                                                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                                                                                                                        )}
                                                                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                                                                    <p style={{ fontSize: "12px", color: "#666", marginTop: "20px" }}>
                                                                                                                                                                                                                                                                                                                                                                            Si tienes algún problema, puedes ponerte en contacto a través de <strong>txtransfer@hotmail.com</strong>.
                                                                                                                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                                        