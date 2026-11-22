import { he } from "./he";

export function getDictionary(locale: "he" = "he") {
  switch (locale) {
    case "he":
    default:
      return he;
  }
}

export { he };
