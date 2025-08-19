"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import TopNav from "../componentes/TopNav";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

/* ---------- Utilidades ---------- */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

const fmtHour = (h) => h; // desde acá

const openEdit = (field) => {
  setEditField(field);
  setEditValue(user[field] || "");
  const el = document.getElementById("editModal");
  if (bs?.Modal && el) {
    const instance = el._instance ?? new bs.Modal(el);
    el._instance = instance;
    instance.show();
  }
};

const confirmEdit = async () => {
  const token = localStorage.getItem("auth_token");
  const updates = { [editField]: editValue };

  try {
    const res = await fetch("http://127.0.0.1:8000/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const data = await res.json();

    if (res.ok) {
      setUser({ ...user, [editField]: editValue });
      document.getElementById("editModal")?._instance?.hide();
    } else {
      alert(`Error: ${data.detail || "No se pudo actualizar"}`);
    }
  } catch (err) {
    alert("Error de conexión con el servidor");
  }
};

//Hasta acá

/* ---------- Página ---------- */
export default function PerfilPage() {
  const [bs, setBs] = useState(null);
  const [user, setUser] = useState({
    full_name: "",
    email: "",
    address: "",
    phone: "",
    barrio: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Recolecciones ---
  const [registrations, setRegistrations] = useState([]);
  const [futuras, setFuturas] = useState([]);
  const [pasadas, setPasadas] = useState([]);

  // --- Reprogramar ---
  const [reprogIdx, setReprogIdx] = useState(null);
  const [reprogCampaign, setReprogCampaign] = useState(null); // ✅ Nueva campaña seleccionada
  const [reprogDate, setReprogDate] = useState(new Date());
  const [reprogSlots, setReprogSlots] = useState([]); // Slots del backend
  const [reprogSlot, setReprogSlot] = useState(null);
  const [campaigns, setCampaigns] = useState([]); // ✅ Todas las campañas activas

  // --- Editar perfil ---
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");

   // --- Informe ---
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [dataChart, setDataChart] = useState([]);

  // --- Meses disponibles ---
  const [mesesDisponibles, setMesesDisponibles] = useState([]);

  // 🔹 Cancelar recolección
const confirmCancel = async (regId) => {
  if (!window.confirm("¿Deseas cancelar esta recolección programada?")) {
    return; // Si dice "No", no hace nada
  }

  const token = localStorage.getItem("auth_token");

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/campaigns/campaigns/registrations/${regId}/cancel`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      alert("Recolección cancelada correctamente");
      // Actualizar estado local: eliminar de futuras
      const newRegs = registrations.filter(r => r.id !== regId);
      setRegistrations(newRegs);
    } else {
      alert(`Error: ${data.detail || "No se pudo cancelar"}`);
    }
  } catch (err) {
    alert("Error de conexión con el servidor");
  }
};

  // Cargar Bootstrap
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js").then((mod) => setBs(mod));
  }, []);

  // 🔹 Cargar datos del usuario
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("No autenticado");

        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Datos del usuario
        const resUser = await fetch("http://127.0.0.1:8000/users/me", { headers });
        if (!resUser.ok) {
          const err = await resUser.json().catch(() => ({}));
          throw new Error(`HTTP ${resUser.status}: ${err.detail || "Error al cargar perfil"}`);
        }
        const userData = await resUser.json();
        setUser(userData);

        // 2. Inscripciones
        const resRegs = await fetch("http://127.0.0.1:8000/users/my-registrations", { headers });
        if (!resRegs.ok) {
          const err = await resRegs.json().catch(() => ({}));
          throw new Error(`HTTP ${resRegs.status}: ${err.detail || "Error al cargar inscripciones"}`);
        }
        const regData = await resRegs.json();
        setRegistrations(Array.isArray(regData) ? regData : []);

        // 3. Campañas activas (para reprogramar)
        const resCampaigns = await fetch("http://127.0.0.1:8000/campaigns/campaigns/", { headers });
        if (resCampaigns.ok) {
          const data = await resCampaigns.json();
          setCampaigns(data);
        }

        // 4. Informe mensual
        const resReport = await fetch(`http://127.0.0.1:8000/users/me/report?month=${mesSeleccionado}`, { headers });
        if (resReport.ok) {
          const report = await resReport.json();
          const regs = Array.isArray(report.registrations) ? report.registrations : [];
          const chartData = regs.map(r => ({
            name: (Array.isArray(r.products) ? r.products.map(p => p.product_name).join(", ") : "Residuos") || "Residuos",
            total: r.weight_kg || 0
          }));
          setDataChart(chartData);
        }

      } catch (err) {
        console.error("Error en PerfilPage:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mesSeleccionado]);

  // 🔹 Separar futuras y pasadas
  useEffect(() => {
    const hoy = new Date();
    const fut = [], pas = [];

    if (Array.isArray(registrations)) {
      registrations.forEach(reg => {
        const date = new Date(reg.created_at);
        if (date >= new Date(hoy.setHours(0, 0, 0, 0))) {
          fut.push(reg);
        } else {
          pas.push(reg);
        }
      });
    }

    setFuturas(fut);
    setPasadas(pas);
  }, [registrations]);

  // 🔹 Meses disponibles
  useEffect(() => {
    const set = new Set(
      registrations
        .filter(r => r.created_at)
        .map(r => r.created_at.slice(0, 7))
    );
    setMesesDisponibles(Array.from(set).sort());
  }, [registrations]);

  // 🔹 Editar campo
  const openEdit = (field) => {
    setEditField(field);
    setEditValue(user[field] || "");
    const el = document.getElementById("editModal");
    if (bs?.Modal && el) {
      const instance = el._instance ?? new bs.Modal(el);
      el._instance = instance;
      instance.show();
    }
  };

  const confirmEdit = async () => {
    const token = localStorage.getItem("auth_token");
    const updates = { [editField]: editValue };

    try {
      const res = await fetch("http://127.0.0.1:8000/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();

      if (res.ok) {
        setUser({ ...user, [editField]: editValue });
        document.getElementById("editModal")?._instance?.hide();
      } else {
        alert(`Error: ${data.detail || "No se pudo actualizar"}`);
      }
    } catch (err) {
      alert("Error de conexión con el servidor");
    }
  };

  // 🔹 Reprogramar
  const openReprogModal = (idx) => {
    setReprogIdx(idx);
    const r = futuras[idx];
    const date = new Date(r.created_at);
    setReprogDate(date);
    setReprogSlot(null);
    setReprogSlots([]);

    // ✅ Inicializar con la campaña actual
    const currentCampaign = campaigns.find(c => c.id === r.campaign_id);
    setReprogCampaign(currentCampaign || campaigns[0]);

    // ✅ Cargar slots de la campaña inicial
    const fetchSlots = async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `http://127.0.0.1:8000/campaigns/campaigns/${currentCampaign?.id}/slots`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const slots = await res.json();
        const available = slots.filter(s => s.is_available);
        setReprogSlots(available);
      }
    };

    fetchSlots();

    const el = document.getElementById("reprogModal");
    if (bs?.Modal && el) {
      const instance = el._instance ?? new bs.Modal(el);
      el._instance = instance;
      instance.show();
    }
  };

  // ✅ Cambiar campaña seleccionada
  const handleCampaignChange = (e) => {
    const campaignId = e.target.value;
    const campaign = campaigns.find(c => c.id === campaignId);
    setReprogCampaign(campaign);
    setReprogSlots([]);
    setReprogSlot(null);

    // ✅ Cargar slots de la nueva campaña
    const fetchSlots = async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `http://127.0.0.1:8000/campaigns/campaigns/${campaignId}/slots`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const slots = await res.json();
        const available = slots.filter(s => s.is_available);
        setReprogSlots(available);
      }
    };

    fetchSlots();
  };

  const confirmReprog = async () => {
    if (reprogIdx === null || !reprogSlot) return;

    const token = localStorage.getItem("auth_token");
    const registration = futuras[reprogIdx];

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/campaigns/campaigns/registrations/${registration.id}/reschedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ new_slot_id: reprogSlot.id })
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Reprogramado correctamente");
        document.getElementById("reprogModal")?._instance?.hide();
        const newRegs = registrations.map(r =>
          r.id === registration.id
            ? { ...r, created_at: new Date().toISOString() }
            : r
        );
        setRegistrations(newRegs);
      } else {
        alert(`Error: ${data.detail || "No se pudo reprogramar"}`);
      }
    } catch (err) {
      alert("Error de conexión con el servidor");
    }
  };

  if (loading) return <div>Cargando perfil...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="auth-bg" style={{ background: 'url("/principal.png") center/cover no-repeat fixed', minHeight: "100vh" }}>
      <div className="container">
        <TopNav />

        <div className="row g-3">
          {/* Columna izquierda: info editable */}
          <div className="col-12 col-lg-6">
            <div className="mb-2 px-3 py-2 rounded-3" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}>
              <strong>Tu información</strong>
            </div>

            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,.92)" }}>
              {[
                { label: "Dirección", key: "address" },
                { label: "Teléfono", key: "phone" },
                { label: "Barrio", key: "barrio" },
              ].map((f) => (
                <div key={f.key} className="d-flex align-items-center justify-content-between border-bottom py-3">
                  <div>
                    <div className="text-muted small">{f.label}</div>
                    <div className="fw-semibold">{user[f.key] || "No especificado"}</div>
                  </div>
                  <button className="btn btn-brand" style={{ width: 110 }} onClick={() => openEdit(f.key)}>
                    Editar
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 mb-2 px-3 py-2 rounded-3" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}>
              <strong>Tu informe</strong>
            </div>

            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,.92)" }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <label className="me-2 fw-semibold">Filtrar por mes:</label>
                <select
                  className="form-select pill"
                  style={{ maxWidth: 220 }}
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                >
                  {mesesDisponibles.length === 0 ? (
                    <option value={mesSeleccionado}>{mesSeleccionado}</option>
                  ) : (
                    mesesDisponibles.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={dataChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#66C261" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Columna derecha: recolecciones */}
          <div className="col-12 col-lg-6">
            <div className="mb-2 px-3 py-2 rounded-3" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}>
              <strong>Recolecciones futuras</strong>
            </div>

            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,.92)" }}>
              {futuras.length === 0 ? (
                <div className="text-muted">No tienes recolecciones próximas.</div>
              ) : (
                futuras.map((r, i) => (
                  <div key={i} className="border-bottom py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{formatDate(r.campaign_collection_date)}</strong>
                        {r.slot_time && <div className="text-muted small">Hora: {r.slot_time}</div>}
                        <div className="text-muted small">
                          {r.products?.map(p => p.product_name).join(", ") || "Residuos"}
                          <br />
                          {r.estimated_weight_kg} kg • {r.products?.reduce((sum, p) => sum + p.quantity, 0)} unidades
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-brand"
                          style={{ width: 130, background: "#6c757d" }}
                          onClick={() => openReprogModal(i)}
                        >
                          Reprogramar
                        </button>
                        <button
                          className="btn btn-brand"
                          style={{ width: 120, background: "#dc3545" }}
                          onClick={() => confirmCancel(r.id)}
                          
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 mb-2 px-3 py-2 rounded-3" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}>
              <strong>Recolecciones pasadas</strong>
            </div>

            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,.92)" }}>
              {pasadas.length === 0 ? (
                <div className="text-muted">Aún no hay historial.</div>
              ) : (
                pasadas.map((r, i) => (
                  <div key={i} className="border-bottom py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{formatDate(r.created_at)}</strong>
                        <div className="text-muted small">
                          {r.products?.map(p => p.product_name).join(", ") || "Residuos"} • {r.estimated_weight_kg} kg
                          <br />
                         <span className="badge bg-secondary">{r.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar */}
      <div className="modal fade" id="editModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ background: "rgba(0,0,0,.85)", color: "#fff", borderRadius: 18 }}>
            <div className="modal-header border-0">
              <h5 className="modal-title">Editar {editField}</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <input
                className="form-control pill"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`Nuevo valor para ${editField}`}
              />
            </div>
            <div className="modal-footer border-0">
              <button className="btn btn-brand" onClick={confirmEdit} style={{ width: 140 }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Reprogramar */}
      <div className="modal fade" id="reprogModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content" style={{ background: "rgba(0,0,0,.9)", color: "#fff", borderRadius: 18 }}>
            <div className="modal-header border-0">
              <h5 className="modal-title">Reprogramar recolección</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" />
            </div>

            <div className="modal-body">
              <div className="row g-3">
                {/* Selección de campaña */}
                <div className="col-12">
                  <label className="fw-semibold mb-2">Selecciona una campaña:</label>
                  <select
                    className="form-select pill"
                    value={reprogCampaign?.id || ""}
                    onChange={handleCampaignChange}
                  >
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.type_of_waste} - {c.zone} ({new Date(c.collection_date).toLocaleDateString("es-CO")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calendario */}
                <div className="col-12 col-md-6 d-flex justify-content-center">
                  <Calendar
                    onChange={setReprogDate}
                    value={reprogDate}
                    locale="es-ES"
                    minDetail="month"
                    next2Label={null}
                    prev2Label={null}
                  />
                </div>

                {/* Lista de horarios */}
                <div className="col-12 col-md-6">
                  <div className="p-2 rounded-3" style={{ background: "rgba(255,255,255,.12)" }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Horarios disponibles</strong>
                    </div>
                    {reprogSlots.length === 0 ? (
                      <p className="text-muted">No hay horarios disponibles</p>
                    ) : (
                      <ul className="list-group">
                        {reprogSlots.map((s, idx) => (
                          <li key={idx}
                              className="list-group-item d-flex justify-content-between align-items-center"
                              style={{
                                background: "transparent",
                                color: "#fff",
                                border: "none",
                                borderBottom: "1px solid rgba(255,255,255,.15)"
                              }}>
                              <span className="fw-semibold">{s.slot_time}</span>
                              <button
                                className={`btn ${reprogSlot?.id === s.id ? "btn-light" : "btn-brand"}`}
                                style={{ width: 120, padding: ".45rem 1rem" }}
                                onClick={() => setReprogSlot(s)}
                              >
                                {reprogSlot?.id === s.id ? "Seleccionado" : "Elegir"}
                              </button>
                            </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0">
              <button
                className="btn btn-brand"
                style={{ width: 160 }}
                disabled={!reprogSlot}
                onClick={confirmReprog}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}