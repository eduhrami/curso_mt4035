/** Créditos del curso en la pantalla de inicio: profesores y sus perfiles públicos. */

interface Profile {
  label: string;
  url: string;
}

interface Instructor {
  name: string;
  profiles: Profile[];
}

export const INSTRUCTORS: Instructor[] = [
  {
    name: "Eduardo Ramírez",
    profiles: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/ehramirez/" },
      { label: "X", url: "https://x.com/eduhrami" },
      { label: "GitHub", url: "https://github.com/eduhrami" },
    ],
  },
  {
    name: "Marcos Chávez",
    profiles: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/marchavez/" }],
  },
];

export function CourseCredits() {
  return (
    <p class="small muted" style={{ margin: 0 }} data-testid="credits">
      MT4035 · Aplicaciones de la analítica de datos · Profesores:{" "}
      {INSTRUCTORS.map((p, i) => (
        <span key={p.name}>
          {i > 0 && " · "}
          <strong>{p.name}</strong> (
          {p.profiles.map((pr, j) => (
            <span key={pr.label}>
              {j > 0 && ", "}
              <a href={pr.url} target="_blank" rel="noopener noreferrer">
                {pr.label}
              </a>
            </span>
          ))}
          )
        </span>
      ))}
    </p>
  );
}
