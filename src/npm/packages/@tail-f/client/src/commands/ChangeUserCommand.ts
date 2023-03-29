import { commandTest } from "./shared";

export interface ChangeUserCommand {
  user: string | null;
}

export const isChangeUserCommand = commandTest<ChangeUserCommand>("user");
