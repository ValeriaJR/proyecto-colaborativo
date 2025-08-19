"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function RecolectorPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fDate, setFDate] = useState("");
  const [fBarrio, setFBarrio] = useState("");

  // Cargar asignaciones del recolector
  useEffect(() => {
    const fetchAssignments = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/assignments/assignments/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setAssignments(data);
        } else {
          console.error("Error al cargar asignaciones:", await res.text());
        }
      } catch (err) {
        console.error("Error de conexión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Filtrar asignaciones
  const filtered = useMemo(() => {
    return assignments
      .filter((a) => a.status === "ASIGNADA" || a.status === "CREADA")
      .filter((a) => {
        const byDate = fDate ? a.campaign_collection_date.split("T")[0] === fDate : true;
        const byBarrio = fBarrio
          ? a.user_address.toLowerCase().includes(fBarrio.toLowerCase())
          : true;
        return byDate && byBarrio;
      });
  }, [assignments, fDate, fBarrio]);

  // Modal para completar asignación
  const [current, setCurrent] = useState(null);
  const [weight, setWeight] = useState(0);

  const openModal = (assignment) => {
    setCurrent(assignment);
    setWeight(0);
  };

  const closeModal = () => {
    setCurrent(null);
    setWeight(0);
  };

  const completeAssignment = async () => {
    if (!current || !weight) return;

    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/assignments/assignments/${current.id}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ weight_collected_kg: weight })
      });

      if (res.ok) {
        alert("Asignación completada y puntos asignados");
        // Refrescar lista
        const resNew = await fetch("http://127.0.0.1:8000/assignments/assignments/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resNew.ok) setAssignments(await resNew.json());
        closeModal();
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || "No se pudo completar la asignación"}`);
      }
    } catch (err) {
      console.error("Error al completar asignación:", err);
      alert("Error de conexión con el servidor");
    }
  };

  return (
    <div
      className="auth-bg"
      style={{
        background: 'url("/principal.png") center/cover no-repeat fixed',
        minHeight: "100vh",
      }}
    >
      <div className="container py-4">

        {/* Barra superior */}
        <header className="topbar mb-4">
          <nav
            className="topbar-inner d-flex justify-content-end"
            style={{ padding: "1rem" }}
          >
            <button
              className=" nav-pill"
              onClick={() => (location.href = "/login")}
            >
              Cerrar sesión
            </button>
          </nav>
        </header>

        {/* Filtros */}
        <div
          className="d-flex align-items-center gap-4 mb-3 px-3 py-2 rounded-3"
          style={{ background: "rgba(255,255,255,.92)" }}
        >
          <div className="d-flex align-items-center gap-2">
            <strong>filtrar por fecha:</strong>
            <input
              type="date"
              className="form-control pill"
              style={{ maxWidth: 200 }}
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <strong>filtrar por barrio:</strong>
            <input
              className="form-control pill"
              placeholder="Barrio…"
              style={{ maxWidth: 220 }}
              value={fBarrio}
              onChange={(e) => setFBarrio(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div
          className="p-0 rounded-3 overflow-hidden"
          style={{ background: "rgba(255,255,255,.92)" }}
        >
          <div
            className="px-3 py-2 fw-bold"
            style={{ background: "rgba(0,0,0,.75)", color: "#fff" }}
          >
            <div className="row">
              <div className="col-2">Barrio</div>
              <div className="col-3">Dirección</div>
              <div className="col-2">Tipo</div>
              <div className="col-3">Residuo</div>
              <div className="col-2 text-end">Estado</div>
            </div>
          </div>

          <div className="px-3">
            {loading ? (
              <p>Cargando asignaciones...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted py-4">Sin asignaciones pendientes.</div>
            ) : (
              filtered.map((a) => (
                <div
                  key={a.id}
                  className="row align-items-center py-3 border-bottom"
                  style={{ borderColor: "#eee" }}
                >
                  <div className="col-2">
                    <strong>{a.campaign_zone}</strong>
                  </div>
                  <div className="col-3">{a.user_address}</div>
                  <div className="col-2">{a.campaign_type_of_waste}</div>
                  <div className="col-3">
                    {a.estimated_weight_kg} kg
                  </div>
                  <div className="col-2 d-flex justify-content-end">
                    <button
                      className="btn btn-brand"
                      style={{ width: 120 }}
                      onClick={() => openModal(a)}
                    >
                      Verificar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== Modal Verificar (Controlado por React) ===== */}
        {current && (
          <div
            className="modal fade show d-block"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 1050,
              overflowY: "auto",
            }}
            tabIndex="-1"
          >
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "500px" }}
            >
              <div
                className="modal-content"
                style={{
                  background: "rgba(0,0,0,.88)",
                  color: "#fff",
                  borderRadius: "18px",
                  border: "none",
                }}
              >
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    Compruebe los residuos — {current.user_address}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={closeModal}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body">
                  <label className="fw-bold mb-1">Peso recolectado (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="form-control"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    style={{ background: "#fff", color: "#000", borderRadius: "8px" }}
                  />

                  <div className="mt-3">
                    <label className="fw-bold mb-1">Observaciones</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Notas del recolector (opcional)"
                      style={{ background: "#fff", color: "#000", borderRadius: "8px" }}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 d-flex justify-content-center">
                  <button
                    className="btn btn-brand"
                    style={{ width: 160 }}
                    onClick={completeAssignment}
                  >
                    Recolectar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay adicional para backdrop */}
        {current && <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>}
      </div>
    </div>
  );
}