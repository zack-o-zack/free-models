// SVG geometry copied from lucide-react v1.37.0. See lucide-icons.LICENSE.
import { createElement } from "react";

const icons = {
  braces: [
    [
      "path",
      {
        d: "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1",
        key: "ezmyqa",
      },
    ],
    [
      "path",
      {
        d: "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1",
        key: "e1hn23",
      },
    ],
  ],
  image: [
    [
      "rect",
      {
        width: "18",
        height: "18",
        x: "3",
        y: "3",
        rx: "2",
        ry: "2",
        key: "1m3agn",
      },
    ],
    [
      "circle",
      {
        cx: "9",
        cy: "9",
        r: "2",
        key: "af1f0g",
      },
    ],
    [
      "path",
      {
        d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
        key: "1xmnt7",
      },
    ],
  ],
  "audio-lines": [
    [
      "path",
      {
        d: "M2 10v3",
        key: "1fnikh",
      },
    ],
    [
      "path",
      {
        d: "M6 6v11",
        key: "11sgs0",
      },
    ],
    [
      "path",
      {
        d: "M10 3v18",
        key: "yhl04a",
      },
    ],
    [
      "path",
      {
        d: "M14 8v7",
        key: "3a1oy3",
      },
    ],
    [
      "path",
      {
        d: "M18 5v13",
        key: "123xd1",
      },
    ],
    [
      "path",
      {
        d: "M22 10v3",
        key: "154ddg",
      },
    ],
  ],
  video: [
    [
      "path",
      {
        d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
        key: "ftymec",
      },
    ],
    [
      "rect",
      {
        x: "2",
        y: "6",
        width: "14",
        height: "12",
        rx: "2",
        key: "158x01",
      },
    ],
  ],
  mic: [
    [
      "path",
      {
        d: "M12 19v3",
        key: "npa21l",
      },
    ],
    [
      "path",
      {
        d: "M19 10v2a7 7 0 0 1-14 0v-2",
        key: "1vc78b",
      },
    ],
    [
      "rect",
      {
        x: "9",
        y: "2",
        width: "6",
        height: "13",
        rx: "3",
        key: "s6n7sd",
      },
    ],
  ],
  database: [
    [
      "ellipse",
      {
        cx: "12",
        cy: "5",
        rx: "9",
        ry: "3",
        key: "msslwz",
      },
    ],
    [
      "path",
      {
        d: "M3 5V19A9 3 0 0 0 21 19V5",
        key: "1wlel7",
      },
    ],
    [
      "path",
      {
        d: "M3 12A9 3 0 0 0 21 12",
        key: "mv7ke4",
      },
    ],
  ],
} as const;

export type OrbitIconName = keyof typeof icons;

export function OrbitIcon({ name }: { name: OrbitIconName }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-orbit-icon={name}
      className="size-5 overflow-visible sm:size-6"
    >
      {icons[name].map(([tag, attributes]) => createElement(tag, attributes))}
    </svg>
  );
}
