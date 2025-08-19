"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function AdminInformesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fLoc, setFLoc] = useState(""); // ← controla las BARRAS
  const [fTipo, setFTipo] = useState(""); // ← controla la TORTA

  // Cargar datos desde el backend
  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/reports/admin/", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const reports = await res.json();
          setData(reports);
        } else {
          console.error("Error al cargar informes:", await res.text());
        }
      } catch (err) {
        console.error("Error de conexión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Tipos y localidades únicas
  const tipos = useMemo(() => Array.from(new Set(data.map(d => d.tipo))), [data]);
  const locs = useMemo(() => Array.from(new Set(data.map(d => d.localidad))), [data]);

  // Barras: agrupa por TIPO dentro de la LOCALIDAD elegida
  const barData = useMemo(() => {
    const acc = new Map();
    data.forEach(d => {
      if (fLoc && d.localidad !== fLoc) return;
      acc.set(d.tipo, (acc.get(d.tipo) || 0) + d.cantidad);
    });
    return Array.from(acc, ([name, total]) => ({ name, total }));
  }, [data, fLoc]);

  // Torta: agrupa por LOCALIDAD del TIPO elegido
  const pieData = useMemo(() => {
    const acc = new Map();
    data.forEach(d => {
      if (fTipo && d.tipo !== fTipo) return;
      acc.set(d.localidad, (acc.get(d.localidad) || 0) + d.cantidad);
    });
    return Array.from(acc, ([name, value]) => ({ name, value }));
  }, [data, fTipo]);

  // Colores para el gráfico de torta
  const COLORS = ["#66C261", "#4AA64B", "#8BD685", "#2F7F2E", "#A7E8A3"];

  return (
    <div
      className="auth-bg"
      style={{
        background: 'url("/principal.png") center/cover no-repeat fixed',
        minHeight: "100vh",
      }}
    >
      <div className="container mt-4 pt-4">
        {/* Barra superior sticky */}
        <header className="position-sticky top-0 w-100 my-5" style={{ zIndex: 1000 }}>
          <nav className="topbar-inner d-flex align-items-center justify-content-end gap-2 px-3 py-2">
            <a href="/admin/informes" className="nav-pill active">Informes</a>
            <a href="/admin" className="nav-pill">Asignar</a>
            <a href="/admin/usuarios" className="nav-pill">Usuarios</a>
            <a href="/admin/calendarios" className="nav-pill">Campañas</a>
            <button className="nav-pill ms-auto" onClick={() => (location.href = "/login")}>
              Cerrar sesión
            </button>
          </nav>
        </header>

        <div className="row g-4">
          {/* Barras – filtro por localidad */}
          <div className="col-12 col-lg-6">
            <div
              className="d-flex align-items-center gap-2 mb-2 px-3 py-2 rounded-3"
              style={{ background: "rgba(255,255,255,.92)" }}
            >
              <strong>filtrar por localidad:</strong>
              <input
                list="locs"
                className="form-control pill"
                style={{ maxWidth: 260 }}
                placeholder="Ej. El Poblado, Laureles…"
                value={fLoc}
                onChange={(e) => setFLoc(e.target.value)}
              />
              <datalist id="locs">
                {locs.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>

            <div style={{ width: "100%", height: 320, background: "rgba(255,255,255,.92)", borderRadius: 16, padding: 16 }}>
              <h6 className="mb-2">Cantidad por tipo en {fLoc || "todas las localidades"}</h6>
              {loading ? (
                <p>Cargando...</p>
              ) : barData.length === 0 ? (
                <p className="text-muted">No hay datos para mostrar.</p>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" radius={[6,6,0,0]} fill="#66C261" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Torta – filtro por residuo */}
          <div className="col-12 col-lg-6">
            <div
              className="d-flex align-items-center gap-2 mb-2 px-3 py-2 rounded-3"
              style={{ background: "rgba(255,255,255,.92)" }}
            >
              <strong>filtrar por residuo:</strong>
              <input
                list="tipos"
                className="form-control pill"
                style={{ maxWidth: 260 }}
                placeholder="Ej. Plástico, Vidrio…"
                value={fTipo}
                onChange={(e) => setFTipo(e.target.value)}
              />
              <datalist id="tipos">
                {tipos.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div style={{ width: "100%", height: 320, background: "rgba(255,255,255,.92)", borderRadius: 16, padding: 16 }}>
              <h6 className="mb-2">Cantidad de {fTipo || "todos los residuos"} por localidad</h6>
              {loading ? (
                <p>Cargando...</p>
              ) : pieData.length === 0 ? (
                <p className="text-muted">No hay datos para mostrar.</p>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie dataKey="value" data={pieData} innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}