# Proyecto de Gestión de Residuos ♻️

Este proyecto tiene como objetivo **optimizar la gestión de residuos** mediante una aplicación de software que permita:

- Manejar y asignar residuos
- Crear usuarios con roles especificos
- Agendar la recoleccion de residuos
- Visualizacion de recolecciones

---

## Tecnologías utilizadas
- **Frontend** | Next.js, React, Tailwind CSS, Recharts |
- **Backend** | FastAPI, Python 3.13 |
- **Base de Datos** | PostgreSQL |
- **ORM** | SQLAlchemy |
- **Autenticación** | JWT |
- **Despliegue** | Docker (opcional), Uvicorn, Nginx |


---

## Funcionalidades principales
-  **Autenticación por roles**: ADMIN, USER, COLLECTOR.
-  **Panel de administrador**: Asignación de recolectores, gestión de usuarios y empresas, creación de campañas.
-  **Panel del recolector**: Visualización y finalización de asignaciones.
-  **Agendamiento de recolecciones** por tipo de residuo y zona.
-  **Informes**: Gráficos por localidad, tipo de residuo y volumen.
-  **API RESTful** con FastAPI.
- **Frontend moderno** con Next.js y Tailwind CSS.

## Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd <nombre-del-repo>
```
### 1. Clonar el repositorio
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # En Windows
# source .venv/bin/activate   # En Linux/Mac
pip install -r requirements.txt
```
### 3. Configurar variables de entorno
```bash
# Crear .env en backend/
DATABASE_URL=postgresql://user:password@localhost:5432/waste
SECRET_KEY=una-clave-secreta-muy-larga
```
### 4. Ejecutar migraciones
```bash
alembic upgrade head
```
### 5. Iniciar backend
```bash
uvicorn app.main:app -reload
```
### 6. Iniciar Frontend
```bash
cd ../ # Volver a raiz
npm install
npm run dev
```
### 7. Acceder al sistema
•	Frontend: http://localhost:3000
•	Swagger (API): http://localhost:8000/docs

