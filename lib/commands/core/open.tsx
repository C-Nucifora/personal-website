import type { CommandModule } from "../registry";
import { ErrorLine, Hint } from "@/components/content/messages";

export const open: CommandModule = {
  meta: {
    name: "open",
    aliases: [],
    description: "Open a link in a new tab (asks first).",
    usage: "open <url>",
  },
  run: (ctx) => {
    const url = ctx.args[0];
    if (!url || !/^https?:\/\//.test(url)) {
      return <ErrorLine>open: expected a full URL, e.g. open https://github.com</ErrorLine>;
    }
    ctx.confirmOpenUrl(url);
    return <Hint>confirm in the status bar: y to open, n to cancel</Hint>;
  },
};
