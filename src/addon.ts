import { config } from "../package.json";
import { createZToolkit } from "./utils/ztoolkit";
import hooks from "./hooks";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: any;
    locale?: {
      current: any;
    };
  };

  public hooks: typeof hooks;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
  }
}

export default Addon;
