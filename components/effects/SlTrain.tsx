"use client";

import { useEffect } from "react";
import { store } from "@/lib/terminal/store";

const TRAIN = String.raw`
      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/`;

/**
 * `sl` (EASTER_EGGS §1): the steam locomotive crosses the pane
 * right-to-left over ~3s. Any key skips (keyboard module); it also
 * dismisses itself at the end of the line.
 */
export function SlTrain() {
  useEffect(() => {
    const id = setTimeout(() => store.dispatch({ type: "set-overlay", overlay: null }), 3200);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="presentation"
      onClick={() => store.dispatch({ type: "set-overlay", overlay: null })}
      className="absolute inset-0 z-20 flex items-center overflow-hidden bg-window"
    >
      <pre className="sl-train whitespace-pre font-mono text-xs leading-tight text-accent sm:text-sm">
        {TRAIN}
      </pre>
    </div>
  );
}
