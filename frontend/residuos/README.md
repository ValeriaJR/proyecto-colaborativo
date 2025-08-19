Requisitos previos
Node.js 18+ (recomendado 18 LTS o 20 LTS).

npm (viene con Node).

Git para clonar el repositorio.

Comprueba versiones: node -v y npm -v.

Tecnologías y dependencias usadas
Proyecto basado en Next.js (App Router) con React y Bootstrap. Además:

Bootstrap (estilos básicos y modales).

react-calendar (calendario funcional en Agendar y Reprogramar).

recharts (gráficos en Perfil e Informes del administrador).

localStorage para simular persistencia (reservas, perfil, asignaciones, etc.).

Dependencias principales que deben estar en package.json:

next

react

react-dom

bootstrap

react-calendar

recharts

Clonado e instalación
Clonar el repositorio y entrar a la carpeta del proyecto:
git clone <URL_DEL_REPO> → cd <carpeta_del_repo>

Instalar dependencias:
npm install

Ejecución en desarrollo (localhost:3000)
Levantar el servidor de desarrollo:
npm run dev

Abrir en el navegador:
http://localhost:3000

Si ya hay otro proceso usando el puerto 3000, ciérralo o cambia el puerto al ejecutar (PORT=3001 npm run dev en macOS/Linux; en Windows usa set PORT=3001 && npm run dev).

Build y ejecución en producción (opcional)
Construir: npm run build

Ejecutar: npm start
La app levantará también en http://localhost:3000 salvo que definas otro puerto.

Estructura funcional (qué hay y dónde)
Pantallas de usuario

Agendar: calendario + lista de horarios; abre modal para detallar residuos. Guarda una reserva simulada en localStorage["ultima_reserva"].

Perfil: datos editables (modal), recolecciones futuras/pasadas (lee de localStorage["reservas"] y mueve ultima_reserva a esa lista), gráfico por mes con recharts.

Recolector

Lista de recolecciones asignadas (simuladas), filtros por fecha y barrio, botón Verificar que abre modal para revisar items y añadir observaciones; al “Recolectar” pasa a histórico en localStorage["recolecciones_realizadas"].

Administrador

Asignar: tabla de solicitudes (mock), filtro por tipo de residuo, botón Asignar abre modal para elegir recolector; guarda en localStorage["admin_solicitudes"] y localStorage["asignaciones"].

Informes: dos gráficos con recharts y filtros:

Barras → filtra por localidad y muestra cantidad por tipo.

Torta → filtra por residuo y muestra cantidad por localidad.

Persistencia: todo es simulado con localStorage; no hay backend ni base de datos.

Estilos y componentes clave
Bootstrap CSS se importa globalmente (en app/layout.js).

Bootstrap JS se carga dinámicamente en cliente dentro de cada página que use modales (import("bootstrap") en un useEffect) para evitar errores de SSR.

Paleta:

Verde marca: #66C261 (botones/acentos).

Inputs en gris (usar el gris que definiste en --input-gray).

La barra de navegación se coloca dentro del contenedor con fondo (auth-bg) y en admin se usa versión “sticky”:

header con position-sticky top-0 y z-index alto.

Contenido con margen/espaciado superior para que no quede debajo.

.gitignore recomendado
Asegúrate de tener un .gitignore que excluya artefactos y dependencias:

node_modules/

.next/ y out/

*.log

.env*

archivos del SO (.DS_Store, Thumbs.db)

Si alguna vez se subió node_modules, ejecuta: git rm -r --cached node_modules y vuelve a commitear.

Problemas comunes y cómo resolver
“document/localStorage is not defined”
Ocurre si accedes a APIs del navegador durante SSR. Solución: usa useEffect y verifica typeof window !== "undefined" antes de usar localStorage. Carga Bootstrap JS solo en cliente con import("bootstrap").

El modal no abre
Asegúrate de:

Haber cargado bootstrap en cliente (useEffect).

Usar la instancia correcta: const m = bs.Modal.getInstance(el) || new bs.Modal(el); m.show();

Que el id del modal en el HTML coincida con el que seleccionas.

Resumen de comandos
Instalar: npm install

Dev server (localhost:3000): npm run dev

Build prod: npm run build

Start prod: npm start