# backend/app/main.py

from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from app.api.routes.auth import router as auth_router
#from app.api.routes.requests import router as requests_router
from app.api.routes.users import router as users_router
from app.api.routes.campaigns import router as campaigns_router
from app.api.routes.assignments import router as assignments_router
from app.api.routes.companies import router as companies_router
from app.api.dependencies.auth import get_current_user
from app.infrastructure.db.session import SessionLocal
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.reports import router as reports_router


app = FastAPI(
    title="Sistema de Gestión de Recolección de Residuos",
    description="API para gestión de recolección de residuos.",
    version="1.0.0",
    docs_url=None,  # Desactiva la ruta /docs por defecto
    redoc_url=None  # Opcional: desactiva ReDoc
)

# Incluir rutas
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
#app.include_router(requests_router, prefix="/requests", tags=["Recolecciones"])
app.include_router(campaigns_router, prefix="/campaigns", tags=["Campañas"])
app.include_router(assignments_router, prefix="/assignments", tags=["Asignaciones"])
app.include_router(users_router, prefix="/users", tags=["Usuarios"])
app.include_router(companies_router, prefix="/companies", tags=["Empresas"])
app.include_router(reports_router)

# Middleware para manejar errores
@app.exception_handler(Exception)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )

# Generar esquema OpenAPI sin OAuth2
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # ✅ Eliminar la sección de seguridad (OAuth2)
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    # Aplicar seguridad Bearer a todas las rutas protegidas
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            if isinstance(operation, dict) and "tags" in operation:
                # Solo aplica a rutas que usen get_current_user
                if "Auth" not in operation["tags"]:
                    operation["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi  # ✅ Asignar el esquema personalizado

# Ruta personalizada para Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=app.title + " - Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        oauth2_redirect_url=None,  # ⛔ Desactiva OAuth2
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)