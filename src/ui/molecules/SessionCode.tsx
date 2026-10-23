import { PixelLabel } from "../atoms/PixelLabel";
import styles from "./molecules.module.css";
export function SessionCode({ code, className = "" }: { code: string; className?: string }) { return <section className={`${styles.session} ${className}`} aria-label="Session code"><PixelLabel>Boarding code</PixelLabel><strong className={styles.code}>{code}</strong></section>; }
