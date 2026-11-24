import { useSyncExternalStore } from "react";
import { isAudioUnlocked, subscribeAudioUnlocked, unlockAudio } from "../../audio/audioSystem";
import { setAudioSetting, setMusicMuted, useAudioSettings } from "../../audio/audioSettings";
import styles from "./MusicMuteButton.module.css";

export function MusicMuteButton() {
  const settings = useAudioSettings();
  const unlocked = useSyncExternalStore(subscribeAudioUnlocked, isAudioUnlocked, () => false);
  const musicOff = settings.musicMuted || settings.music === 0;
  const label = musicOff ? "Music off" : unlocked ? "Mute music" : "Music on; click to start";

  const handleClick = () => {
    if (!unlocked) {
      if (musicOff) {
        if (settings.music === 0) setAudioSetting("music", 45);
        setMusicMuted(false);
      }
      unlockAudio();
      return;
    }
    if (musicOff) {
      if (settings.music === 0) setAudioSetting("music", 45);
      setMusicMuted(false);
    } else {
      setMusicMuted(true);
    }
  };

  return <button
    type="button"
    className={styles.control}
    onClick={handleClick}
    aria-label={label}
    aria-pressed={!musicOff}
    title={label}
  >
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 9v6h4l5 4V5L7 9H3Z" />
      {!musicOff && <><path d="M15 9a4 4 0 0 1 0 6" /><path d="M17.5 6.5a8 8 0 0 1 0 11" /></>}
      {musicOff && <path d="m15 9 6 6m0-6-6 6" />}
    </svg>
    <span>{musicOff ? "Music off" : "Music on"}</span>
  </button>;
}
