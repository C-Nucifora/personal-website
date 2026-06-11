import type { CommandModule } from "../registry";
import { Hint } from "@/components/content/messages";
import { profile } from "@/data/profile";

export const mail: CommandModule = {
  meta: {
    name: "mail",
    aliases: ["message"],
    description: "Send me a message without leaving the site.",
    usage: "mail",
  },
  run: (ctx) => {
    if (!profile.formEndpoint) {
      return (
        <p className="text-fg">
          No form here yet — the fastest way is email:{" "}
          <a href={`mailto:${profile.email}`} className="text-accent">
            {profile.email}
          </a>
        </p>
      );
    }
    ctx.setCwd("~/contact");
    // Focus the terminal instance of the form once the window has rendered.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>('.interactive [data-contact-form] input[name="name"]')
          ?.focus(),
      ),
    );
    return <Hint>opening the contact form…</Hint>;
  },
};
