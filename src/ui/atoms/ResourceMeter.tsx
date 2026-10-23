import styles from "./atoms.module.css";
export function ResourceMeter({ label, value }: { label: string; value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className={styles.meter} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-valuetext={`${bounded} percent`}><div className={styles.meterHeader}><span>{label}</span><span>{bounded}</span></div><div className={styles.meterTrack} aria-hidden="true"><span className={styles.meterFill} style={{ width: `${bounded}%` }} /></div></div>;
}
