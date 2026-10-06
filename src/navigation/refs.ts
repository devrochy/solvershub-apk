import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/** Ref global al stack de campo: lo usan los deep links de push (HU-APP-05). */
export const campoNavRef = createNavigationContainerRef<RootStackParamList>();
