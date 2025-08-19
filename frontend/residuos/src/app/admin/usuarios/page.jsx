"use client";

import { useState } from "react";

export default function AdminUsuariosPage() {
  // Estados para los formularios
  const [formUser, setFormUser] = useState({
    email: "",
    full_name: "",
    role: "USER",
    password: "",
    address: "",
    phone: "",
    company_id: "" // Puede ser string o vacío, lo convertimos a null al enviar
  });

  const [formCompany, setFormCompany] = useState({
    name: ""
  });

  // Manejo de cambios en el formulario de usuario
  const handleChangeUser = (e) => {
    const { name, value } = e.target;
    
    setFormUser(prev => {
      // Si el rol cambia a algo que no es COLLECTOR, limpiar company_id
      if (name === "role" && value !== "COLLECTOR") {
        return { ...prev, [name]: value, company_id: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  // Manejo de cambios en el formulario de empresa
  const handleChangeCompany = (e) => {
    const { name, value } = e.target;
    setFormCompany(prev => ({ ...prev, [name]: value }));
  };

  // Crear usuario
  const handleSubmitUser = async (e) => {
    e.preventDefault();

    // Convertir company_id a null si está vacío
    const payload = {
      ...formUser,
      company_id: formUser.company_id?.trim() === "" ? null : formUser.company_id
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Usuario creado correctamente");
        setFormUser({
          email: "",
          full_name: "",
          role: "USER",
          password: "",
          address: "",
          phone: "",
          company_id: ""
        });
      } else {
        alert(`Error: ${data.detail || "No se pudo crear el usuario"}`);
      }
    } catch (err) {
      console.error("Error al crear usuario:", err);
      alert("Error de conexión con el servidor");
    }
  };

  // ✅ Crear empresa
  const handleSubmitCompany = async (e) => {
    e.preventDefault();

    const trimmedName = formCompany.name.trim();
    if (!trimmedName) {
      alert("El nombre de la empresa es obligatorio");
      return;
    }

    try {
      // ✅ Enviar el nombre como query parameter
      const url = `http://127.0.0.1:8000/companies/companies/?name=${encodeURIComponent(trimmedName)}`;
      const token = localStorage.getItem("auth_token");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${token}` // ✅ Importante: incluir el token
        }
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Empresa creada correctamente: ${data.message}`);
        setFormCompany({ name: "" });
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error: ${errorData.detail || "No se pudo crear la empresa"}`);
      }
    } catch (err) {
      console.error("Error al crear empresa:", err);
      alert("Error de conexión con el servidor");
    }
  };

  return (
    <div className="auth-bg">
      <div className="container mt-4 pt-4">
        {/* Barra de navegación */}
        <header className="position-sticky top-0 w-100 my-5" style={{ zIndex: 1000 }}>
          <nav className="topbar-inner d-flex align-items-center justify-content-end gap-2 px-3 py-2">
            <a href="/admin/informes" className="nav-pill">Informes</a>
            <a href="/admin" className="nav-pill">Asignar</a>
            <a href="/admin/usuarios" className="nav-pill active">Usuarios</a>
            <a href="/admin/calendarios" className="nav-pill">Campañas</a>
            <button
              className="nav-pill ms-auto"
              onClick={() => (location.href = "/login")}
            >
              Cerrar sesión
            </button>
          </nav>
        </header>

        <div className="row g-4">
          {/* Formulario de usuario */}
          <div className="col-md-6">
            <div className="p-4 rounded-3" style={{ background: "rgba(255,255,255,.9)" }}>
              <h3 className="mb-4">Crear Usuario</h3>
              <form onSubmit={handleSubmitUser}>
                <div className="mb-3">
                  <label className="form-label">Nombre completo</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formUser.full_name}
                    onChange={handleChangeUser}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    type="email"
                    name="email"
                    value={formUser.email}
                    onChange={handleChangeUser}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    name="password"
                    value={formUser.password}
                    onChange={handleChangeUser}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Rol</label>
                  <select
                    name="role"
                    value={formUser.role}
                    onChange={handleChangeUser}
                    className="form-select pill"
                  >
                    <option value="USER">Usuario</option>
                    <option value="COLLECTOR">Recolector</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    name="address"
                    value={formUser.address}
                    onChange={handleChangeUser}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formUser.phone}
                    onChange={handleChangeUser}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Empresa (opcional)</label>
                  <input
                    type="text"
                    name="company_id"
                    value={formUser.company_id}
                    onChange={handleChangeUser}
                    placeholder="ID de la empresa (solo para recolectores)"
                    className="form-control pill"
                    disabled={formUser.role !== "COLLECTOR"}
                  />
                  {formUser.role !== "COLLECTOR" && (
                    <small className="text-muted">Solo disponible para el rol 'Recolector'</small>
                  )}
                </div>
                <button type="submit" className="btn btn-brand w-100">
                  Crear Usuario
                </button>
              </form>
            </div>
          </div>

          {/* Formulario de empresa */}
          <div className="col-md-6">
            <div className="p-4 rounded-3" style={{ background: "rgba(255,255,255,.9)" }}>
              <h3 className="mb-4">Crear Empresa Recolectora</h3>
              <form onSubmit={handleSubmitCompany}>
                <div className="mb-3">
                  <label className="form-label">Nombre de la empresa</label>
                  <input
                    type="text"
                    name="name"
                    value={formCompany.name}
                    onChange={handleChangeCompany}
                    required
                    className="form-control pill"
                  />
                </div>
                <button type="submit" className="btn btn-brand w-100">
                  Crear Empresa
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}