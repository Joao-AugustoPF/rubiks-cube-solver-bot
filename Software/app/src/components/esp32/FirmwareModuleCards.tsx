import styles from "./Esp32FirmwareGuide.module.css";

export interface FirmwareModuleDefinition {
  id: string;
  name: string;
  role: string;
  why: string;
}

interface FirmwareModuleCardsProps {
  modules: readonly FirmwareModuleDefinition[];
}

export function FirmwareModuleCards({ modules }: FirmwareModuleCardsProps) {
  return (
    <div className={styles.moduleGrid}>
      {modules.map((module) => (
        <article key={module.id} className={styles.moduleCard}>
          <h3>{module.name}</h3>
          <p>{module.role}</p>
          <small>{module.why}</small>
        </article>
      ))}
    </div>
  );
}
