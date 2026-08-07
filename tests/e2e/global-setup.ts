import { assertE2eEnvironment } from "./environment";

export default function globalSetup() {
  assertE2eEnvironment(process.env);
}
