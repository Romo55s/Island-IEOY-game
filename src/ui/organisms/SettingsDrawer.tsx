import { setAudioSetting, useAudioSettings } from "../../audio/audioSettings";
import styles from "./organisms.module.css";
export function SettingsDrawer() {
  const settings = useAudioSettings();
  return <aside className={styles.drawer} aria-labelledby="settings-title">
    <h2 className={styles.heading} id="settings-title">Black-box settings</h2>
    {(["master", "music", "effects", "voices"] as const).map((channel) => {
      const label = `${channel[0]!.toUpperCase()}${channel.slice(1)} volume`;
      return <label className={styles.control} key={channel}>
        <span>{label} · {settings[channel]}%</span>
        <input type="range" min="0" max="100" step="1" value={settings[channel]} aria-label={label} onChange={(event) => setAudioSetting(channel, Number(event.target.value))} />
      </label>;
    })}
  </aside>;
}
