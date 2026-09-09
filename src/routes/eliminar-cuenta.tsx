import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/eliminar-cuenta')({
  component: EliminarCuentaPage,
})

function EliminarCuentaPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Eliminar cuenta de ControlTaxi</h1>
      <p>Aquí va tu formulario o lógica de eliminación de cuenta...</p>
    </div>
  )
}
