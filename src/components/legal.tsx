import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Marca, PieMarca } from "@/components/marca";

export function LegalPage({ tipo }: { tipo: "privacidad" | "cookies" }) {
  const privacidad = tipo === "privacidad";

  return (
    <main className="min-h-dvh bg-background px-5 pb-10 pt-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mt-7">
          <Marca oscuro />
        </div>
        <article className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-9">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Información legal</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
            {privacidad ? "Política de privacidad" : "Política de cookies"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Última actualización: septiembre de 2026</p>

          {privacidad ? <Privacidad /> : <Cookies />}
        </article>
        <PieMarca />
      </div>
    </main>
  );
}

function Privacidad() {
  return (
    <div className="mt-8 space-y-7 text-sm leading-6 text-muted-foreground">
      <Seccion titulo="1. Responsable del tratamiento">
        <p>El responsable de los datos tratados en ControlTaxi es Naufal.</p>
        <p>Contacto: naufaal@outlook.com</p>
      </Seccion>
      <Seccion titulo="2. Datos que tratamos">
        <p>Tratamos el correo electrónico y la información necesaria para crear y proteger tu cuenta.</p>
        <p>Si utilizas la aplicación, puedes guardar ingresos, gastos, documentos y facturas. Estos datos se almacenan asociados a tu cuenta.</p>
      </Seccion>
      <Seccion titulo="3. Finalidades y base legal">
        <p>Usamos los datos para prestar las funciones de ControlTaxi, guardar tu información, generar facturas y proteger el servicio. La base legal es la ejecución del servicio solicitado al crear y utilizar la cuenta.</p>
        <p>Podemos registrar eventos técnicos de uso, como visitas al panel, para medir el funcionamiento y mejorar la aplicación.</p>
      </Seccion>
      <Seccion titulo="4. Conservación y seguridad">
        <p>Conservamos los datos mientras mantengas la cuenta o mientras sean necesarios para cumplir obligaciones legales. Aplicamos controles de acceso para que cada usuario solo pueda consultar sus propios datos.</p>
      </Seccion>
      <Seccion titulo="5. Tus derechos">
        <p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad de tus datos escribiendo a naufaal@outlook.com. También puedes reclamar ante la Agencia Española de Protección de Datos.</p>
      </Seccion>
      <Seccion titulo="6. Cambios">
        <p>Esta política puede actualizarse para reflejar cambios legales o funcionales. Publicaremos la versión vigente en esta página.</p>
      </Seccion>
    </div>
  );
}

function Cookies() {
  return (
    <div className="mt-8 space-y-7 text-sm leading-6 text-muted-foreground">
      <Seccion titulo="1. Qué son las cookies">
        <p>Las cookies son pequeños archivos que se guardan en el dispositivo al visitar una web. ControlTaxi utiliza únicamente tecnologías necesarias para prestar el servicio.</p>
      </Seccion>
      <Seccion titulo="2. Tecnologías utilizadas">
        <p>La autenticación de Supabase puede utilizar almacenamiento del navegador para mantener la sesión iniciada. ControlTaxi también utiliza almacenamiento local para conservar movimientos, datos del emisor y el contador local de facturas.</p>
        <p>Estas tecnologías son técnicas o necesarias para funciones solicitadas por el usuario. No usamos cookies publicitarias ni vendemos información personal.</p>
      </Seccion>
      <Seccion titulo="3. Proveedores externos">
        <p>Supabase y el proveedor de alojamiento pueden establecer tecnologías técnicas necesarias para seguridad, sesión y entrega de la aplicación, conforme a sus propias políticas.</p>
      </Seccion>
      <Seccion titulo="4. Cómo gestionarlas">
        <p>Puedes borrar o bloquear el almacenamiento desde la configuración de tu navegador. Si lo haces, es posible que no puedas iniciar sesión o utilizar algunas funciones de ControlTaxi.</p>
      </Seccion>
      <Seccion titulo="5. Contacto y cambios">
        <p>Para dudas sobre estas tecnologías, escribe a naufaal@outlook.com. Esta política puede actualizarse si cambian las funciones o los proveedores utilizados.</p>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-foreground">{titulo}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
