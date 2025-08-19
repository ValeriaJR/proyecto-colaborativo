"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import TopNav from "../componentes/TopNav";

export default function AgendarPage() {
  const [bs, setBs] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [rows, setRows] = useState([{ producto: "", peso: "", cantidad: "" }]);

  // Estado: inscripciones del usuario
  const [userRegistrations, setUserRegistrations] = useState([]);

  // Cargar Bootstrap
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js").then((mod) => {
      setBs(mod);
    });
  }, []);

  // Cargar campañas desde el backend
  useEffect(() => {
    const fetchCampaignsAndRegistrations = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("No estás autenticado. Inicia sesión.");

        // 1. Cargar campañas
        const resCampaigns = await fetch("http://127.0.0.1:8000/campaigns/campaigns", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!resCampaigns.ok) {
          const errorData = await resCampaigns.json().catch(() => ({}));
          throw new Error(`Error ${resCampaigns.status}: ${errorData.detail || "No se pudieron cargar las campañas"}`);
        }

        const dataCampaigns = await resCampaigns.json();
        setCampaigns(dataCampaigns);

        // 2. Cargar inscripciones del usuario (opcional, si el endpoint existe)
        const resUser = await fetch("http://127.0.0.1:8000/users/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (resUser.ok) {
          const userData = await resUser.json();
          // Asume que el backend devuelve una lista de inscripciones en `campaign_registrations`
          setUserRegistrations(userData.campaign_registrations || []);
        }

      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignsAndRegistrations();
  }, []);

  // Filtrar campañas por fecha seleccionada
  const availableCampaigns = campaigns.filter((c) => {
    const campaignDate = new Date(c.collection_date).toDateString();
    return campaignDate === selectedDate.toDateString();
  });

  // Obtener horarios disponibles con su campaña asociada
  const availableSlots = availableCampaigns.flatMap((campaign) =>
    campaign.slots.map((s) => ({
      ...s,
      campaignId: campaign.id,
      campaignZone: campaign.zone,
    }))
  );

  // Verificar si el usuario ya se inscribió a este slot
  const isUserRegistered = (slotId) => {
    return userRegistrations.some(reg => reg.slot_id === slotId);
  };

  // Abrir modal
  const openModal = (slot) => {
    if (!slot.is_available && !isUserRegistered(slot.id)) return;

    setSelectedSlot(slot);
    const el = document.getElementById("residuosModal");
    if (bs?.Modal && el) {
      const instance = el._instance || new bs.Modal(el);
      el._instance = instance;
      instance.show();
    }
  };

  // Manejo de filas
  const addRow = () => {
    setRows((prev) => [...prev, { producto: "", peso: "", cantidad: "" }]);
  };

  const removeRow = () => {
    setRows((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const updateCell = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  // Guardar inscripción en el backend
  const onSave = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      alert("No estás autenticado. Inicia sesión.");
      return;
    }

    const validRows = rows.filter(
      (r) => r.producto.trim() && r.peso && r.cantidad
    );

    if (validRows.length === 0) {
      alert("Por favor, completa al menos un producto con todos sus datos.");
      return;
    }

    const products = validRows.map((r) => ({
      product_name: r.producto.trim(),
      weight_kg: parseFloat(r.peso) || 0,
      quantity: parseInt(r.cantidad) || 0,
    }));

    const estimated_weight_kg = products.reduce((sum, p) => sum + p.weight_kg, 0);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/campaigns/campaigns/${selectedSlot.campaignId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            address: "Dirección del usuario", // Puedes reemplazarlo con datos reales
            estimated_weight_kg,
            notes: "Agendado desde el frontend",
            products,
            slot_id: selectedSlot.id
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("¡Agendado correctamente!");
        const modalEl = document.getElementById("residuosModal");
        if (modalEl?._instance) {
          modalEl._instance.hide();
        }
        setRows([{ producto: "", peso: "", cantidad: "" }]);
        // Opcional: recargar la página o actualizar el estado
        window.location.reload();
      } else {
        alert(`Error: ${data.detail || "No se pudo agendar"}`);
      }
    } catch (err) {
      console.error("Error al agendar:", err);
      alert("Error de conexión con el servidor. Intenta más tarde.");
    }
  };

  // Formato de fecha legible
  const humanDate = useMemo(() => {
    return selectedDate.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  if (loading) return <div className="text-center mt-5">Cargando campañas...</div>;
  if (error) return (
    <div className="text-center text-danger mt-5 p-3">
      <p><strong>Error:</strong> {error}</p>
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={() => window.location.reload()}
      >
        Reintentar
      </button>
    </div>
  );

  return (
    <div
      className="auth-bg"
      style={{
        background: 'url("/principal.png") center/cover no-repeat fixed',
        minHeight: "100vh",
      }}
    >
      <div className="container">
        <TopNav />

        <div className="row g-4 mt-3">
          {/* Calendario */}
          <div className="col-12 col-lg-5 d-flex justify-content-center">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              locale="es-ES"
              minDetail="month"
              next2Label={null}
              prev2Label={null}
              className="rounded shadow-sm"
            />
          </div>

          {/* Lista de horarios */}
          <div className="col-12 col-lg-6">
            <div
              className="p-3"
              style={{
                background: "rgba(255,255,255,.92)",
                borderRadius: 16,
                boxShadow: "0 10px 24px rgba(0,0,0,.18)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="m-0">Fechas programadas</h5>
                <small className="text-muted">{humanDate}</small>
              </div>

              {availableSlots.length === 0 ? (
                <div className="text-muted">No hay horarios disponibles para esta fecha.</div>
              ) : (
                <ul className="list-group">
                  {availableSlots.map((s, idx) => {
                    const userRegistered = isUserRegistered(s.id);
                    return (
                      <li
                        key={idx}
                        className="list-group-item d-flex justify-content-between align-items-center"
                        style={{ border: "1px solid #eee", borderRadius: "8px", marginBottom: "8px" }}
                      >
                        <strong>{s.slot_time}</strong>

                        {userRegistered ? (
                          <span
                            className="badge bg-success text-white"
                            style={{ padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem" }}
                          >
                            TU RESERVA
                          </span>
                        ) : s.is_available ? (
                          <button
                            className="btn btn-brand btn-sm"
                            onClick={() => openModal(s)}
                          >
                            Agendar
                          </button>
                        ) : (
                          <span
                            className="badge bg-danger text-white"
                            style={{ padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem" }}
                          >
                            OCUPADO
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Describir residuos */}
      <div
        className="modal fade"
        id="residuosModal"
        tabIndex="-1"
        aria-labelledby="residuosModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div
            className="modal-content"
            style={{
              background: "rgba(0,0,0,.85)",
              color: "#fff",
              borderRadius: 18,
            }}
          >
            <div className="modal-header border-0">
              <h5 className="modal-title" id="residuosModalLabel">
                Describe tu(s) residuo(s) — {selectedDate.toISOString().split("T")[0]} • {selectedSlot?.slot_time || ""}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              <div
                className="p-3"
                style={{
                  background: "rgba(255,255,255,.18)",
                  borderRadius: 12,
                }}
              >
                <div className="row fw-bold mb-2 text-center">
                  <div className="col">Producto</div>
                  <div className="col">Peso (kg)</div>
                  <div className="col">Cantidad</div>
                </div>

                {rows.map((row, i) => (
                  <div className="row g-2 mb-2" key={i}>
                    <div className="col">
                      <input
                        className="form-control pill"
                        placeholder="Ej. Plástico"
                        value={row.producto}
                        onChange={(e) => updateCell(i, "producto", e.target.value)}
                      />
                    </div>
                    <div className="col">
                      <input
                        className="form-control pill"
                        type="number"
                        step="0.1"
                        placeholder="3.5"
                        value={row.peso}
                        onChange={(e) => updateCell(i, "peso", e.target.value)}
                      />
                    </div>
                    <div className="col">
                      <input
                        className="form-control pill"
                        type="number"
                        placeholder="5"
                        value={row.cantidad}
                        onChange={(e) => updateCell(i, "cantidad", e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <div className="d-flex gap-2 justify-content-center mt-3">
                  <button className="btn btn-brand" onClick={addRow}>
                    + Añadir
                  </button>
                  <button
                    className="btn btn-brand"
                    style={{ background: "#6c757d" }}
                    onClick={removeRow}
                    disabled={rows.length <= 1}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 d-flex justify-content-center">
              <button className="btn btn-brand" onClick={onSave}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}