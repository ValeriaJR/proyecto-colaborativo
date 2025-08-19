"use client";

import { useEffect, useState } from "react";

export default function AdminCalendariosPage() {
  // Estado para el formulario de creación
  const [form, setForm] = useState({
    type_of_waste: "organico",
    collection_date: "",
    zone: "",
    max_capacity_kg: "",
    company_id: "",
    slot_times: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"]
  });

  // Estado para las campañas existentes
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar campañas existentes
  useEffect(() => {
    const fetchCampaigns = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/campaigns/campaigns/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setCampaigns(Array.isArray(data) ? data : [data]);
        } else {
          console.error("Error al cargar campañas:", await res.text());
        }
      } catch (err) {
        console.error("Error de conexión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Manejo de cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Manejo de cambios en los horarios
  const handleSlotChange = (index, value) => {
    const newSlots = [...form.slot_times];
    newSlots[index] = value;
    setForm(prev => ({ ...prev, slot_times: newSlots }));
  };

  // Añadir un nuevo horario
  const addSlot = () => {
    setForm(prev => ({
      ...prev,
      slot_times: [...prev.slot_times, ""]
    }));
  };

  // Eliminar un horario
  const removeSlot = (index) => {
    setForm(prev => ({
      ...prev,
      slot_times: prev.slot_times.filter((_, i) => i !== index)
    }));
  };

  // Crear campaña
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validar que la fecha esté presente
    if (!form.collection_date) {
      alert("La fecha de recolección es obligatoria");
      return;
    }

    const payload = {
      ...form,
      max_capacity_kg: parseInt(form.max_capacity_kg, 10),
      // ✅ Usar form.collection_date directamente
      collection_date: `${form.collection_date}T00:00:00Z`
    };

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("http://127.0.0.1:8000/campaigns/campaigns/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Campaña creada correctamente");
        // Reiniciar formulario
        setForm({
          type_of_waste: "organico",
          collection_date: "",
          zone: "",
          max_capacity_kg: "",
          company_id: "",
          slot_times: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"]
        });
        // Refrescar lista
        const resNew = await fetch("http://127.0.0.1:8000/campaigns/campaigns/", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resNew.ok) setCampaigns(await resNew.json());
      } else {
        alert(`Error: ${data.detail || "No se pudo crear la campaña"}`);
      }
    } catch (err) {
      console.error("Error al crear campaña:", err);
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
            <a href="/admin/usuarios" className="nav-pill">Usuarios</a>
            <a href="/admin/calendarios" className="nav-pill active">Campañas</a>
            <button
              className="nav-pill ms-auto"
              onClick={() => (location.href = "/login")}
            >
              Cerrar sesión
            </button>
          </nav>
        </header>

        <div className="row g-4">
          {/* Formulario de creación */}
          <div className="col-md-6">
            <div className="p-4 rounded-3" style={{ background: "rgba(255,255,255,.9)" }}>
              <h3 className="mb-4">Crear Nueva Campaña</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Tipo de residuo</label>
                  <select
                    name="type_of_waste"
                    value={form.type_of_waste}
                    onChange={handleChange}
                    className="form-select pill"
                  >
                    <option value="organico">Orgánico</option>
                    <option value="inorganico">Inorgánico</option>
                    <option value="reciclable">Reciclable</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Fecha de recolección</label>
                  <input
                    type="date"
                    name="collection_date"
                    value={form.collection_date}
                    onChange={handleChange}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Zona</label>
                  <input
                    type="text"
                    name="zone"
                    value={form.zone}
                    onChange={handleChange}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Capacidad máxima (kg)</label>
                  <input
                    type="number"
                    name="max_capacity_kg"
                    value={form.max_capacity_kg}
                    onChange={handleChange}
                    required
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">ID de Empresa (opcional)</label>
                  <input
                    type="text"
                    name="company_id"
                    value={form.company_id}
                    onChange={handleChange}
                    placeholder="c3e3e3dc-3e58-4679-abc1-df31d57a827b"
                    className="form-control pill"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Horarios disponibles</label>
                  {form.slot_times.map((slot, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="time"
                        value={slot}
                        onChange={(e) => handleSlotChange(index, e.target.value)}
                        required
                        className="form-control pill"
                      />
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeSlot(index)}
                        style={{ width: 80 }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addSlot}
                  >
                    + Añadir horario
                  </button>
                </div>
                <button type="submit" className="btn btn-brand w-100">
                  Crear Campaña
                </button>
              </form>
            </div>
          </div>

          {/* Lista de campañas existentes */}
          <div className="col-md-6">
            <div className="p-4 rounded-3" style={{ background: "rgba(255,255,255,.9)" }}>
              <h3 className="mb-4">Campañas Existentes</h3>
              {loading ? (
                <p>Cargando campañas...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-muted">No hay campañas registradas.</p>
              ) : (
                <ul className="list-group">
                  {campaigns.map((camp) => (
                    <li key={camp.id} className="list-group-item mb-2">
                      <strong>{camp.type_of_waste}</strong> - {camp.zone}
                      <div className="text-muted small">
                        {new Date(camp.collection_date).toLocaleDateString("es-CO")}
                      </div>
                      <div className="text-muted small">
                        {camp.slots?.length || 0} horarios • {camp.current_weight_kg}/{camp.max_capacity_kg} kg
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}