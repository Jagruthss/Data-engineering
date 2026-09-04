import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Download, Activity, HeartPulse, Thermometer, Wind } from "lucide-react";

const STATUS_STYLES = {
    Stable: { bg: "#EAF3EC", text: "#276B3F", dot: "#3E9A5F" },
    Warning: { bg: "#FBF1DF", text: "#8A5A0B", dot: "#D99A2B" },
    Critical: { bg: "#FBE9E7", text: "#9A2E20", dot: "#D6503C" },
};

function computeEWS(hr, spo2, temp, sys) {
    let ews = 0;
    if (hr > 100 || hr < 60) ews += 1;
    if (spo2 < 92) ews += 2;
    if (temp > 100.4) ews += 1;
    if (sys > 140 || sys < 90) ews += 1;
    return ews;
}
function statusFromEWS(ews) {
    if (ews >= 3) return "Critical";
    if (ews >= 1) return "Warning";
    return "Stable";
}

const seed = [
    { id: "P001-1", patient_id: "P001", patient_name: "Jagruthi S S", heart_rate: 78, spo2: 97, bp_sys: 118, bp_dia: 76, temp: 98.1 },
    { id: "P002-1", patient_id: "P002", patient_name: "Shamira Shaheen S", heart_rate: 88, spo2: 94, bp_sys: 126, bp_dia: 80, temp: 99.0 },
    { id: "P003-1", patient_id: "P003", patient_name: "Afsari Begum Z", heart_rate: 104, spo2: 90, bp_sys: 142, bp_dia: 88, temp: 101.1 },
].map((r) => {
    const ews = computeEWS(r.heart_rate, r.spo2, r.temp, r.bp_sys);
    return { ...r, ews, status: statusFromEWS(ews), updated: new Date().toISOString() };
});

const emptyForm = {
    patient_id: "",
    patient_name: "",
    heart_rate: "",
    spo2: "",
    bp_sys: "",
    bp_dia: "",
    temp: "",
};

