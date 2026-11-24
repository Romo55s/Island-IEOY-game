import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackButton, RetroButton } from "../../src/ui/atoms/RetroButton";

describe("standard retro controls", () => {
  it("provides a named navigation control without replacing a link with a generic button", () => {
    render(<BackButton href="/">Back to title</BackButton>);
    expect(screen.getByRole("link", { name: "Back to title" })).toHaveAttribute("href", "/");
  });

  it("keeps the shared primary button semantic and disabled state", () => {
    render(<RetroButton tone="primary" disabled>Start preview</RetroButton>);
    expect(screen.getByRole("button", { name: "Start preview" })).toBeDisabled();
  });
});
