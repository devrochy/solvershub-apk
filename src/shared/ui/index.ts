/**
 * Kit de componentes de la app (SPEC-29, HU-DS-09, ADR-APP-07). Mismos nombres,
 * variantes y estados que `components/ui` del panel, sobre los tokens v1.4.
 */
export { Avatar, iniciales, type AvatarProps, type AvatarSize, type AvatarStatus } from "./Avatar";
export { Badge, type BadgeProps, type BadgeSize } from "./Badge";
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from "./Button";
export { Drawer, type DrawerProps } from "./Drawer";
export { EmptyState, type EmptyStateAction, type EmptyStateProps } from "./EmptyState";
export { Field, nombreDeCampo, useField, type FieldContexto, type FieldProps } from "./Field";
export { IconButton, type IconButtonProps, type IconButtonSize, type IconButtonTone } from "./IconButton";
export { Icono, type IconName } from "./icono";
export { formatearDelta, KpiTile, type KpiPolarity, type KpiTileProps } from "./KpiTile";
export { ListItem, RecordRow, type ListItemProps, type RecordRowProps } from "./ListItem";
export { curva, duracion, useReduceMotion, type CurvaMotion, type DuracionMotion } from "./motion";
export { PageHeader, type PageHeaderProps } from "./PageHeader";
export { Sheet, type SheetProps } from "./Sheet";
export { Skeleton, type SkeletonProps, type SkeletonShape } from "./Skeleton";
export { SyncStatus, textoSyncStatus, type SyncState, type SyncStatusProps } from "./SyncStatus";
export { kitDeTema, useKit, type ColoresKit, type ColoresTono, type KitTema, type Tono, type TonoEstado } from "./tema";
export { TextField, type TextFieldProps } from "./TextField";
export {
  Toast,
  TOAST_DURACION_EXITO,
  ToastProvider,
  useToast,
  type ToastApi,
  type ToastProps,
  type ToastTone,
} from "./Toast";