export default function PatientVitalsManager() {
    const [records, setRecords] = useState(seed);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState("");

    const counts = useMemo(() => {
        const c = { Stable: 0, Warning: 0, Critical: 0 };
        records.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
        return c;
    }, [records]);

    function resetForm() {
        setForm(emptyForm);
        setEditingId(null);
        setError("");
    }

    function handleSubmit(e) {
        e.preventDefault();
        const { patient_id, patient_name, heart_rate, spo2, bp_sys, bp_dia, temp } = form;
        if (!patient_id || !patient_name || !heart_rate || !spo2 || !bp_sys || !bp_dia || !temp) {
            setError("Fill in every field before saving.");
            return;
        }
        const hr = Number(heart_rate);
        const sp = Number(spo2);
        const sys = Number(bp_sys);
        const dia = Number(bp_dia);
        const t = Number(temp);
        if ([hr, sp, sys, dia, t].some((v) => Number.isNaN(v))) {
            setError("Vitals must be numbers.");
            return;
        }
        const ews = computeEWS(hr, sp, t, sys);
        const status = statusFromEWS(ews);
        const row = {
            id: editingId || `${patient_id}-${Date.now()}`,
            patient_id,
            patient_name,
            heart_rate: hr,
            spo2: sp,
            bp_sys: sys,
            bp_dia: dia,
            temp: t,
            ews,
            status,
            updated: new Date().toISOString(),
        };
        setRecords((prev) => {
            if (editingId) return prev.map((r) => (r.id === editingId ? row : r));
            return [row, ...prev];
        });
        resetForm();
    }

    function handleEdit(r) {
        setEditingId(r.id);
        setForm({
            patient_id: r.patient_id,
            patient_name: r.patient_name,
            heart_rate: r.heart_rate,
            spo2: r.spo2,
            bp_sys: r.bp_sys,
            bp_dia: r.bp_dia,
            temp: r.temp,
        });
        setError("");
    }

    function handleDelete(id) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) resetForm();
    }

    function exportCSV() {
        const header = [
            "patient_id",
            "patient_name",
            "timestamp",
            "heart_rate_bpm",
            "spo2_pct",
            "bp_systolic",
            "bp_diastolic",
            "temperature_f",
            "ews_score",
            "status",
        ];
        const lines = records.map((r) =>
            [
                r.patient_id,
                r.patient_name,
                r.updated,
                r.heart_rate,
                r.spo2,
                r.bp_sys,
                r.bp_dia,
                r.temp,
                r.ews,
                r.status,
            ].join(",")
        );
        const csv = [header.join(","), ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "patient_vitals_update.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#0F1B1E", minHeight: "100%", color: "#EAF1F0", padding: "28px 20px" }}>
            <div style={{ maxWidth: 980, margin: "0 auto" }}>
                <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <HeartPulse size={22} color="#5FCB9C" />
                            <h1 style={{ fontSize: 22, fontWeight: 650, margin: 0, letterSpacing: -0.2 }}>Patient Vitals Register</h1>
                        </div>
                        <p style={{ margin: "6px 0 0", color: "#9FB4B0", fontSize: 13.5, maxWidth: 480 }}>
                            Add or correct a reading below. Every save recomputes the early-warning score and updates the record's status.
                        </p>
                    </div>
                    <button
                        onClick={exportCSV}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, background: "#173028", border: "1px solid #2C4C40",
                            color: "#8FE0B7", padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 550, cursor: "pointer",
                        }}
                    >
                        <Download size={15} /> Export CSV for Databricks
                    </button>
                </header>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
                    {["Stable", "Warning", "Critical"].map((k) => (
                        <div key={k} style={{ background: "#15252A", border: "1px solid #223A3F", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11.5, color: "#8AA3A0", textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
                            <div style={{ fontSize: 24, fontWeight: 650, color: STATUS_STYLES[k].dot, marginTop: 2 }}>{counts[k] || 0}</div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ background: "#132226", border: "1px solid #223A3F", borderRadius: 12, padding: 18, marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <Activity size={16} color="#5FCB9C" />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Update reading" : "New reading"}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Patient ID" value={form.patient_id} onChange={(v) => setForm({ ...form, patient_id: v })} placeholder="P006" />
                        <Field label="Patient name" value={form.patient_name} onChange={(v) => setForm({ ...form, patient_name: v })} placeholder="Full name" />
                        <Field label="Heart rate (bpm)" value={form.heart_rate} onChange={(v) => setForm({ ...form, heart_rate: v })} placeholder="72" type="number" />
                        <Field label="SpO2 (%)" value={form.spo2} onChange={(v) => setForm({ ...form, spo2: v })} placeholder="97" type="number" />
                        <Field label="BP systolic" value={form.bp_sys} onChange={(v) => setForm({ ...form, bp_sys: v })} placeholder="118" type="number" />
                        <Field label="BP diastolic" value={form.bp_dia} onChange={(v) => setForm({ ...form, bp_dia: v })} placeholder="76" type="number" />
                        <Field label="Temperature (°F)" value={form.temp} onChange={(v) => setForm({ ...form, temp: v })} placeholder="98.4" type="number" step="0.1" />
                    </div>
                    {error && <div style={{ color: "#E58C7C", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button
                            type="submit"
                            style={{
                                display: "flex", alignItems: "center", gap: 7, background: "#3E9A5F", border: "none",
                                color: "#082017", padding: "9px 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 650, cursor: "pointer",
                            }}
                        >
                            <Plus size={15} /> {editingId ? "Save changes" : "Add reading"}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} style={{ background: "transparent", border: "1px solid #2C4C40", color: "#9FB4B0", padding: "9px 14px", borderRadius: 8, fontSize: 13.5, cursor: "pointer" }}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>

                <div style={{ background: "#132226", border: "1px solid #223A3F", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#173028", textAlign: "left" }}>
                                {["Patient", "HR", "SpO2", "BP", "Temp", "EWS", "Status", ""].map((h) => (
                                    <th key={h} style={{ padding: "10px 12px", color: "#8FE0B7", fontWeight: 600, fontSize: 12 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => {
                                const s = STATUS_STYLES[r.status];
                                return (
                                    <tr key={r.id} style={{ borderTop: "1px solid #1D3237" }}>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ fontWeight: 550 }}>{r.patient_name}</div>
                                            <div style={{ fontSize: 11.5, color: "#7C938F" }}>{r.patient_id}</div>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>{r.heart_rate}</td>
                                        <td style={{ padding: "10px 12px" }}>{r.spo2}%</td>
                                        <td style={{ padding: "10px 12px" }}>{r.bp_sys}/{r.bp_dia}</td>
                                        <td style={{ padding: "10px 12px" }}>{r.temp}°F</td>
                                        <td style={{ padding: "10px 12px" }}>{r.ews}</td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <span style={{ background: s.bg, color: s.text, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600 }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button onClick={() => handleEdit(r)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9FB4B0" }}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(r.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#D6503C" }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#7C938F" }}>
                                        No readings yet — add one above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p style={{ fontSize: 12, color: "#6E8683", marginTop: 16, lineHeight: 1.6 }}>
                    <Thermometer size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                    EWS flags: HR outside 60–100, SpO2 below 92%, temp above 100.4°F, or systolic BP outside 90–140 each add points — 1+ is Warning, 3+ is Critical.
                    <Wind size={12} style={{ verticalAlign: -1, margin: "0 4px 0 10px" }} />
                    Export produces a CSV in the same schema as the sample dataset, ready to append to the Bronze table in Databricks.
                </p>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = "text", step }) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 12, color: "#9FB4B0" }}>{label}</span>
            <input
                type={type}
                step={step}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    background: "#0F1B1E", border: "1px solid #2C4C40", borderRadius: 7, padding: "8px 10px",
                    color: "#EAF1F0", fontSize: 13.5, outline: "none",
                }}
            />
        </label>
    );
}