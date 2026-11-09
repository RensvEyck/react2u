import "react";

/**
 * Declaratieve WebMCP-kenmerken (https://webmachinelearning.github.io/webmcp/):
 * een formulier met `toolname` en `tooldescription` wordt in een browser met
 * WebMCP een tool die een AI-agent kan invullen. Zie lib/webmcp.ts.
 */
// De typeparameter T moet gelijk zijn aan die van React, anders voegt TypeScript de interfaces niet samen.
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "react" {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
