import { Badge, type IconName, type Tono } from "@shared/ui";

/** `Badge` con tono dinámico: el kit exige ícono cuando el tono comunica un estado. */
export function BadgeEstado({
  label,
  tone,
  icon,
  testID,
}: {
  label: string;
  tone: Tono;
  icon: IconName;
  testID?: string;
}) {
  if (tone === "neutral" || tone === "accent") {
    return <Badge label={label} tone={tone} icon={icon} testID={testID} />;
  }
  return <Badge label={label} tone={tone} icon={icon} testID={testID} />;
}
