import Link from "next/link";
import type { Route } from "next";
import { listProjects } from "@/lib/projects/repository";
import { tr } from "@/lib/i18n/tr";
import { ProjectForm } from "./project-form";
import { DeleteButton } from "./delete-button";

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderBottom: "1px solid #e4e4e7",
  textAlign: "left",
};

export default async function HomePage() {
  const projects = await listProjects();

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{tr.project.title}</h1>
      <p style={{ color: "#71717a", marginTop: 0 }}>
        {tr.app.name} — {tr.app.tagline}
      </p>

      <ProjectForm />

      {projects.length === 0 ? (
        <p style={{ color: "#71717a" }}>{tr.project.empty}</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
          }}
        >
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              <th style={cell}>{tr.project.fields.name}</th>
              <th style={cell}>{tr.project.fields.projectType}</th>
              <th style={cell}>{tr.project.fields.tier}</th>
              <th style={cell}>{tr.project.fields.status}</th>
              <th style={cell}>{tr.project.fields.regionPackageVersion}</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={cell}>
                  <Link
                    href={`/projects/${p.id}` as Route}
                    style={{ color: "#18181b" }}
                  >
                    {p.name}
                  </Link>
                </td>
                <td style={cell}>{tr.projectType[p.projectType]}</td>
                <td style={cell}>{tr.tier[p.tier]}</td>
                <td style={cell}>{tr.projectStatus[p.status]}</td>
                <td style={{ ...cell, color: p.regionPackageVersionId ? "#18181b" : "#a1a1aa" }}>
                  {p.regionPackageVersionId ? tr.project.bound : tr.project.unbound}
                </td>
                <td style={{ ...cell, textAlign: "right" }}>
                  <DeleteButton id={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
