import type {
  ComponentBoundaryCommand,
  ConfigCommand,
  ExtensionCommand,
  FlushCommand,
  GetCommand,
  ListenerCommand,
  RefreshCommand,
  SetCommand,
  TrackerEventCommand,
  TrackerLoadedCommand,
  ViewCommand,
} from "..";
import { ChangeUserCommand } from "./ChangeUserCommand";

export type TrackerCommand =
  | TrackerEventCommand
  | TrackerEventCommand[]
  | FlushCommand
  | GetCommand
  | SetCommand
  | ListenerCommand
  | ExtensionCommand
  | RefreshCommand
  | ConfigCommand
  | TrackerLoadedCommand
  | ViewCommand
  | ComponentBoundaryCommand
  | ChangeUserCommand
  | null
  | undefined;
