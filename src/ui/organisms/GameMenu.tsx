import { useRef, useState } from "react";
import styles from "./organisms.module.css";

export type GameMenuItem = { id: string; label: string; onSelect: () => void };

/** Native-button title-menu navigation with mouse, Tab, Enter/Space, and arrows. */
export function GameMenu({ items }: { items: GameMenuItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (next: number) => {
    const index = (next + items.length) % items.length;
    setActiveIndex(index);
    buttons.current[index]?.focus();
  };
  return <nav className={styles.gameMenu} aria-label="Main menu" onKeyDown={(event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); move(activeIndex + 1); }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); move(activeIndex - 1); }
  }}>
    {items.map((item, index) => <button key={item.id} type="button" ref={(element) => { buttons.current[index] = element; }} data-active={activeIndex === index} onFocus={() => setActiveIndex(index)} onClick={item.onSelect}>{item.label}</button>)}
  </nav>;
}
