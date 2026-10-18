import { expect, test } from "bun:test";

function luminance(hex: string) {
  return [1, 3, 5].reduce((sum, start, index) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

test("positive text meets WCAG AA on the site's light and dark surfaces", async () => {
  const css = await Bun.file(new URL("../src/app/globals.css", import.meta.url)).text();
  for (const selector of [":root", ".dark"]) {
    const start = css.indexOf(`${selector} {`);
    const block = css.slice(start, css.indexOf("}", start));
    const color = (name: string) => {
      const value = block.match(new RegExp(`--${name}: (#[a-f0-9]{6});`))?.[1];
      if (!value) throw new Error(`Missing ${name} in ${selector}`);
      return luminance(value);
    };
    for (const surface of ["background", "card"]) {
      const text = color("positive");
      const background = color(surface);
      expect(
        (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});
