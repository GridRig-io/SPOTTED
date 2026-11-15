import * as WebBrowser from "expo-web-browser";
import { colors } from "@/theme";
import { API_URL } from "./env";

/** Host tools live on the website (built to work on phones). The app opens them in an in-app browser tab. */
export function openHostTools(path: "/host" | "/host/start" | "/host/dashboard" = "/host") {
  return WebBrowser.openBrowserAsync(`${API_URL}${path}`, { toolbarColor: colors.forest, controlsColor: colors.cream, presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
}
