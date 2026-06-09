import type { CommandModule } from "./types";

const TRAIN = String.raw`      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/`;

export const sl: CommandModule = {
  meta: {
    name: "sl",
    aliases: [],
    description: "Steam locomotive — for when you meant ls.",
    usage: "sl",
    group: "System",
    hidden: true,
  },
  run: () => (
    <div className="space-y-1">
      <pre className="overflow-x-auto font-mono text-xs leading-tight text-warning">{TRAIN}</pre>
      <p className="text-sm text-muted">
        You typed <span className="font-mono text-fg">sl</span>. Did you mean{" "}
        <span className="font-mono text-fg">ls</span>?
      </p>
    </div>
  ),
};
