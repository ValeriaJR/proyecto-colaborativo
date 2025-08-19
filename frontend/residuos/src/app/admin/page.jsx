"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminAsignarPage() {
  const [bs, setBs] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [recolectores, setRecolectores] = useState([]);

  // Cargar Bootstrap
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("bootstrap").then((mod) => setBs(mod));
  }, []);

  // 🔹 Cargar solicitudes y recolectores
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const headers = { "Authorization": `Bearer ${token}` };

      // Cargar solicitudes desde el endpoint personalizado
      try {
        const resSols = await fetch("http://127.0.0.1:8000/campaigns/campaigns/registrationsadmin", { headers });
        
        if (!resSols.ok) {
          console.error("Error HTTP:", resSols.status, await resSols.text());
          return;
        }

        const data = await resSols.json();

        // ✅ Usar directamente los campos del backend
        const mapped = data.map(reg => ({
          id: reg.id,
          barrio: reg.barrio || "Sin barrio",
          direccion: reg.direccion_corta || reg.address || "Sin dirección",
          fecha: reg.fecha_recoleccion || "Sin fecha",
          hora: reg.hora_recoleccion || "Sin hora",
          residuos: reg.products?.map(p => p.product_name) || [],
          estado: reg.status,
          userId: reg.user_id
        }));

        setSolicitudes(mapped);
      } catch (err) {
        console.error("Error al cargar solicitudes", err);
      }

      // ✅ Cargar todos los usuarios y filtrar solo recolectores
      try {
        const resUsers = await fetch("http://127.0.0.1:8000/users/", { headers });
        
        if (!resUsers.ok) {
          console.error("Error al cargar usuarios:", await resUsers.text());
          return;
        }

        const data = await resUsers.json();
        const collectors = data.filter(u => u.role === "COLLECTOR");
        setRecolectores(collectors);
      } catch (err) {
        console.error("Error de conexión al cargar recolectores", err);
      }
    };

    fetchData();
  }, []);

  // 🔹 Filtro por residuo
  const [fResiduo, setFResiduo] = useState("");
  const filtered = useMemo(() => {
    const q = fResiduo.trim().toLowerCase();
    if (!q) return solicitudes;
    return solicitudes.filter(s =>
      s.residuos.some(r => r.toLowerCase().includes(q))
    );
  }, [solicitudes, fResiduo]);

  // 🔹 Asignar recolector
  const [selectedSol, setSelectedSol] = useState(null);
  const [collectorId, setCollectorId] = useState("");

  const openAssign = (sol) => {
    // ✅ Verificar que el estado permita asignación
    if (["CREADA", "REPROGRAMADA"].includes(sol.estado)) {
      setSelectedSol(sol);
      setCollectorId("");
      const el = document.getElementById("assignModal");
      if (el && bs?.Modal) {
        const m = bs.Modal.getInstance(el) || new bs.Modal(el);
        m.show();
        el._modal = m;
      }
    }
  };

  const confirmAssign = async () => {
    if (!selectedSol || !collectorId) return;

    const token = localStorage.getItem("auth_token");
    const assignmentData = {
      registration_id: selectedSol.id,
      collector_id: collectorId,
      vehicle_plate: "ABC123"
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/assignments/assignments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Asignación realizada correctamente");
        // Actualizar estado local
        setSolicitudes(prev => prev.map(s =>
          s.id === selectedSol.id ? { ...s, estado: "Asignado" } : s
        ));
        document.getElementById("assignModal")?._modal?.hide();
      } else {
        alert(`Error: ${data.detail || "No se pudo asignar"}`);
      }
    } catch (err) {
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
      <div className="container mt-4 pt-4">
        {/* Barra de navegación */}
        <header className="position-sticky top-0 w-100 my-5" style={{ zIndex: 1000 }}>
          <nav className="topbar-inner d-flex align-items-center justify-content-end gap-2 px-3 py-2">
            <a href="/admin/informes" className="nav-pill">Informes</a>
            <a href="/admin" className="nav-pill active">Asignar</a>
            <a href="/admin/usuarios" className="nav-pill">Usuarios</a>
            <a href="/admin/calendarios" className="nav-pill">Campañas</a>
            <button
              className="nav-pill ms-auto"
              onClick={() => (location.href = "/login")}
            >
              Cerrar sesión
            </button>
          </nav>
        </header>

        {/* Filtro */}
        <div
          className="d-flex align-items-center gap-3 mb-3 px-3 py-2 rounded-3"
          style={{ background: "rgba(255,255,255,.92)" }}
        >
          <strong>Filtrar por tipo de residuo:</strong>
          <input
            className="form-control pill"
            style={{ maxWidth: 260 }}
            placeholder="Ej. plástico, vidrio…"
            value={fResiduo}
            onChange={(e) => setFResiduo(e.target.value)}
          />
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
              <div className="col-1">Fecha</div>
              <div className="col-1">Hora</div>
              <div className="col-3">Residuo</div>
              <div className="col-1">Estado</div>
              <div className="col-1 text-end">Acción</div>
            </div>
          </div>

          <div className="px-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="row align-items-center py-3 border-bottom"
                style={{ borderColor: "#eee" }}
              >
                <div className="col-2"><strong>{s.barrio}</strong></div>
                <div className="col-3">{s.direccion}</div>
                <div className="col-1">{s.fecha}</div>
                <div className="col-1">{s.hora}</div>
                <div className="col-3">
                  {s.residuos.map((r, i) => (
                    <span key={i} className="me-1">
                      {r}{i < s.residuos.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
                <div className="col-1">
                  <span
                    className={`badge ${
                      s.estado === "Asignado" ? "bg-success" :
                      s.estado === "Creada" ? "bg-secondary" :
                      s.estado === "COMPLETADA" ? "bg-success" :
                      s.estado === "CANCELADA" ? "bg-danger" :
                      "bg-warning"
                    }`}
                  >
                    {s.estado}
                  </span>
                </div>
                <div className="col-1 d-flex justify-content-end">
                  {/* ✅ Solo mostrar botón si el estado permite asignación */}
                  {["CREADA", "REPROGRAMADA"].includes(s.estado) ? (
                    <button
                      className="btn btn-brand"
                      style={{ width: 110 }}
                      onClick={() => openAssign(s)}
                    >
                      Asignar
                    </button>
                  ) : (
                    <span className="text-muted small">No asignable</span>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-muted py-4">Sin resultados.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Asignar */}
      <div className="modal fade" id="assignModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div
            className="modal-content"
            style={{
              background: "rgba(0, 0, 0, 0.75)",
              color: "#fff",
              borderRadius: 18,
            }}
          >
            <div className="modal-header border-0">
              <h5 className="modal-title">
                Asignar recolector {selectedSol ? `— ${selectedSol.barrio}` : ""}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setSelectedSol(null)}
              />
            </div>
            <div className="modal-body">
              <div className="list-group">
                {recolectores.length === 0 ? (
                  <p className="text-muted">No hay recolectores disponibles</p>
                ) : (
                  recolectores.map((r) => (
                    <label
                      key={r.id}
                      className="list-group-item d-flex align-items-center justify-content-between"
                      style={{
                        background: "transparent",
                        color: "#fff",
                        borderColor: "rgba(238, 229, 229, 0.5)",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <strong>{r.full_name}</strong>
                        <div className="small text-muted">Zona: {r.zone || "No asignada"}</div>
                      </div>
                      <input
                        type="radio"
                        name="recolector"
                        value={r.id}
                        checked={collectorId === r.id}
                        onChange={(e) => setCollectorId(e.target.value)}
                        className="ms-2"
                      />
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer border-0 d-flex justify-content-center">
              <button
                className="btn btn-brand"
                style={{ width: 160 }}
                disabled={!collectorId}
                onClick={confirmAssign}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}