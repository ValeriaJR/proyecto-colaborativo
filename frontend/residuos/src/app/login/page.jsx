"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const router = useRouter();

  // ✅ Decodificar JWT para obtener el rol
  const getRoleFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role;
    } catch (e) {
      console.error("Error al decodificar el token", e);
      return null;
    }
  };

  // ✅ Login: Llama a API FastAPI
  const onSubmitLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      alert("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Guarda el token
        localStorage.setItem("auth_token", data.access_token);

        // Decodifica el token para obtener el rol
        const userRole = getRoleFromToken(data.access_token);

        // Redirige según el rol
        if (userRole === "ADMIN") {
          router.push("/admin");
        } else if (userRole === "COLLECTOR") {
          router.push("/recolector");
        } else {
          // Cualquier otro rol (como USER)
          router.push("/agendar");
        }

        alert("Inicio de sesión exitoso");
      } else {
        alert("Error: " + (data.detail || "Credenciales inválidas"));
      }
    } catch (err) {
      console.error("Error de conexión con el backend:", err);
      alert("No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en http://127.0.0.1:8000");
    }
  };

  // ✅ Registro: Llama a tu API FastAPI
  const onSubmitRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const full_name = formData.get("full_name");
    const email = formData.get("email");
    const address = formData.get("address");
    const phone = formData.get("phone");
    const password = formData.get("password");

    if (!full_name || !email || !address || !phone || !password) {
      alert("Por favor, completa todos los campos");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          full_name,
          role: "USER",
          password,
          address,
          phone
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registro exitoso. Inicia sesión.");
        setMode("login");
      } else {
        alert("Error: " + (data.detail || "No se pudo registrar"));
      }
    } catch (err) {
      console.error("Error de conexión con el servidor:", err);
      alert("No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo.");
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Toggle entre Login y Registro */}
        <div className="auth-toggle">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Registrarme
          </button>
        </div>

        <h3 className="auth-title">BIENVENIDO</h3>

        {/* Formulario de Login */}
        {mode === "login" ? (
          <form onSubmit={onSubmitLogin} style={{ width: "100%" }}>
            <div className="mb-3">
              <input
                name="email"
                className="form-control pill"
                type="email"
                placeholder="Correo electrónico"
                required
              />
            </div>
            <div className="mb-4">
              <input
                name="password"
                className="form-control pill"
                type="password"
                placeholder="Contraseña"
                required
              />
            </div>
            <button className="btn btn-brand" type="submit">
              Ingresar
            </button>
          </form>
        ) : (
          /* Formulario de Registro */
          <form onSubmit={onSubmitRegister} style={{ width: "100%" }}>
            <div className="mb-2">
              <input
                name="full_name"
                className="form-control pill"
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="mb-2">
              <input
                name="email"
                className="form-control pill"
                type="email"
                placeholder="Correo electrónico"
                required
              />
            </div>
            <div className="mb-2">
              <input
                name="address"
                className="form-control pill"
                placeholder="Dirección"
                required
              />
            </div>
            <div className="mb-2">
              <input
                name="phone"
                className="form-control pill"
                placeholder="Teléfono"
                required
              />
            </div>
            <div className="mb-4">
              <input
                name="password"
                className="form-control pill"
                type="password"
                placeholder="Contraseña"
                required
              />
            </div>
            <button className="btn btn-brand" type="submit">
              Registrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}