import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Leaf green — primary. Shade 8 (#3d6b3f) matches --color-primary in index.css.
const green: MantineColorsTuple = [
  "#e7f4d8",
  "#d4edba",
  "#c8dfa8",
  "#b8d090",
  "#a3c97a",
  "#8aad6a",
  "#6a9e40",
  "#5a8f3c",
  "#3d6b3f",
  "#2b4a2c",
];

// Cream / soil tan — secondary, for warm surfaces and highlights.
const earth: MantineColorsTuple = [
  "#fbf9f4",
  "#f7f5f0",
  "#f5ecd8",
  "#eee0c1",
  "#e8d5a8",
  "#dcbb84",
  "#d4a96a",
  "#b98a4e",
  "#9c6f3c",
  "#7c5730",
];

// Bark / dark soil — accent, for grounding contrast.
const brown: MantineColorsTuple = [
  "#f5ede9",
  "#e8d8d0",
  "#d9b8a0",
  "#c99b71",
  "#a86e4b",
  "#8a5a3d",
  "#6f4735",
  "#52392f",
  "#452e26",
  "#3d2921",
];

// Muted sage — neutral. Also used as the "gray" override so Mantine's
// default chrome (borders, dimmed text, disabled states) reads warm
// instead of the stock cool blue-gray.
const sage: MantineColorsTuple = [
  "#f6f8f3",
  "#e8f0e0",
  "#d7e2cb",
  "#c2d1b3",
  "#a9bd97",
  "#8fa87c",
  "#6b7a60",
  "#5a6e4e",
  "#495a3f",
  "#384630",
];

export const theme = createTheme({
  primaryColor: "green",
  primaryShade: 8,
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  defaultRadius: "md",
  radius: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  colors: {
    green,
    earth,
    brown,
    sage,
    gray: sage,
  },
});
