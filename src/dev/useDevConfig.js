import { useEffect, useState } from "react";
import { getDevConfig, subscribe } from "./devConfig.js";

export default function useDevConfig() {
  const [config, setConfig] = useState(() => getDevConfig());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setConfig(getDevConfig());
    });
    return unsubscribe;
  }, []);

  return config;
}

