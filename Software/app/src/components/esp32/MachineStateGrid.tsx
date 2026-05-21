import styles from "./Esp32FirmwareGuide.module.css";

export interface MachineStateDefinition {
  name: string;
  description: string;
}

interface MachineStateGridProps {
  states: readonly MachineStateDefinition[];
}

export function MachineStateGrid({ states }: MachineStateGridProps) {
  return (
    <div className={styles.stateGrid}>
      {states.map((state) => (
        <article key={state.name} className={styles.stateCard}>
          <span>{state.name}</span>
          <p>{state.description}</p>
        </article>
      ))}
    </div>
  );
}
