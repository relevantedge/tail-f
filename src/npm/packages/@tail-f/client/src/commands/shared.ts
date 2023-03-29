export const commandTest =
  <T = any>(name: string) =>
  (command: any): command is T =>
    command === name || command?.[name] !== undefined;
